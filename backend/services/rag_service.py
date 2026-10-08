"""
services/rag_service.py

Retrieval-Augmented Generation (RAG) pipeline.

Flow:
    1. Receive user query + mode (global | project)
    2. [NEW] Check Redis cache for a previously computed answer
    3. Embed the query using the configured embedding model
    4. Retrieve top-k relevant documents from ChromaDB
    5. Build a prompt with retrieved context
    6. Pass prompt to the LLM
    7. [NEW] Store response in Redis cache
    8. Return AI response + source metadata (including image URLs)

Modes:
    - "ai"  → global search across all projects
    - "web" → project-specific search filtered by project_id
"""

import logging
import time
from typing import Optional, Dict, Any, List

from langchain.schema import Document
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
import json
import re

# Redis cache service — imported here; will degrade gracefully if Redis is down
from services.cache_service import CacheService

logger = logging.getLogger("services")

# ------------------------------------------------------------------
# Intent Classification Prompts
# ------------------------------------------------------------------
INTENT_SYSTEM_PROMPT = """You are an AI intent classifier for a portfolio chatbot system.

Your job is to classify a user's query based on intent and context.

## 🎯 Context
* The user may currently be viewing a specific project page.
* The system supports both:
  1. Project-specific queries
  2. Global portfolio queries
  3. General/off-topic conversation

You are given:
* `user_query`: the user's message
* `current_project`: the project the user is currently viewing (can be null)

## 🧠 Task
Classify the query into ONE of the following categories:
1. "project"
   → The query is specifically about the current project
2. "global"
   → The query is about other projects or the entire portfolio
3. "cross_project"
   → The query compares or refers to multiple projects
4. "other"
   → Irrelevant, general, or chitchat

## ⚠️ Rules
* If the query mentions something not related to the current project → do NOT classify as "project"
* If the query is ambiguous → prefer "global"
* Do NOT explain your answer
* Return ONLY a valid JSON

## 📦 Output Format
{{
"intent": "project | global | cross_project | other"
}}
"""

INTENT_HUMAN_PROMPT = "user_query: \"{user_query}\"\ncurrent_project: \"{current_project}\""

# ------------------------------------------------------------------
# System prompt template
# Instructs the LLM how to answer using provided context
# ------------------------------------------------------------------
RAG_SYSTEM_PROMPT = """You are Nova, Akash's AI Assistant. Your sole purpose is to answer questions strictly about the projects, skills, and work documented in the portfolio knowledge base provided to you.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 HARD RULES — MUST BE FOLLOWED WITHOUT EXCEPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RULE 0 — IDENTITY
  • Your name is Nova. You are Akash's AI Assistant.
  • If anyone asks who you are, what your name is, or who built you, ALWAYS answer:
      "I am Nova, Akash's AI Assistant. I can help you explore his portfolio and projects."
  • Never claim to be any other AI model (ChatGPT, Gemini, etc.).

RULE 1 — CONTEXT IS YOUR ONLY SOURCE OF TRUTH
  • You MAY ONLY use facts explicitly present in the [Context] block below.
  • You MUST NOT use any knowledge from your training data, memory, or assumptions.
  • If a fact is not in the [Context], treat it as unknown — regardless of how confident you feel.

RULE 2 — DO NOT GUESS OR INFER
  • Never extrapolate, estimate, or make up details not directly stated in the [Context].
  • Do NOT say things like "likely", "probably", "I assume", or "it could be".
  • If you are unsure, use the exact fallback phrase from Rule 3.

RULE 3 — MANDATORY FALLBACK PHRASE
  • If the answer is not found in the [Context], you MUST respond with EXACTLY this phrase:
      "I don't have that information in this portfolio's knowledge base."
  • Do NOT apologize, elaborate, or guess after saying this phrase.

RULE 4 — SCOPE RESTRICTION
  • If the user asks about general topics (news, sports, weather, science, coding theory, etc.)
    that are NOT about THIS portfolio's projects or skills, respond with EXACTLY:
      "I can only answer questions about this portfolio and its projects."
  • Do NOT answer general-knowledge questions, even if you know the answer.

RULE 5 — NO HALLUCINATION UNDER ANY CIRCUMSTANCES
  • Never invent project names, statistics, technologies, dates, metrics, or names.
  • If the user asks for something specific (e.g., "What was the conversion rate?") and the
    [Context] doesn't state it, say the Rule 3 fallback — period.

RULE 6 — NEVER OUTPUT IMAGE URLS IN YOUR TEXT
  • The [Context] may contain lines like "Image URL: https://..."
  • You MUST use image information to confirm a project has an image, but NEVER paste or print the URL in your response.
  • The user interface automatically displays project images — you do NOT need to mention the URL.
  • Instead, you may say something like: "Here is the project image for [Title] 👇" or "The image for [Title] is shown below."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Context] — THIS IS YOUR ONLY ALLOWED SOURCE:
{context}

[Chat History] — Use ONLY to resolve follow-up references (e.g., "the first one", "that project").
DO NOT use history to invent new facts:
{chat_history}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""

RAG_HUMAN_PROMPT = "{question}"


class RAGService:
    """
    Orchestrates the full RAG pipeline:
      - [NEW] Checks Redis cache before running retrieval
      - Retrieves documents from VectorStoreService
      - Constructs a prompt with context
      - Queries the LLM
      - [NEW] Stores result in Redis cache
      - Returns response + metadata
    """

    def __init__(self, llm, vector_store_service, cache_service: Optional[CacheService] = None):
        """
        Args:
            llm: A LangChain-compatible LLM (ChatOpenAI, ChatGoogleGenerativeAI, Ollama)
            vector_store_service: An instance of VectorStoreService
            cache_service: Optional CacheService instance. If None, a new one is
                           created automatically. Pass a mock for testing.
        """
        self.llm = llm
        self.vector_store = vector_store_service

        # Redis cache layer — degrades gracefully if Redis is unavailable
        self.cache = cache_service if cache_service is not None else CacheService()

        # Build a reusable prompt template
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", RAG_SYSTEM_PROMPT),
            ("human", RAG_HUMAN_PROMPT),
        ])
        
        self.intent_template = ChatPromptTemplate.from_messages([
            ("system", INTENT_SYSTEM_PROMPT),
            ("human", INTENT_HUMAN_PROMPT),
        ])

        logger.info("RAGService initialized.")

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def chat(
        self,
        query: str,
        mode: str = "ai",
        project_id: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        k: int = 5,  # Optimized: retrieve top-5 to allow showing more projects
    ) -> Dict[str, Any]:
        """
        Full RAG pipeline for a user query, with Redis caching.

        Cache flow:
            1. Normalize the query and build a cache key.
            2. Check Redis for a prior response → return immediately on HIT.
            3. On MISS, run the full RAG pipeline.
            4. Store the new response in Redis (if cacheable).

        Note: Chat history is intentionally excluded from the cache key.
        The cache targets stateless factual lookups ("what tech stack is used").
        Follow-up conversational turns are NOT cached.

        Args:
            query: The user's question
            mode: "ai" (global) or "web" (project-specific)
            project_id: Required when mode="web"
            k: Number of documents to retrieve

        Returns:
            dict with keys:
                - answer      (str): LLM-generated response
                - sources     (list): Retrieved document metadata
                - mode        (str): The mode used
                - project_id  (str|None): Project used (if any)
                - from_cache  (bool): True if the response came from Redis
        """
        logger.info(f"RAG chat | mode='{mode}' | project_id='{project_id}' | query='{query[:60]}'")
        
        chat_history = chat_history or []

        # ------------------------------------------------------------------
        # Short-circuits (identity + chitchat) — these are NOT cached because
        # they are deterministic hardcoded strings that cost nothing to compute.
        # ------------------------------------------------------------------

        # Short-circuit for identity questions — always answer as Nova
        identity_keywords = ["who are you", "what is your name", "your name", "who built you", "are you an ai", "what are you", "introduce yourself"]
        if any(kw in query.lower() for kw in identity_keywords):
            return {
                "answer": "I am **Nova**, Akash's AI Assistant. I can walk you through his projects, tech stack, architecture decisions, and more. Where should we start? 🚀",
                "sources": [],
                "mode": mode,
                "project_id": project_id,
                "from_cache": False,
            }

        # ------------------------------------------------------------------
        # CACHE CHECK — before any LLM/embedding work
        # We only cache non-conversational queries (no active chat history)
        # because cached responses don't have follow-up context.
        #
        # IMPORTANT: capture the cache key mode NOW (before any web→ai switch)
        # so that GET and SET always use the same key. If we used the switched
        # mode in SET, a future identical request would MISS even though the
        # answer is already stored.
        # ------------------------------------------------------------------
        use_cache = not chat_history  # Skip cache for conversational follow-ups
        cache_mode = mode             # Freeze mode for cache key — never changes
        if use_cache:
            cached = self.cache.get_cached_response(project_id, cache_mode, query)
            if cached is not None:
                # Inject cache flag so frontend/logs can identify cache hits
                cached["from_cache"] = True
                return cached

        # ------------------------------------------------------------------
        # Step 0: Classify intent to auto-adjust routing and handle chitchat
        # ------------------------------------------------------------------
        intent = self._classify_intent(query, project_id or "global portfolio")
        logger.info(f"Intent classified as: {intent}")
        
        # Short-circuit for general/chitchat questions ("hey how are you")
        if intent == "other":
            return {
                "answer": "Hello! I am an AI assistant here to help you explore this portfolio. Feel free to ask me questions about the projects, skills, or experience shown here.",
                "sources": [],
                "mode": mode,
                "project_id": project_id,
                "from_cache": False,
            }

        # NOTE: We intentionally do NOT switch mode from "web" to "ai" based on intent.
        # The _retrieve_documents method already falls back to global search if no
        # project-specific docs are found. Switching mode here was causing valid
        # project queries (e.g. "Tell me about the Project Scope for this project")
        # to lose project context when the intent classifier returned "global".
        original_mode = mode

        # ------------------------------------------------------------------
        # Step 1: Retrieve relevant documents
        # Expand query with recent history to ensure follow-up questions retrieve relevant docs
        # ------------------------------------------------------------------
        search_query = query
        if chat_history:
            recent_msgs = []
            for i in range(max(0, len(chat_history) - 2), len(chat_history)):
                recent_msgs.append(chat_history[i].get("content", ""))
            recent_context = " ".join(recent_msgs)
            search_query = f"{recent_context} {query}"

        documents = self._retrieve_documents(search_query, mode, project_id, k)

        # Short-circuit: if no relevant documents found, refuse immediately
        # (don't waste an LLM call on an out-of-scope query)
        if not documents:
            return {
                "answer": "I can only answer questions about this portfolio and its projects. I don't have information about that topic.",
                "sources": [],
                "mode": mode,
                "project_id": project_id,
                "from_cache": False,
            }

        # Step 2: Build context string from retrieved docs
        context = self._build_context(documents)

        # Step 3: Generate response from LLM
        answer = self._generate_answer(query, context, chat_history)

        # Step 4: Extract metadata from sources (for frontend)
        # We also want to remove duplicate sources if they exist
        sources = self._extract_sources(documents)

        logger.info(f"RAG response generated. Sources: {len(sources)}")

        result = {
            "answer": answer,
            "sources": sources,
            "mode": mode,
            "project_id": project_id,
            "from_cache": False,
        }

        # ------------------------------------------------------------------
        # CACHE STORE — persist the result for future identical queries.
        # Use cache_mode (the original mode before any web→ai switch) to
        # ensure the stored key matches what future GET calls will look up.
        # ------------------------------------------------------------------
        if use_cache:
            self.cache.set_cached_response(project_id, cache_mode, query, result)

        return result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    # ------------------------------------------------------------------
    # Retry helper
    # ------------------------------------------------------------------

    def _invoke_with_retry(self, chain, inputs: dict, max_retries: int = 3) -> str:
        """
        Invoke a LangChain chain with automatic retry on 429 rate-limit errors.
        Uses exponential backoff: waits 10s, 20s, 30s between attempts.
        """
        last_exc: Exception = RuntimeError("Unknown error in _invoke_with_retry")
        for attempt in range(1, max_retries + 1):
            try:
                return chain.invoke(inputs)
            except Exception as e:
                last_exc = e
                err_str = str(e)
                if "429" in err_str and attempt < max_retries:
                    wait = attempt * 10  # 10s, 20s, 30s
                    logger.warning(
                        f"Rate limit hit (attempt {attempt}/{max_retries}). "
                        f"Retrying in {wait}s..."
                    )
                    time.sleep(wait)
                else:
                    raise  # re-raise on non-429 or final attempt
        raise last_exc  # should never reach here, but satisfies type checker

    def _classify_intent(self, query: str, project_id: str) -> str:
        """
        Uses the LLM to classify the query intent.
        Returns one of: 'project', 'global', 'cross_project', 'other'.
        """
        try:
            chain = self.intent_template | self.llm | StrOutputParser()
            response = self._invoke_with_retry(chain, {
                "user_query": query,
                "current_project": project_id
            })
            
            # Remove DeepSeek <think>...</think> blocks if present
            response = re.sub(r"<think>.*?</think>\n*", "", response, flags=re.DOTALL).strip()
            
            # Extremely basic JSON extraction in case there's markdown wrapper
            if "```json" in response:
                response = response.split("```json")[-1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[-1].split("```")[0].strip()
                
            data = json.loads(response)
            return data.get("intent", "global")
        except Exception as e:
            logger.error(f"Intent classification failed: {e}")
            return "global"  # safe fallback

    def _retrieve_documents(
        self,
        query: str,
        mode: str,
        project_id: Optional[str],
        k: int,
    ) -> List[Document]:
        """
        Dispatch to the correct search method based on mode.
        Falls back to global search if project_id is missing in web mode.
        """
        if mode == "web" and project_id:
            docs = self.vector_store.search_by_project(query, project_id, k=k)
            # Fallback: if no project docs found, do global search
            if not docs:
                logger.warning(
                    f"No docs found for project '{project_id}'. Falling back to global search."
                )
                docs = self.vector_store.search_global(query, k=k)
        else:
            # Default: global AI mode
            docs = self.vector_store.search_global(query, k=k)

        return docs

    # Maximum characters to include per document — prevents bloating the LLM context window
    MAX_CHARS_PER_DOC = 4000

    def _build_context(self, documents: List[Document]) -> str:
        """
        Concatenate retrieved document contents into a single context string.
        Each document is prefixed with its project and title metadata.
        Content is capped at MAX_CHARS_PER_DOC characters to minimize token usage.
        """
        if not documents:
            return "No relevant documents found in the knowledge base."

        context_parts = []
        for i, doc in enumerate(documents, start=1):
            meta = doc.metadata
            project = meta.get("project_id", "Unknown")
            title = meta.get("title", "Untitled")
            image_url = meta.get("image_url", "")
            # Trim content to cap token usage per document
            content = doc.page_content
            if len(content) > self.MAX_CHARS_PER_DOC:
                content = content[:self.MAX_CHARS_PER_DOC] + "... [truncated]"
            image_line = f"Image URL: {image_url}" if image_url else "Image URL: (not available)"
            context_parts.append(
                f"[Document {i}] Project: {project} | Title: {title}\n{image_line}\n{content}"
            )

        return "\n\n---\n\n".join(context_parts)

    # Maximum number of recent chat messages to include in the prompt
    MAX_HISTORY_MESSAGES = 4

    def _generate_answer(self, question: str, context: str, chat_history: List[Dict[str, str]]) -> str:
        """
        Build the final prompt and call the LLM.
        Uses LangChain's LCEL (LangChain Expression Language) chain.
        Chat history is capped at the last MAX_HISTORY_MESSAGES entries to limit token usage.
        """
        # Keep only the most recent messages to avoid bloating the prompt
        recent_history = chat_history[-self.MAX_HISTORY_MESSAGES:] if chat_history else []
        history_str = ""
        for msg in recent_history:
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_str += f"{role}: {msg.get('content')}\n"

        try:
            # Build LCEL chain: prompt → LLM → parse string output
            chain = self.prompt_template | self.llm | StrOutputParser()
            answer = self._invoke_with_retry(chain, {
                "context": context, 
                "question": question,
                "chat_history": history_str
            })
            
            # Remove DeepSeek <think>...</think> blocks if present
            answer = re.sub(r"<think>.*?</think>\n*", "", answer, flags=re.DOTALL).strip()
            
            return answer
        except Exception as e:
            err_str = str(e)
            logger.error(f"LLM generation failed: {e}")
            # User-friendly message for rate limit errors
            if "429" in err_str:
                return (
                    "I'm currently experiencing high demand. "
                    "Please wait a moment and try again."
                )
            return (
                "I'm sorry, I encountered an error generating a response. "
                f"Please check the server logs. Error: {err_str}"
            )

    def _extract_sources(self, documents: List[Document]) -> List[Dict[str, Any]]:
        """
        Extract metadata from retrieved documents to send back to the frontend.
        Frontend can use 'image_url' to display related project images.
        """
        sources = []
        seen_titles = set()
        
        for doc in documents:
            meta = doc.metadata
            title = meta.get("title", "")
            
            # Deduplicate by title to avoid redundant sources
            if title in seen_titles:
                continue
            seen_titles.add(title)
            
            sources.append({
                "project_id": meta.get("project_id", ""),
                "title": title,
                "image_url": meta.get("image_url", ""),
                "snippet": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
            })
        return sources
