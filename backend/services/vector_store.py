"""
services/vector_store.py

Manages ChromaDB vector store operations:
  - Initializing the Chroma collection
  - Adding documents with metadata (project_id, content, image_url)
  - Searching documents (global or project-specific)

ChromaDB stores data locally in CHROMA_PERSIST_DIR (defaults to ./chroma_db).
"""

import os
import logging
from typing import List, Optional, Dict, Any, Tuple

from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain.schema import Document

load_dotenv()

logger = logging.getLogger("services")


def _get_provider_aware_chroma_settings() -> Tuple[str, str]:
    """
    Returns (persist_dir, collection_name) scoped to the current LLM provider.

    Each provider stores vectors with different embedding dimensions:
      - OpenAI: 1536 dimensions
      - Gemini: 3072 dimensions

    Using separate dirs/collections prevents dimension-mismatch errors when
    switching providers. Seeds created for one provider are automatically
    kept separate from another.
    """
    provider = os.getenv("LLM_PROVIDER", "openai").lower().strip()
    base_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    base_collection = os.getenv("CHROMA_COLLECTION_NAME", "project_documents")

    persist_dir = os.path.join(base_dir, provider)
    collection_name = f"{base_collection}_{provider}"
    return persist_dir, collection_name


class VectorStoreService:
    """
    Wraps ChromaDB operations with a clean interface.
    Supports both global search (all documents) and
    project-specific search (filtered by project_id).
    """

    def __init__(self, embeddings):
        """
        Args:
            embeddings: A LangChain-compatible embeddings object
                        (e.g., OpenAIEmbeddings, GoogleGenerativeAIEmbeddings)
        """
        self.embeddings = embeddings
        self.persist_dir, self.collection_name = _get_provider_aware_chroma_settings()
        logger.info(
            f"VectorStoreService | provider='{os.getenv('LLM_PROVIDER', 'openai')}' | "
            f"collection='{self.collection_name}' | persist_dir='{self.persist_dir}'"
        )

        # Initialize and persist the Chroma vector store
        self.vector_store = self._init_vector_store()
        logger.info(
            f"VectorStoreService initialized | "
            f"collection='{self.collection_name}' | "
            f"persist_dir='{self.persist_dir}'"
        )
        self._warn_if_empty()

    # ------------------------------------------------------------------
    # Initialization
    # ------------------------------------------------------------------

    def _warn_if_empty(self) -> None:
        """Log a helpful warning if the collection has no documents yet."""
        try:
            count = self.vector_store._collection.count()
            if count == 0:
                provider = os.getenv("LLM_PROVIDER", "openai")
                logger.warning(
                    f"ChromaDB collection '{self.collection_name}' is EMPTY for provider '{provider}'. "
                    f"Run: ./venv/bin/python3 scripts/seed_data.py  to populate it."
                )
        except Exception:
            pass

    def _init_vector_store(self) -> Chroma:
        """
        Create or load an existing ChromaDB collection.
        If the persist directory exists, existing data is loaded automatically.
        """
        logger.debug(f"Initializing ChromaDB at: {self.persist_dir}")
        return Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_dir,
        )

    # ------------------------------------------------------------------
    # Document Ingestion
    # ------------------------------------------------------------------

    def add_documents(
        self,
        documents: List[Dict[str, Any]],
    ) -> int:
        """
        Add a list of documents to ChromaDB.

        Each document dict should have:
            - content  (str): The text content to embed
            - project_id (str): Identifier for the project
            - image_url  (str, optional): Associated image URL
            - title      (str, optional): Document title

        Returns:
            Number of documents added.
        """
        if not documents:
            logger.warning("add_documents called with empty list.")
            return 0

        langchain_docs = []
        for doc in documents:
            # Build metadata dict — ChromaDB only stores scalar values
            metadata = {
                "project_id": str(doc.get("project_id", "")),
                "image_url": str(doc.get("image_url", "")),
                "title": str(doc.get("title", "")),
            }
            langchain_docs.append(
                Document(
                    page_content=doc["content"],
                    metadata=metadata,
                )
            )

        self.vector_store.add_documents(langchain_docs)
        logger.info(f"Added {len(langchain_docs)} documents to ChromaDB.")
        return len(langchain_docs)

    # ------------------------------------------------------------------
    # Search / Retrieval
    # ------------------------------------------------------------------

    def search_global(
        self,
        query: str,
        k: int = 5,
    ) -> List[Document]:
        """
        Search across ALL documents in the collection (no project filter).
        Used in 'AI mode' (global chat).

        Args:
            query: User's natural language query
            k: Number of top results to return

        Returns:
            List of LangChain Document objects
        """
        logger.debug(f"Global search | query='{query[:60]}...' | k={k}")
        results = self.vector_store.similarity_search(query, k=k)
        logger.info(f"Global search returned {len(results)} documents.")
        return results

    def search_by_project(
        self,
        query: str,
        project_id: str,
        k: int = 5,
    ) -> List[Document]:
        """
        Search documents filtered by project_id.
        Used in 'web mode' (project-specific chat).

        Args:
            query: User's natural language query
            project_id: The project to restrict results to
            k: Number of top results to return

        Returns:
            List of LangChain Document objects
        """
        logger.debug(
            f"Project search | project_id='{project_id}' | query='{query[:60]}...' | k={k}"
        )
        # ChromaDB supports metadata filtering via the `filter` param
        results = self.vector_store.similarity_search(
            query,
            k=k,
            filter={"project_id": str(project_id)},
        )
        logger.info(
            f"Project search returned {len(results)} documents for project_id='{project_id}'."
        )
        return results

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def get_collection_count(self) -> int:
        """Return the total number of documents in the collection."""
        try:
            return self.vector_store._collection.count()
        except Exception as e:
            logger.error(f"Failed to get collection count: {e}")
            return -1

    def delete_by_project(self, project_id: str) -> None:
        """
        Delete all documents belonging to a specific project.
        Useful for re-indexing or cleaning up.
        """
        try:
            self.vector_store._collection.delete(
                where={"project_id": str(project_id)}
            )
            logger.info(f"Deleted all documents for project_id='{project_id}'.")
        except Exception as e:
            logger.error(f"Failed to delete documents for project '{project_id}': {e}")
            raise
