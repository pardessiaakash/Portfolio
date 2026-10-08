"""
utils/service_registry.py

Singleton registry for expensive service objects (LLM, Vector Store, RAG, Speech).

Why singletons?
  - LangChain LLM and Embedding objects are expensive to initialize.
  - ChromaDB connections should be reused across requests.
  - Services are initialized lazily (on first request) to avoid
    blocking Django startup.

Thread safety: Django's development server is single-threaded. For
production (Gunicorn with multiple workers), each worker process will
have its own registry — this is acceptable behavior.
"""

import logging
from typing import Optional

logger = logging.getLogger("services")

# ------------------------------------------------------------------
# Module-level singleton containers
# ------------------------------------------------------------------
_llm_factory: Optional[object] = None
_rag_service: Optional[object] = None
_speech_service: Optional[object] = None
_cache_service: Optional[object] = None  # Redis cache singleton


def get_cache_service():
    """
    Lazily initialize and return the CacheService singleton.
    Safe to call even when Redis is not running — returns a CacheService
    instance whose methods will all be no-ops (cache misses).
    """
    global _cache_service

    if _cache_service is None:
        logger.info("Initializing Cache service (first request)...")
        try:
            from services.cache_service import CacheService
            _cache_service = CacheService()
            logger.info("Cache service initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize Cache service: {e}")
            raise

    return _cache_service


def get_rag_service():
    """
    Lazily initialize and return the RAG service singleton.
    On first call: creates LLMFactory → LLM + Embeddings → VectorStore → CacheService → RAGService
    On subsequent calls: returns the cached instance.
    """
    global _rag_service

    if _rag_service is None:
        logger.info("Initializing RAG service (first request)...")
        try:
            from services.llm_factory import LLMFactory
            from services.vector_store import VectorStoreService
            from services.rag_service import RAGService

            factory = LLMFactory()
            llm = factory.get_llm()
            embeddings = factory.get_embeddings()

            vector_store = VectorStoreService(embeddings)

            # Reuse the shared cache singleton — single Redis connection pool
            cache = get_cache_service()

            _rag_service = RAGService(llm, vector_store, cache_service=cache)

            logger.info(f"RAG service initialized with provider: {factory.get_provider()}")
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {e}")
            raise

    return _rag_service


def get_speech_service():
    """
    Lazily initialize and return the Speech service singleton.
    """
    global _speech_service

    if _speech_service is None:
        logger.info("Initializing Speech service (first request)...")
        try:
            from services.speech_service import SpeechService
            _speech_service = SpeechService()
            logger.info("Speech service initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize Speech service: {e}")
            raise

    return _speech_service


def reset_services():
    """
    Reset all singleton services (useful for testing or provider switching).
    Call this if LLM_PROVIDER changes at runtime.
    Note: Cache service is intentionally NOT reset — cached answers remain
    valid regardless of which LLM provider is active.
    """
    global _rag_service, _speech_service
    _rag_service = None
    _speech_service = None
    logger.info("Service registry reset. Services will reinitialize on next request.")
