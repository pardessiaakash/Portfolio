import os
import sys
import time
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatbot_project.settings")
import django
django.setup()

from services.llm_factory import LLMFactory
from services.vector_store import VectorStoreService

print("=" * 60)
print("  AI SYSTEM DIAGNOSTIC REPORT")
print("=" * 60)

# 1. Provider info
provider = os.getenv("LLM_PROVIDER", "openai")
print(f"\n[1] PROVIDER         : {provider.upper()}")
print(f"    GEMINI_MODEL     : {os.getenv('GEMINI_MODEL', 'NOT SET')}")
print(f"    GEMINI_EMBEDDING : {os.getenv('GEMINI_EMBEDDING_MODEL', 'NOT SET')}")
print(f"    GOOGLE_API_KEY   : {'SET ✅' if os.getenv('GOOGLE_API_KEY') else 'NOT SET ❌'}")

# 2. Python version
import platform
print(f"\n[2] PYTHON VERSION   : {platform.python_version()}")
print(f"    PYTHON PATH      : {sys.executable}")

# 3. LangChain version
try:
    import langchain
    print(f"\n[3] LANGCHAIN VERSION: {langchain.__version__}")
except: print("\n[3] LANGCHAIN        : ❌ not installed")
try:
    import langchain_google_genai
    print(f"    LANGCHAIN-GENAI  : {langchain_google_genai.__version__}")
except: print("    LANGCHAIN-GENAI  : ❌ not installed")

# 4. LLM load test
print("\n[4] LLM LOAD TEST...")
try:
    factory = LLMFactory()
    llm = factory.get_llm()
    print(f"    LLM              : ✅ Loaded ({type(llm).__name__})")
    print(f"    MODEL            : {getattr(llm, 'model', 'unknown')}")
except Exception as e:
    print(f"    LLM              : ❌ FAILED: {e}")
    llm = None

# 5. Embedding test
print("\n[5] EMBEDDING TEST...")
try:
    factory2 = LLMFactory()
    embedder = factory2.get_embeddings()
    t0 = time.time()
    result = embedder.embed_query("test query")
    elapsed = time.time() - t0
    print(f"    EMBEDDINGS       : ✅ Working")
    print(f"    DIMENSIONS       : {len(result)}")
    print(f"    LATENCY          : {elapsed:.2f}s")
except Exception as e:
    print(f"    EMBEDDINGS       : ❌ FAILED: {e}")

# 6. ChromaDB docs count
print("\n[6] CHROMADB STATUS...")
try:
    from services.llm_factory import LLMFactory as F2
    from services.vector_store import VectorStoreService as VS
    f = F2()
    emb = f.get_embeddings()
    vs = VS(embeddings=emb)
    count = vs.get_collection_count()
    print(f"    COLLECTION       : {vs.collection_name}")
    print(f"    PERSIST DIR      : {vs.persist_dir}")
    print(f"    DOCUMENT COUNT   : {count}")
    if count == 0:
        print("    WARNING          : ⚠️  No documents! Run seed_data.py")
    else:
        print(f"    STATUS           : ✅ {count} docs ready for RAG")
except Exception as e:
    print(f"    CHROMADB         : ❌ FAILED: {e}")

# 7. Full end-to-end chat test
print("\n[7] END-TO-END CHAT TEST...")
if llm:
    try:
        from utils.service_registry import get_rag_service
        rag = get_rag_service()
        t0 = time.time()
        result = rag.chat(query="What projects do you have?", mode="ai")
        elapsed = time.time() - t0
        answer = result.get("answer", "")[:120]
        sources = len(result.get("sources", []))
        cached = result.get("from_cache", False)
        print(f"    QUERY            : 'What projects do you have?'")
        print(f"    ANSWER (first 120): {answer}...")
        print(f"    SOURCES FOUND    : {sources}")
        print(f"    FROM CACHE       : {cached}")
        print(f"    LATENCY          : {elapsed:.2f}s")
        print(f"    CHAT TEST        : ✅ SUCCESS")
    except Exception as e:
        import traceback
        print(f"    CHAT TEST        : ❌ FAILED")
        traceback.print_exc()

print("\n" + "=" * 60)
print("  END OF REPORT")
print("=" * 60)
