import os
import sys
import django

# Add the backend directory to the system path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatbot_project.settings')
django.setup()

from api.models import Category, Project, ProjectImage

def seed_projects():
    print("Clearing existing projects...")
    Project.objects.all().delete()

    categories = Category.objects.all()
    if not categories:
        print("No categories found. Run seed_categories.py first.")
        return

    # Seed data
    swift_slides = [f"/assets/images/projects/swift/{i}.jpg" for i in range(1, 10)]
    default_slide = ["/assets/images/projects/swift/1.jpg"]

    # Sample Data mapping
    sample_data = {
        "UI/UX": [
            {
                "title": "SwiftConnect Dashboard",
                "short_description": "SwiftConnect empowers your team with AI-driven insights to eliminate response delays.",
                "slides": swift_slides
            },
            {
                "title": "Foodie Delivery App Redesign",
                "short_description": "A modern, intuitive redesign for a popular local food delivery service.",
                "slides": default_slide
            },
            {
                "title": "HealthTrack Mobile Experience",
                "short_description": "User-centric mobile app helping users track their daily fitness and diet goals seamlessly.",
                "slides": default_slide
            },
            {
                "title": "FinTech Wallet Interface",
                "short_description": "A sleek, dark-mode financial dashboard for managing cryptocurrency and fiat assets.",
                "slides": default_slide
            }
        ],
        "Social Media": [
            {
                "title": "Viral Summer Campaign",
                "short_description": "A comprehensive social media strategy that increased brand engagement by 300%.",
                "slides": swift_slides
            },
            {
                "title": "Brand Awareness Strategy",
                "short_description": "Targeted ad campaign focused on building organic growth across Instagram and TikTok.",
                "slides": default_slide
            }
        ],
        "Videos": [
            {
                "title": "Tech Startup Promo Video",
                "short_description": "A 2-minute promotional animation explaining complex SaaS features simply.",
                "slides": swift_slides
            },
            {
                "title": "Product Launch Documentary",
                "short_description": "Behind the scenes look at the launch of a new smart home device.",
                "slides": default_slide
            }
        ],
        "XR": [
            {
                "title": "VR Real Estate Tour",
                "short_description": "Immersive virtual reality experience allowing clients to walk through unbuilt properties.",
                "slides": swift_slides
            },
            {
                "title": "AR Furniture Placer",
                "short_description": "Augmented reality app feature that lets users preview furniture in their own living room.",
                "slides": default_slide
            }
        ]
    }

    for category in categories:
        print(f"Seeding projects for category: {category.name}")
        
        projects_to_create = sample_data.get(category.name, [])
        
        # Fallback if category name doesn't exactly match our hardcoded sample list
        if not projects_to_create:
            projects_to_create = [
                {"title": "Generic Project 1", "short_description": "A sample project.", "slides": swift_slides},
                {"title": "Generic Project 2", "short_description": "Another sample project.", "slides": default_slide}
            ]

        for p_data in projects_to_create:
            title = p_data["title"]
            short_description = p_data["short_description"]
            slides = p_data["slides"]
                
            project = Project.objects.create(
                category=category,
                title=title,
                short_description=short_description,
                description=f"Detailed description and case study for {title}."
            )
            
            # Create slides
            for order, img_url in enumerate(slides):
                ProjectImage.objects.create(
                    project=project,
                    image_url=img_url,
                    order=order
                )
            
            print(f"  - Created '{title}' with {len(slides)} slides.")
            
    print("Seeding complete!")

if __name__ == '__main__':
    seed_projects()
