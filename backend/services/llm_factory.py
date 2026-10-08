"""
services/llm_factory.py

Factory class that dynamically loads the correct LLM and Embedding model
based on the LLM_PROVIDER environment variable.

Supported providers:
  - openai      → Uses OpenAI GPT + text-embedding models
  - openrouter  → Uses OpenRouter (any model) via OpenAI-compatible API
  - gemini      → Uses Google Gemini LLM + embedding models
  - ollama      → Uses a local Ollama server (e.g., llama3.2)

Usage:
    factory = LLMFactory()
    llm = factory.get_llm()
    embeddings = factory.get_embeddings()
"""

import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("services")


class LLMFactory:
    """
    Central factory for creating LLM and Embedding instances.
    The provider is controlled by the LLM_PROVIDER env variable.
    """

    SUPPORTED_PROVIDERS = {"openai", "openrouter", "gemini", "ollama"}

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai").lower().strip()
        if self.provider not in self.SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Unsupported LLM_PROVIDER: '{self.provider}'. "
                f"Choose from: {self.SUPPORTED_PROVIDERS}"
            )
        logger.info(f"LLMFactory initialized with provider: {self.provider}")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_llm(self):
        """Return the configured LLM instance."""
        if self.provider == "openai":
            return self._get_openai_llm()
        elif self.provider == "openrouter":
            return self._get_openrouter_llm()
        elif self.provider == "gemini":
            return self._get_gemini_llm()
        elif self.provider == "ollama":
            return self._get_ollama_llm()

    def get_embeddings(self):
        """Return the configured Embeddings instance."""
        if self.provider == "openai":
            return self._get_openai_embeddings()
        elif self.provider == "openrouter":
            # OpenRouter does not support embeddings.
            # Use Ollama embeddings locally (zero extra API key needed).
            # To switch to OpenAI embeddings, set OPENAI_API_KEY and change this.
            return self._get_ollama_embeddings()
        elif self.provider == "gemini":
            return self._get_gemini_embeddings()
        elif self.provider == "ollama":
            return self._get_ollama_embeddings()

    def get_provider(self) -> str:
        """Return the active provider name."""
        return self.provider

    # ------------------------------------------------------------------
    # OpenAI
    # ------------------------------------------------------------------

    def _get_openai_llm(self):
        """Load OpenAI ChatGPT model via langchain-openai."""
        try:
            from langchain_openai import ChatOpenAI

            api_key = os.getenv("OPENAI_API_KEY")
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

            if not api_key:
                raise ValueError("OPENAI_API_KEY is not set in environment variables.")

            logger.debug(f"Loading OpenAI LLM: {model}")
            return ChatOpenAI(
                openai_api_key=api_key,
                model_name=model,
                temperature=0.1,  # Low temp = factual, no hallucination
            )
        except ImportError:
            raise ImportError("langchain-openai is not installed. Run: pip install langchain-openai")

    def _get_openai_embeddings(self):
        """Load OpenAI embedding model."""
        try:
            from langchain_openai import OpenAIEmbeddings

            api_key = os.getenv("OPENAI_API_KEY")
            model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

            if not api_key:
                raise ValueError("OPENAI_API_KEY is not set in environment variables.")

            logger.debug(f"Loading OpenAI Embeddings: {model}")
            return OpenAIEmbeddings(
                openai_api_key=api_key,
                model=model,
            )
        except ImportError:
            raise ImportError("langchain-openai is not installed. Run: pip install langchain-openai")

    # ------------------------------------------------------------------
    # OpenRouter  (OpenAI-compatible — no extra library needed)
    # https://openrouter.ai/docs#quick-start
    # ------------------------------------------------------------------

    def _get_openrouter_llm(self):
        """
        Load any OpenRouter model using ChatOpenAI pointed at the
        OpenRouter base URL.  Set OPENROUTER_MODEL to any slug from
        https://openrouter.ai/models
        Free model options:
          - meta-llama/llama-3.3-70b-instruct:free  (recommended)
          - deepseek/deepseek-v4-flash:free
        Paid model options:
          - google/gemini-2.5-flash
          - openai/gpt-4o-mini
        """
        try:
            from langchain_openai import ChatOpenAI

            api_key = os.getenv("OPENROUTER_API_KEY")
            model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")

            if not api_key:
                raise ValueError("OPENROUTER_API_KEY is not set in environment variables.")

            logger.debug(f"Loading OpenRouter LLM: {model}")
            return ChatOpenAI(
                openai_api_key=api_key,
                model_name=model,
                temperature=0.1,  # Low temp = factual, no hallucination
                openai_api_base="https://openrouter.ai/api/v1",
                default_headers={
                    "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost"),
                    "X-Title": os.getenv("OPENROUTER_SITE_NAME", "Portfolio Chatbot"),
                },
            )
        except ImportError:
            raise ImportError("langchain-openai is not installed. Run: pip install langchain-openai")

    # ------------------------------------------------------------------
    # Google Gemini
    # NOTE: Requires Python 3.9+. Install with:
    #   pip install langchain-google-genai google-generativeai
    # ------------------------------------------------------------------

    def _get_gemini_llm(self):
        """Load Google Gemini LLM via langchain-google-genai (Python 3.9+ only)."""
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
        except ImportError:
            raise ImportError(
                "langchain-google-genai is not installed or requires Python 3.9+.\n"
                "Install with: pip install langchain-google-genai google-generativeai\n"
                "Or switch to: LLM_PROVIDER=openai or LLM_PROVIDER=ollama"
            )

        api_key = os.getenv("GOOGLE_API_KEY")
        model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set in environment variables.")

        logger.debug(f"Loading Gemini LLM: {model}")
        return ChatGoogleGenerativeAI(
            model=model,
            temperature=0.1,  # Low temp = factual, no hallucination
        )

    def _get_gemini_embeddings(self):
        """Load Google Gemini embedding model (Python 3.9+ only)."""
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
        except ImportError:
            raise ImportError(
                "langchain-google-genai is not installed or requires Python 3.9+.\n"
                "Install with: pip install langchain-google-genai google-generativeai\n"
                "Or switch to: LLM_PROVIDER=openai or LLM_PROVIDER=ollama"
            )

        api_key = os.getenv("GOOGLE_API_KEY")
        model = os.getenv("GEMINI_EMBEDDING_MODEL", "models/text-embedding-004")

        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set in environment variables.")

        logger.debug(f"Loading Gemini Embeddings: {model}")
        return GoogleGenerativeAIEmbeddings(
            model=model,
        )

    # ------------------------------------------------------------------
    # Ollama (local)
    # ------------------------------------------------------------------

    def _get_ollama_llm(self):
        """Load Ollama LLM (runs locally via Ollama server)."""
        try:
            from langchain_community.llms import Ollama

            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            model = os.getenv("OLLAMA_MODEL", "llama3.2")

            logger.debug(f"Loading Ollama LLM: {model} at {base_url}")
            return Ollama(base_url=base_url, model=model)
        except ImportError:
            raise ImportError(
                "langchain-community is not installed. Run: pip install langchain-community"
            )

    def _get_ollama_embeddings(self):
        """Load Ollama embedding model (runs locally)."""
        try:
            from langchain_community.embeddings import OllamaEmbeddings

            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            model = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")

            logger.debug(f"Loading Ollama Embeddings: {model} at {base_url}")
            return OllamaEmbeddings(base_url=base_url, model=model)
        except ImportError:
            raise ImportError(
                "langchain-community is not installed. Run: pip install langchain-community"
            )
