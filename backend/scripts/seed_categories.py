import os
import sys
import django
import logging

# Add the root backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatbot_project.settings')
django.setup()

from django.db import connection

# Configure logging
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

CATEGORIES = [
    {"name": "UI/UX", "slug": "ui-ux", "icon_url": "/assets/icons/UX.svg", "display_order": 1},
    {"name": "Social Media", "slug": "social-media", "icon_url": "/assets/icons/social-media.svg", "display_order": 2},
    {"name": "Videos", "slug": "video", "icon_url": "/assets/icons/Video.svg", "display_order": 3},
    {"name": "XR", "slug": "xr", "icon_url": "/assets/icons/XR.svg", "display_order": 4},
]

def seed_categories():
    logger.info("Starting category seeding...")
    
    with connection.cursor() as cursor:
        for cat in CATEGORIES:
            # Check if it exists
            cursor.execute("SELECT id FROM categories WHERE name = %s", [cat["name"]])
            existing = cursor.fetchone()
            
            if existing:
                logger.info(f"Category '{cat['name']}' already exists. Updating...")
                cursor.execute(
                    """
                    UPDATE categories SET
                        slug = %s,
                        icon_url = %s,
                        display_order = %s
                    WHERE name = %s
                    """,
                    [cat["slug"], cat["icon_url"], cat["display_order"], cat["name"]]
                )
            else:
                logger.info(f"Inserting new category '{cat['name']}'...")
                cursor.execute(
                    """
                    INSERT INTO categories (name, slug, icon_url, display_order)
                    VALUES (%s, %s, %s, %s)
                    """,
                    [cat["name"], cat["slug"], cat["icon_url"], cat["display_order"]]
                )
        
    logger.info("✅ All categories seeded successfully!")

if __name__ == "__main__":
    seed_categories()
