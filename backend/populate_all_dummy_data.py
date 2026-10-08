import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatbot_project.settings')
django.setup()

from api.models import Project

projects = Project.objects.all()

for p in projects:
    if not p.goal:
        p.goal = f"The primary goal of {p.title} was to deliver an exceptional user experience while increasing overall engagement by 200%. We aimed to meet all business constraints within a 6-month timeline."
    if not p.problem_solved:
        p.problem_solved = f"The core problem solved by {p.title} was the high user drop-off rate caused by an outdated interface and slow performance. This was resolved by optimizing the architecture and streamlining user task flows."
    if not p.motivation:
        p.motivation = f"We were motivated by the competitor SWOT analysis, which showed a clear market gap that {p.title} could fill with a fresh, modern approach."
    if not p.architecture:
        p.architecture = f"The project scope for {p.title} required launching a scalable, robust architecture utilizing the latest frontend and backend technologies to handle peak season traffic seamlessly."
    if not p.design_process:
        p.design_process = f"Our design direction for {p.title} was shaped by extensive user research and affinity mapping. We conducted qualitative stakeholder interviews to understand their needs. We created detailed Support Agent empathy maps and user personas to guide the final high-fidelity solution."
    if not p.skills:
        p.skills = "UI/UX Design, User Research, Prototyping, Frontend Development, Data Analytics"
    
    # JSON Fields
    if not p.key_features or p.key_features == "[]":
        p.key_features = json.dumps(["Interactive Dashboards", "Real-time Analytics", "Seamless User Onboarding", "Accessibility Focused UI"])
    if not p.target_users or p.target_users == "[]":
        p.target_users = json.dumps(["Gen Z", "Young Professionals", "Enterprise Clients"])
    if not p.challenges or p.challenges == "[]":
        p.challenges = json.dumps(["Tight budget constraints", "Short timeline for production", "Legacy system integration"])
    if not p.results or p.results == "[]":
        p.results = json.dumps(["200% increase in engagement", "150% growth in active users", "Significantly reduced bounce rates", "Over 1M organic impressions"])
    if not p.future_improvements or p.future_improvements == "[]":
        p.future_improvements = json.dumps(["Expand platform integrations", "Integrate more AI-driven insights", "Develop a dedicated mobile application"])
    
    p.save()

print(f"Successfully populated dummy data for {projects.count()} projects!")
