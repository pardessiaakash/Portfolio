"""
scripts/seed_data.py

Sample script to populate ChromaDB with example project documents.
Run this once to have data to query against.

Usage:
    cd backend
    python scripts/seed_data.py
"""

import os
import sys
from pathlib import Path

# Add the backend directory to sys.path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatbot_project.settings")

import django
django.setup()

from utils.service_registry import get_rag_service
from django.db import connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fetch_projects_from_db():
    """
    Fetches real projects from the PostgreSQL database using a raw SQL cursor.
    Formats them into rich content dictionaries for the ChromaDB vector store.
    Pulls all structured fields so the RAG context is maximally informative.
    """
    import json as _json

    documents = []
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT p.id, p.title, p.description, p.tech_stack, c.name AS category, p.image_url,
                   p.short_description, p.motivation, p.goal, p.problem_solved, p.skills,
                   p.key_features, p.target_users, p.challenges, p.results, p.tags, p.keywords
            FROM projects p
            LEFT JOIN categories c ON p.category_id = c.id
            """
        )
        rows = cursor.fetchall()
        for row in rows:
            (
                proj_id, title, desc, tech, category, image_url,
                short_desc, motivation, goal, problem, skills,
                key_features, target_users, challenges, results, tags, keywords,
            ) = row

            # Build a rich textual content blob for semantic search
            content = f"Project Title: {title}\n"
            # Include BOTH short description AND full description so all content is searchable
            if short_desc:
                content += f"Short Description: {short_desc}\n"
            if desc:
                content += f"Description: {desc}\n"
            if category:
                content += f"Category: {category}\n"
            if tech:
                content += f"Technologies Used: {tech}\n"
            if skills:
                content += f"Skills: {skills}\n"
            if goal:
                content += f"Goal: {goal}\n"
            if problem:
                content += f"Problem Solved: {problem}\n"
            if motivation:
                content += f"Motivation: {motivation}\n"

            def _parse_json_list(raw):
                """Safely parse a JSON list from a raw DB string. Returns [] on failure."""
                if not raw:
                    return []
                if isinstance(raw, list):
                    return raw
                try:
                    parsed = _json.loads(raw)
                    if isinstance(parsed, list):
                        return parsed
                except Exception:
                    pass
                return []

            feats = _parse_json_list(key_features)
            if feats:
                content += f"Key Features: {', '.join(feats)}\n"
            res = _parse_json_list(results)
            if res:
                content += f"Results: {'; '.join(res)}\n"
            t = _parse_json_list(tags)
            if t:
                content += f"Tags: {', '.join(t)}\n"
            kw = _parse_json_list(keywords)
            if kw:
                content += f"Keywords: {', '.join(kw)}\n"

            documents.append({
                "project_id": str(proj_id),
                "title": title or "Untitled",
                "content": content,
                "image_url": image_url or "",
            })

    # Add a global summary document so "what projects do you have?" works
    if documents:
        titles = [d["title"] for d in documents]
        summary_content = (
            "This is the global portfolio overview. "
            "I have worked on various projects, including: " + ", ".join(titles) + ". "
            "These projects demonstrate my design and development skills and capabilities."
        )
        documents.append({
            "project_id": "global_summary",
            "title": "Portfolio Personal Summary",
            "content": summary_content,
            "image_url": "",
        })

    return documents


def main():
    logger.info("Starting data seeding from PostgreSQL database...")

    try:
        rag_service = get_rag_service()
        vector_store = rag_service.vector_store

        # Clear existing collection so we don't have stale/duplicate hardcoded data
        logger.info("Clearing existing ChromaDB collection...")
        try:
            vector_store.vector_store.delete_collection()
            # We explicitly need to re-initialize it to continue adding documents
            vector_store.vector_store = vector_store._init_vector_store()
        except Exception as e:
            logger.warning(f"Could not clear collection (might already be empty): {e}")

        # Fetch dynamically from PostgreSQL
        db_documents = fetch_projects_from_db()
        if not db_documents:
            logger.warning("No projects found in the database. Database is empty.")
            return

        logger.info(f"Found {len(db_documents) - 1} projects in the PostgreSQL database. Ingesting to ChromaDB...")

        count = vector_store.add_documents(db_documents)
        logger.info(f"✅ Successfully added {count} documents to ChromaDB.")

        new_count = vector_store.get_collection_count()
        logger.info(f"New collection size: {new_count} documents")

        # Quick test search
        first_project_title = db_documents[0]["title"]
        logger.info(f"\n--- Test Search: '{first_project_title}' ---")
        results = vector_store.search_global(first_project_title, k=2)
        for r in results:
            logger.info(f"  Found: [{r.metadata['project_id']}] {r.metadata['title']}")

        logger.info("\n✅ Database to ChromaDB Sync Complete!")

    except Exception as e:
        logger.error(f"❌ Seeding failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
