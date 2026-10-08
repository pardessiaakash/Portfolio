import os
import sys
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatbot_project.settings")
django.setup()

from utils.service_registry import get_rag_service

def inspect():
    rag = get_rag_service
    collection = rag.vector_store.vector_store._collection
    data = collection.get() # Get all docs
    print("Total docs:", len(data['ids']))
    for i in range(len(data['ids'])):
        print(f"ID: {data['ids'][i]}")
        print(f"Content: {data['documents'][i]}")
        print(f"Metadata: {data['metadatas'][i]}")
        print("-" * 20)

if __name__ == '__main__':
    inspect()
