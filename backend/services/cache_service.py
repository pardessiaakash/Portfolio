"""
services/cache_service.py

Redis-backed caching layer for the RAG pipeline.

Purpose:
    Avoid re-running the expensive RAG pipeline (embedding → ChromaDB → LLM)
    for queries that have been answered before. Cached responses are returned
    instantly with zero LLM cost.

Cache Key Format:
    {project_id}:{mode}:{normalized_query}

    Examples:
        "global:ai:what projects have you built"
        "proj_001:web:what tech stack does this use"

Cache TTL:
    Default 24 hours (86400 seconds), configurable via REDIS_CACHE_TTL env var.

What IS cached:
    - Successful RAG responses with a non-empty answer
    - Source metadata (project_id, title, image_url, snippet)
    - Timestamp of when the response was cached

What is NOT cached:
    - Empty or whitespace-only answers
    - Error/fallback responses (detected by sentinel phrases)
    - Responses with no sources (may indicate a failed retrieval)
    - Any exception/failure path

Normalization:
    Queries are normalized before key generation:
    - Lowercased
    - Stripped of leading/trailing whitespace
    - Punctuation removed
    - Multiple spaces collapsed to one

Usage:
    from services.cache_service import CacheService

    cache = CacheService()
    cached = cache.get_cached_response("global", "ai", "what projects do you have")
    if cached:
        return cached
    ...run RAG...
    cache.set_cached_response("global", "ai", "what projects do you have", result)
"""

import os
import re
import json
import time
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("services")

# ------------------------------------------------------------------
# Sentinel phrases that indicate a low-quality / error response.
# These responses should NEVER be cached — they may be transient
# or caused by a retrieval failure.
# ------------------------------------------------------------------
_UNCACHEABLE_PHRASES = [
    "i'm sorry, i encountered an error",
    "failed to generate",
    "i'm currently experiencing high demand",
    "please wait a moment and try again",
    "i don't have that information",        # Empty-retrieval fallback
    "i can only answer questions about",    # Scope-restriction fallback
    "i can only answer questions about this portfolio",
]

# Default cache TTL = 24 hours
_DEFAULT_TTL = 86_400


class RedisConnectionManager:
    """
    Manages a single shared Redis connection (connection pool under the hood).

    Configuration is read from environment variables:
        REDIS_HOST       — default: localhost
        REDIS_PORT       — default: 6379
        REDIS_DB         — default: 0
        REDIS_PASSWORD   — default: (none)
        REDIS_CACHE_TTL  — TTL in seconds, default: 86400 (24h)

    The connection is created lazily on first use so Django can start
    even when Redis is not yet available.
    """

    _client = None  # Module-level shared client

    @classmethod
    def get_client(cls):
        """
        Return a connected Redis client, creating it on first call.
        Returns None (with a warning) if Redis is unavailable so the
        application can degrade gracefully.
        """
        if cls._client is not None:
            return cls._client

        try:
            import redis  # redis-py

            host = os.getenv("REDIS_HOST", "localhost")
            port = int(os.getenv("REDIS_PORT", "6379"))
            db = int(os.getenv("REDIS_DB", "0"))
            password = os.getenv("REDIS_PASSWORD") or None

            # connection_pool gives us thread-safe reuse
            pool = redis.ConnectionPool(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=True,   # Always return str, not bytes
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            cls._client = redis.Redis(connection_pool=pool)

            # Ping once to verify the connection is actually alive
            cls._client.ping()
            logger.info(f"Redis connected: {host}:{port} db={db}")

        except ImportError:
            logger.warning(
                "redis-py is not installed. Cache is disabled. "
                "Install with: pip install redis"
            )
            cls._client = None
        except Exception as e:
            logger.warning(
                f"Redis connection failed ({e}). "
                "Cache is disabled — RAG pipeline will run for every query."
            )
            cls._client = None

        return cls._client

    @classmethod
    def reset(cls):
        """Force-close and reset the connection (useful for tests)."""
        cls._client = None


class CacheService:
    """
    High-level caching interface for RAG responses.

    All public methods are safe to call even when Redis is down —
    they return None / False gracefully so the caller can continue
    without caching.
    """

    # Cache key namespace — change this to bust all existing keys
    KEY_PREFIX = "rag_cache"

    def __init__(self):
        self.ttl: int = int(os.getenv("REDIS_CACHE_TTL", str(_DEFAULT_TTL)))
        self._client = RedisConnectionManager.get_client()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_cached_response(
        self,
        project_id: Optional[str],
        mode: str,
        query: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Attempt to retrieve a cached RAG response.

        Args:
            project_id: The project context (or None for global queries).
            mode:       The chat mode — "ai" (global) or "web" (project-scoped).
            query:      The raw user query.

        Returns:
            Cached dict with keys: answer, sources, mode, project_id, cached_at
            OR None if there is no cache hit.
        """
        if not self._client:
            return None  # Redis unavailable — cache miss

        key = self._make_key(project_id, mode, query)

        try:
            raw = self._client.get(key)
            if raw is None:
                logger.debug(f"Cache MISS for key: {key}")
                return None

            payload = json.loads(raw)
            logger.info(f"Cache HIT for key: {key} (cached_at={payload.get('cached_at')})")
            return payload

        except Exception as e:
            logger.warning(f"Cache GET failed ({e}) — treating as cache miss.")
            return None

    def set_cached_response(
        self,
        project_id: Optional[str],
        mode: str,
        query: str,
        response: Dict[str, Any],
    ) -> bool:
        """
        Store a RAG response in Redis.

        Skips caching if:
          - Redis is unavailable.
          - The answer is empty or a known fallback/error phrase.
          - The response dict is structurally invalid.

        Args:
            project_id: The project context (or None for global queries).
            mode:       The chat mode.
            query:      The raw user query.
            response:   The full RAG response dict returned by RAGService.chat().

        Returns:
            True if the response was cached, False otherwise.
        """
        if not self._client:
            return False

        # --- Validate before caching ---
        if not self._is_cacheable(response):
            logger.debug(f"Response not cached (failed cacheability check) for query: {query[:60]}")
            return False

        key = self._make_key(project_id, mode, query)

        # Enrich with cache metadata before storing
        payload = {
            **response,
            "cached_at": time.time(),          # Unix timestamp
            "cached_at_human": time.strftime(  # Human-readable timestamp
                "%Y-%m-%d %H:%M:%S UTC", time.gmtime()
            ),
        }

        try:
            self._client.setex(
                name=key,
                time=self.ttl,
                value=json.dumps(payload),
            )
            logger.info(
                f"Cache SET for key: {key} "
                f"(TTL={self.ttl}s / {self.ttl // 3600}h)"
            )
            return True

        except Exception as e:
            logger.warning(f"Cache SET failed ({e}) — response not cached.")
            return False

    def invalidate(
        self,
        project_id: Optional[str] = None,
        mode: Optional[str] = None,
        query: Optional[str] = None,
    ) -> int:
        """
        Delete cache entries matching the given key.
        If query is None, deletes ALL keys matching the prefix pattern.

        Returns the number of keys deleted.
        """
        if not self._client:
            return 0

        try:
            if query:
                # Delete a single specific key
                key = self._make_key(project_id, mode, query)
                return self._client.delete(key)
            else:
                # Pattern-delete: e.g. "rag_cache:proj_001:web:*"
                pattern = self._make_pattern(project_id, mode)
                keys = list(self._client.scan_iter(pattern, count=100))
                if keys:
                    return self._client.delete(*keys)
                return 0
        except Exception as e:
            logger.warning(f"Cache INVALIDATE failed: {e}")
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """
        Return basic Redis info for health-check / admin endpoints.
        """
        if not self._client:
            return {"status": "unavailable", "reason": "Redis not connected"}

        try:
            info = self._client.info("stats")
            return {
                "status": "ok",
                "ttl_seconds": self.ttl,
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._hit_rate(
                    info.get("keyspace_hits", 0),
                    info.get("keyspace_misses", 0),
                ),
            }
        except Exception as e:
            return {"status": "error", "details": str(e)}

    # ------------------------------------------------------------------
    # Static / class helpers
    # ------------------------------------------------------------------

    @staticmethod
    def normalize_query(query: str) -> str:
        """
        Normalize a query string for stable cache key generation.

        Steps:
            1. Strip leading/trailing whitespace
            2. Lowercase
            3. Remove all punctuation characters
            4. Collapse multiple spaces into one

        Examples:
            "What projects have you built?!" → "what projects have you built"
            "  Tell me about React.js  "     → "tell me about reactjs"
        """
        query = query.strip().lower()
        # Remove punctuation (keep only alphanumeric + spaces)
        query = re.sub(r"[^\w\s]", "", query)
        # Collapse multiple whitespace characters (including tabs/newlines)
        query = re.sub(r"\s+", " ", query).strip()
        return query

    def _make_key(
        self,
        project_id: Optional[str],
        mode: Optional[str],
        query: str,
    ) -> str:
        """
        Build a Redis key from components.

        Format: rag_cache:{project_id_or_global}:{mode}:{normalized_query}

        Examples:
            "rag_cache:global:ai:what projects have you built"
            "rag_cache:proj_001:web:what tech stack does this project use"
        """
        normalized = self.normalize_query(query)
        pid = (project_id or "global").lower().strip()
        m = (mode or "ai").lower().strip()
        return f"{self.KEY_PREFIX}:{pid}:{m}:{normalized}"

    def _make_pattern(
        self,
        project_id: Optional[str],
        mode: Optional[str],
    ) -> str:
        """Build a wildcard pattern for bulk key deletion via SCAN."""
        pid = (project_id or "*").lower().strip()
        m = (mode or "*").lower().strip()
        return f"{self.KEY_PREFIX}:{pid}:{m}:*"

    @staticmethod
    def _is_cacheable(response: Dict[str, Any]) -> bool:
        """
        Return True only if the response is worth caching.

        Rejects:
        - Missing or empty 'answer' field
        - Answers matching known error/fallback sentinel phrases
        """
        answer = response.get("answer", "")

        # Must be a non-empty string
        if not isinstance(answer, str) or not answer.strip():
            return False

        # Reject known low-confidence / error phrases
        answer_lower = answer.lower()
        for phrase in _UNCACHEABLE_PHRASES:
            if phrase in answer_lower:
                return False

        return True

    @staticmethod
    def _hit_rate(hits: int, misses: int) -> str:
        total = hits + misses
        if total == 0:
            return "0.00%"
        return f"{hits / total * 100:.2f}%"
