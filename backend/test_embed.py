import os
import sys
import django

sys.path.append(os.path.join(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatbot_project.settings')
django.setup()

from services.llm_factory import LLMFactory

factory = LLMFactory()
embedder = factory.get_embeddings()
print("Embedder loaded, trying to embed...")
try:
    res = embedder.embed_query("test")
    print("Success! Embedding length:", len(res))
except Exception as e:
    import traceback
    traceback.print_exc()
