import os
import sys
import django

sys.path.append(os.path.join(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatbot_project.settings')
django.setup()

from services.llm_factory import LLMFactory
from services.vector_store import VectorStoreService

try:
    factory = LLMFactory()
    embedder = factory.get_embeddings()
    vs = VectorStoreService(embeddings=embedder)
    print("Vector Store connected. Searching...")
    results = vs.search_global("explain me any project", k=2)
    print("Found docs:", len(results))
    for r, score in results:
        print("Score:", score, "Doc:", r.page_content[:50])
except Exception as e:
    import traceback
    traceback.print_exc()
