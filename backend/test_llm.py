import os
import sys
import django

# Add the backend directory to the system path
sys.path.append(os.path.join(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatbot_project.settings')
django.setup()

from services.llm_factory import LLMFactory

print("Initializing factory...")
factory = LLMFactory()
print("Getting LLM...")
llm = factory.get_llm()
print("LLM loaded:", llm)
print("Invoking LLM...")
response = llm.invoke("Hello, say 'Test'")
print("Response:", response.content)
