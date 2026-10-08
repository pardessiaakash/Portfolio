# Portfolio

Full-stack app with a React frontend and a Django RAG chatbot backend.

```
frontend/   React app (Create React App)
backend/    Django API + RAG chatbot (ChromaDB, optional Redis cache)
```

## Backend

Requires Python 3.12.

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then fill in your LLM provider keys
python manage.py migrate
python manage.py runserver        # http://localhost:8000
```

Set `LLM_PROVIDER` in `.env` to `openai`, `gemini` or `ollama` and fill in the matching keys.
Redis is optional; without it, caching is simply turned off.
A `Dockerfile` is included for container deployment.

## Frontend

```bash
cd frontend
cp .env.example .env              # REACT_APP_API_URL points at the backend
npm install
npm start                         # http://localhost:3000
```

## Secrets

`.env` files are git-ignored in both folders. Commit changes to `.env.example` only, never real keys.

## Origin

Imported from [sonaligarud/DevTrio](https://github.com/sonaligarud/DevTrio):
frontend from `main` (19 Sep 2026), backend from `rag-backend` (25 Sep 2026).
