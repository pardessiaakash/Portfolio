# AI Portfolio Chatbot: Next Steps & Project Readiness

## Current Status & Readiness Review

The Redis caching implementation is now **fully operational and verified**. 

### 1. What is Checked & Confirmed Ready:
* **No Code/Runtime Issues:** `python manage.py check` compiles with 0 errors.
* **Connection & Robustness:** Successfully connected to Redis at `localhost:6379`. The cache connection is managed via a shared singleton.
* **Graceful Degradation:** If Redis is shut down, the system automatically falls back to standard RAG pipeline execution without crashing.
* **Negative Caching Guard:** System fallback messages (e.g., `"I don't have that information in this portfolio's knowledge base."`) and transient rate-limit errors are successfully identified and blocked from being cached.
* **Cache Key Mismatch Bug Fixed:** The issue where `mode` mutation (e.g., `web` dynamically switching to `ai` for global questions) caused different GET and SET keys has been resolved. Both now use the frozen `cache_mode` captured at the beginning of the request.

---

## Recommended Next Action Plans

To transition the project from local development to production readiness, the following steps are recommended:

### Phase 1: Production Reliability (High Priority)

#### 1. Automated Test Suite
Currently, there are **0 test cases** in the Django project. We should add unit and integration tests to ensure future changes do not break caching or RAG pipelines.
* **What to test:** 
  * Normalization logic (e.g., stripping punctuation, casing).
  * Cache GET/SET round-trip with a mock Redis client.
  * Ensuring uncacheable phrases are never saved.
  * Ensuring the RAG service returns cache hits on identical queries.

#### 2. Automatic Cache Invalidation
When the database is updated (e.g., seeding new project data or calling the `/api/v1/ingest/` endpoint), cached responses may become stale.
* **Action plan:** Update the ingestion logic (`DocumentIngestView` or Django db signals) to run:
  ```python
  from utils.service_registry import get_cache_service
  # Clear cache for the updated project
  get_cache_service().invalidate(project_id=updated_project_id)
  ```

#### 3. Secure Production Redis Config
Set up production environment variables in your deployment environment (e.g., Heroku, Render, AWS, or Docker Compose).
* **Action plan:**
  * Provision a managed Redis instance (e.g., Upstash, Redis Cloud, AWS ElastiCache).
  * Configure env variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, and `REDIS_DB`.
  * Ensure the Redis maxmemory eviction policy is set to `allkeys-lru` (Least Recently Used) to prevent memory issues.

---

### Phase 2: User Experience & Feature Upgrades (Medium Priority)

#### 4. Semantic Similarity Caching (Upgrade)
Currently, caching uses an exact string match (after normalization). If a user asks:
1. *"What is your tech stack?"*
2. *"Can you tell me about the technologies you use?"*
These will result in two different cache keys.
* **Action plan:** 
  * Integrate a lightweight semantic similarity search in Redis (using Redis vector search or matching embeddings from the cache client) so that queries with the same intent hit the same cache entry.

#### 5. Cache Warming Script
To reduce cold start latency for new visitors.
* **Action plan:** Create a management script that runs once during deployment or periodically, querying the RAG pipeline for the top 10 most common portfolio questions (e.g., *"What is Akash's experience?"*, *"Show me React projects"*) and caching them.
