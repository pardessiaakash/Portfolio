import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatbot_project.settings")
django.setup()

from utils.service_registry import get_rag_service

rag = get_rag_service()
query = "Competitor SWOT Analysis\nNova: \"I can explain the competitor SWOT analysis, summarize the key market insights, or walk you through the opportunities identified for SwiftConnect.\""

print("Searching global...")
try:
    docs = rag.vector_store.vector_store.similarity_search(query, k=5)
    for i, d in enumerate(docs):
        print(f"[{i}] Content type: {type(d.page_content)}")
except Exception as e:
    import traceback
    traceback.print_exc()

print("Direct chroma query...")
try:
    results = rag.vector_store.vector_store._collection.query(
        query_texts=[query],
        n_results=5
    )
    print("Documents:", results.get("documents"))
except Exception as e:
    import traceback
    traceback.print_exc()

