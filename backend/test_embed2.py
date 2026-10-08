import os
import sys
import django

sys.path.append(os.path.join(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatbot_project.settings')
django.setup()

import google.generativeai as genai
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

from langchain_google_genai import GoogleGenerativeAIEmbeddings
embedder = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
print("Embedder loaded, trying to embed...")
try:
    res = embedder.embed_query("test")
    print("Success! Embedding length:", len(res))
except Exception as e:
    import traceback
    traceback.print_exc()
