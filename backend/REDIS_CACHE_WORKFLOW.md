# Redis Caching Workflow

## Overview

This document explains how Redis caching is integrated into the AI chatbot RAG pipeline.
Redis stores generated answers so repeated identical questions return instantly — no LLM call, no vector search.

---

## Current Status ✅

| Check | Result |
|---|---|
| Redis installed | ✅ v8.6.3 (Homebrew) |
| Redis running | ✅ `localhost:6379` |
| redis-py installed | ✅ v7.4.0 |
| Cache connected | ✅ Verified |
| Cache TTL | ✅ 86400s (24 hours) |

---

## End-to-End Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/v1/chat/                           │
│         { query, mode, project_id, chat_history }              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   ChatView      │
                    │  (views.py)     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  RAGService     │
                    │  .chat()        │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │   Has chat_history?          │
              └──────────────┬──────────────┘
          YES (conversational)│         NO (fresh query)
          skip cache entirely │              │
                             │              ▼
                             │   ┌─────────────────────┐
                             │   │  Build Cache Key     │
                             │   │  normalize(query)    │
                             │   │  → project_id:mode:  │
                             │   │    normalized_query  │
                             │   └──────────┬──────────┘
                             │              │
                             │              ▼
                             │   ┌─────────────────────┐
                             │   │  Redis GET(key)      │
                             │   └──────────┬──────────┘
                             │        ┌─────┴──────┐
                             │    HIT │            │ MISS
                             │        ▼            ▼
                             │  ┌──────────┐  ┌──────────────────────────┐
                             │  │ Return   │  │  Classify Intent (LLM)   │
                             │  │ cached   │  │  → project / global /    │
                             │  │ answer   │  │    cross_project / other  │
                             │  │ instantly│  └──────────────┬───────────┘
                             │  │          │                 │
                             │  │from_cache│                 ▼
                             │  │= true ✅ │  ┌──────────────────────────┐
                             │  └──────────┘  │  Vector Search ChromaDB  │
                             │                │  (top-5 docs, filtered   │
                             │                │   by project or global)  │
                             │                └──────────────┬───────────┘
                             │                               │
                             │                               ▼
                             │                ┌──────────────────────────┐
                             │                │  Build Context String    │
                             │                │  (max 1500 chars/doc)    │
                             │                └──────────────┬───────────┘
                             │                               │
                             │                               ▼
                             │                ┌──────────────────────────┐
                             │                │  LLM Generation          │
                             │                │  (OpenAI / Gemini /      │
                             │                │   Ollama)                │
                             │                └──────────────┬───────────┘
                             │                               │
                             │                               ▼
                             │                ┌──────────────────────────┐
                             │                │  Is answer cacheable?    │
                             │                │  • Non-empty string      │
                             │                │  • Not an error phrase   │
                             │                └──────────────┬───────────┘
                             │                     YES │     │ NO
                             │                         ▼     │ (skip SET)
                             │                ┌──────────────┐│
                             │                │ Redis SET    ││
                             │                │ key → answer ││
                             │                │ TTL: 24h     ││
                             │                └──────────────┘│
                             │                               │
                             └────────────────┬──────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │  Return JSON Response           │
                             │  {                              │
                             │    answer,                      │
                             │    sources,                     │
                             │    mode,                        │
                             │    project_id,                  │
                             │    from_cache: true | false     │
                             │  }                              │
                             └─────────────────────────────────┘
```

---

## Cache Key Format

```
rag_cache : {project_id} : {mode} : {normalized_query}
```

| Component | Example |
|---|---|
| `project_id` | `proj_001` or `global` (if None) |
| `mode` | `ai` or `web` |
| `normalized_query` | `what tech stack does this project use` |

**Full key examples:**
```
rag_cache:global:ai:what projects have you built
rag_cache:proj_001:web:what tech stack does this project use
rag_cache:global:ai:tell me about react experience
```

---

## Query Normalization Rules

| Step | Input | Output |
|---|---|---|
| Strip whitespace | `"  hello world  "` | `"hello world"` |
| Lowercase | `"WHAT Projects?"` | `"what projects?"` |
| Remove punctuation | `"what projects?!"` | `"what projects"` |
| Collapse spaces | `"what   projects"` | `"what projects"` |

**Result:** These 3 queries all resolve to the **same cache key**:
```
"What projects have you built?!"
"  WHAT PROJECTS HAVE YOU BUILT  "
"what projects have you built"
```

---

## What IS and IS NOT Cached

### Cached
- Fresh queries with no prior chat history
- Non-empty, factual answers from the RAG pipeline
- Both `mode=ai` (global) and `mode=web` (project-scoped) answers

### NOT Cached
| Scenario | Reason |
|---|---|
| Queries with `chat_history` present | Context-dependent, varies by conversation |
| Empty or whitespace-only answers | Nothing useful to cache |
| `"I don't have that information..."` | Retrieval fallback — may succeed later |
| `"I'm currently experiencing high demand..."` | Transient rate-limit error |
| `"I'm sorry, I encountered an error..."` | Pipeline failure |
| `"I can only answer questions about..."` | Scope rejection |
| Identity questions (Nova hardcoded) | Zero-cost string constant |
| Chitchat / off-topic | Zero-cost string constant |

---

## How to Check if Redis is Active

### 1. Ping Redis directly
```bash
redis-cli ping
# → PONG    Running
# → Error   Not running
```

### 2. Check via the health API
```bash
curl http://localhost:8000/api/v1/health/ | python3 -m json.tool
```
**Redis active response:**
```json
{
  "status": "ok",
  "llm_provider": "openai",
  "message": "Chatbot API is running.",
  "cache": {
    "status": "ok",
    "ttl_seconds": 86400,
    "keyspace_hits": 12,
    "keyspace_misses": 5,
    "hit_rate": "70.59%"
  }
}
```
**Redis down response:**
```json
{
  "cache": {
    "status": "unavailable",
    "reason": "Redis not connected"
  }
}
```

### 3. Check `from_cache` in chat responses
```bash
curl -X POST http://localhost:8000/api/v1/chat/ \
  -H "Content-Type: application/json" \
  -d '{"query": "what projects have you built", "mode": "ai"}'
```
```json
{ "answer": "...", "from_cache": true  }    <- HIT  (instant)
{ "answer": "...", "from_cache": false }    <- MISS (full pipeline ran)
```

### 4. Inspect cached keys directly
```bash
redis-cli KEYS "rag_cache:*"
redis-cli TTL  "rag_cache:global:ai:what projects have you built"
# → 86123  (seconds remaining)
```

### 5. Monitor live cache activity
```bash
redis-cli MONITOR   # Watch every SET/GET in real time
```

---

## Redis Management Commands

```bash
# Start Redis
brew services start redis

# Stop Redis
brew services stop redis

# Restart Redis
brew services restart redis

# Check status
brew services info redis

# Clear ALL cache (use after re-seeding ChromaDB)
redis-cli FLUSHDB

# Clear only RAG cache keys
redis-cli KEYS "rag_cache:*" | xargs redis-cli DEL

# Clear cache for a specific project
redis-cli KEYS "rag_cache:proj_001:*" | xargs redis-cli DEL

# View memory usage
redis-cli INFO memory | grep used_memory_human
```

---

## Architecture: File Map

```
backend/
├── services/
│   ├── cache_service.py      <- CacheService + RedisConnectionManager
│   ├── rag_service.py        <- Cache check/store integrated in .chat()
│   ├── llm_factory.py        <- LLM provider factory
│   └── vector_store.py       <- ChromaDB wrapper
├── utils/
│   └── service_registry.py   <- Singletons: CacheService + RAGService
├── api/
│   └── views.py              <- Health check shows cache stats
└── chatbot_project/
    └── settings.py           <- REDIS_HOST, PORT, DB, TTL config
```

---

## Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
# REDIS_PASSWORD=secret     # Uncomment if Redis requires auth
REDIS_CACHE_TTL=86400       # 24 hours
```

---

## Graceful Degradation

If Redis goes down while the server is running:
- No crash, no restart needed
- Warning logged: `"Redis connection failed. Cache is disabled."`
- Every request falls back to the full RAG pipeline automatically
- When Redis comes back up — restart Django server to reconnect

---

## Production Notes

| Concern | Recommendation |
|---|---|
| High availability | Use Redis Sentinel or Redis Cluster |
| Managed hosting | Upstash (serverless), Redis Cloud, AWS ElastiCache |
| Cache invalidation | Run `KEYS rag_cache:* \| xargs DEL` after re-seeding ChromaDB |
| Memory limit | Set `maxmemory 256mb` + `maxmemory-policy allkeys-lru` in redis.conf |
| Persistence | For pure cache use, disable RDB/AOF to reduce disk I/O |
