"""
scripts/fix_aws_projects.py

Copies rich content from local project IDs 37-46 into AWS project IDs 5-14.
Run inside Docker on AWS:
    docker exec devtrio-backend python scripts/fix_aws_projects.py
"""

import os, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv()
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatbot_project.settings")

import django
django.setup()

from django.db import connection
import logging

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

ID_MAPPING = [
    (5, 37), (6, 38), (7, 39), (8, 40),
    (9, 41), (10, 42), (11, 43), (12, 44),
    (13, 45), (14, 46),
]

FIELDS = [
    "description", "motivation", "goal", "problem_solved",
    "architecture", "design_process", "skills",
    "key_features", "target_users", "challenges",
    "results", "future_improvements", "tags", "keywords", "faq"
]

def fix_projects():
    logger.info("Starting AWS project content fix...")
    with connection.cursor() as cursor:
        for aws_id, local_id in ID_MAPPING:
            cursor.execute(f"SELECT {', '.join(FIELDS)} FROM projects WHERE id = %s", [local_id])
            row = cursor.fetchone()
            if not row:
                logger.warning(f"Source project id={local_id} not found! Skipping.")
                continue
            set_clause = ", ".join([f"{f} = %s" for f in FIELDS])
            cursor.execute(f"UPDATE projects SET {set_clause} WHERE id = %s", list(row) + [aws_id])
            logger.info(f"Updated AWS project id={aws_id} from local id={local_id}")
    logger.info("Done. Now run: docker exec devtrio-backend python scripts/seed_data.py")

if __name__ == "__main__":
    fix_projects()
