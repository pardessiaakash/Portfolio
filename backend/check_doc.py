import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatbot_project.settings")
django.setup()

from utils.service_registry import get_rag_service
rag = get_rag_service()

# Search for project 41 and see what document content it has
docs = rag.vector_store.vector_store.similarity_search(
    "SwiftConnect opportunity user business gaps",
    k=5,
    filter={"project_id": "41"}
)
print(f"Found {len(docs)} docs for project 41")
for d in docs:
    print("=== DOC ===")
    print(d.page_content[:3000])
    print("==========")
