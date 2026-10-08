import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatbot_project.settings')
django.setup()

from api.models import Project

# Get the Viral Summer Campaign project
try:
    p = Project.objects.get(id=41)
    p.goal = "The primary goal of the Viral Summer Campaign was to increase brand awareness and engagement among Gen Z by 300% over a 3-month period. We aimed to constraints the budget to under $50,000."
    p.problem_solved = "The core problem was stagnant social media growth and low conversion rates on Instagram. The campaign solved this by introducing interactive, user-generated content challenges."
    p.motivation = "We were motivated by the competitor SWOT analysis, which showed a clear market gap for authentic, community-driven content during the summer season."
    p.architecture = "The project scope required launching a multi-channel strategy across TikTok, Instagram, and YouTube Shorts, leveraging micro-influencers and AR filters."
    p.design_process = "Our design direction was shaped by extensive user research and affinity mapping. We conducted qualitative stakeholder interviews to understand their needs. Key insights revealed that users wanted gamified experiences. We created detailed Support Agent empathy maps and user personas to guide the final high-fidelity solution."
    p.skills = "Social Media Strategy, Data Analytics, UX Research, Content Creation, Influencer Management"
    
    # JSON Fields
    p.key_features = json.dumps(["Interactive AR Filters", "Weekly Hashtag Challenges", "Live Q&A Sessions", "User-Generated Content Curation"])
    p.target_users = json.dumps(["Gen Z", "Young Millennials", "College Students"])
    p.challenges = json.dumps(["Tight budget constraints", "Short timeline for content production", "Changing social media algorithms"])
    p.results = json.dumps(["300% increase in brand engagement", "150% growth in follower count", "$100,000 generated in direct sales", "Over 1M organic impressions"])
    p.future_improvements = json.dumps(["Expand campaign to Snapchat", "Integrate more user polls", "Develop a dedicated app feature for challenges"])
    
    p.save()
    print("Successfully populated dummy data for Viral Summer Campaign!")
except Project.DoesNotExist:
    print("Project 41 not found!")
