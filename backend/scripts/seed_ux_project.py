"""
scripts/seed_ux_project.py

Seeds the 'Minimalist Sustainable Fashion App UX Redesign' project
into PostgreSQL using the new rich schema.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/seed_ux_project.py
"""

import os
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatbot_project.settings")

import django
django.setup()

from django.db import connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Project Data ─────────────────────────────────────────────────────────────

PROJECT = {
    "title": "Minimalist Sustainable Fashion App UX Redesign",
    "description": (
        "A UX case study focused on redesigning a fashion e-commerce app for a sustainable "
        "clothing brand, improving usability, trust, and emotional connection with eco-conscious users."
    ),
    "short_description": (
        "A UX case study focused on redesigning a fashion e-commerce app for a sustainable "
        "clothing brand, improving usability, trust, and emotional connection with eco-conscious users."
    ),
    "motivation": (
        "To align the digital shopping experience with the brand's core values of minimalism, "
        "sustainability, and transparency while reducing friction in user journeys."
    ),
    "goal": (
        "Design an intuitive, seamless, and emotionally engaging shopping experience that increases "
        "user trust, improves conversions, and supports sustainable decision-making."
    ),
    "problem_solved": (
        "Users faced issues such as overwhelming product discovery, poor filters, lack of sustainability "
        "transparency, confusing sizing, and checkout friction, leading to drop-offs and low trust."
    ),
    "tech_stack": "Figma, Typeform, Design Thinking, User Journey Mapping, Affinity Mapping, Persona Creation",
    "architecture": (
        "User-centered UX architecture using Design Thinking methodology: "
        "Empathize → Define → Ideate → Prototype → Test. "
        "Includes research-driven flows like discovery → product selection → checkout → post-purchase."
    ),
    "design_process": (
        "Conducted user research via surveys, analyzed pain points, created personas and empathy maps, "
        "built journey maps, performed affinity mapping, ideated solutions, and designed wireframes "
        "and high-fidelity prototypes in Figma."
    ),
    "image_url": "",
    "category": "UX Case Study",
    "skills": "UX Research, UI Design, Prototyping, Figma, User Journey Mapping, Affinity Mapping",

    # ── JSONB arrays ──────────────────────────────────────────────────────────
    "key_features": [
        "Curated minimalist product collections",
        "Sustainability badges and supply chain transparency",
        "Size recommender system",
        "One-page seamless checkout",
        "Real-life product images for trust",
        "Easy return flow with tracking",
        "Wishlist and personalization",
        "Virtual try-on (future scope)",
    ],
    "target_users": [
        "Eco-conscious shoppers",
        "Minimalist lifestyle users",
        "Price-sensitive online buyers",
        "Urban millennials",
        "Sustainable fashion enthusiasts",
    ],
    "challenges": [
        "Balancing sustainability with price sensitivity",
        "Building trust in eco-friendly claims",
        "Reducing overwhelming product choices",
        "Improving checkout performance",
        "Designing intuitive size guidance",
        "Ensuring accessibility and performance",
    ],
    "results": [
        "Identified top pain points like checkout friction (32%) and poor filters (28%)",
        "70% users value sustainability but hesitate to pay premium",
        "Improved UX flow with curated discovery and simplified checkout",
        "Defined actionable design opportunities across the funnel",
        "Created complete UX deliverables (personas, journey maps, wireframes)",
    ],
    "future_improvements": [
        "AI-based size recommendation system",
        "Enhanced personalization using user behavior",
        "Virtual try-on integration",
        "Subscription-based slow fashion model",
        "Improved logistics and faster returns",
        "Gamified feedback and loyalty system",
    ],
    "tags": [
        "UX Case Study",
        "UI Design",
        "E-commerce",
        "Sustainability",
        "Fashion Tech",
        "Product Design",
    ],
    "keywords": [
        "Minimalist UX",
        "Sustainable fashion app",
        "User experience design",
        "E-commerce UX",
        "Design thinking",
        "User research",
        "Figma prototype",
    ],
    "faq": [
        {
            "question": "What problem does this project solve?",
            "answer": (
                "It solves issues like poor discovery, lack of trust in sustainability claims, "
                "confusing sizing, and checkout friction in fashion apps."
            ),
        },
        {
            "question": "What research methods were used?",
            "answer": (
                "User surveys, empathy mapping, affinity mapping, and journey mapping were used "
                "to derive insights."
            ),
        },
        {
            "question": "What makes this app different?",
            "answer": "It focuses on minimalism, sustainability transparency, and a seamless shopping experience.",
        },
        {
            "question": "Who is the target audience?",
            "answer": "Eco-conscious, minimalist, and urban users who prefer sustainable fashion.",
        },
        {
            "question": "What tools were used?",
            "answer": "Figma for design and Typeform for user research.",
        },
    ],
}


# ─── Insert / Upsert ──────────────────────────────────────────────────────────

def seed():
    logger.info("Seeding 'Minimalist Sustainable Fashion App UX Redesign' project...")

    with connection.cursor() as cursor:
        # Check if project with same title already exists
        cursor.execute("SELECT id FROM projects WHERE title = %s", [PROJECT["title"]])
        existing = cursor.fetchone()

        # Get category_id
        cursor.execute("SELECT id FROM categories WHERE name = %s", [PROJECT["category"]])
        cat_row = cursor.fetchone()
        category_id = cat_row[0] if cat_row else None

        if existing:
            project_id = existing[0]
            logger.info(f"Project already exists (id={project_id}). Updating...")
            cursor.execute(
                """
                UPDATE projects SET
                    description          = %s,
                    short_description    = %s,
                    motivation           = %s,
                    goal                 = %s,
                    problem_solved       = %s,
                    tech_stack           = %s,
                    architecture         = %s,
                    design_process       = %s,
                    image_url            = %s,
                    category_id          = %s,
                    skills               = %s,
                    key_features         = %s,
                    target_users         = %s,
                    challenges           = %s,
                    results              = %s,
                    future_improvements  = %s,
                    tags                 = %s,
                    keywords             = %s,
                    faq                  = %s
                WHERE id = %s
                """,
                [
                    PROJECT["description"],
                    PROJECT["short_description"],
                    PROJECT["motivation"],
                    PROJECT["goal"],
                    PROJECT["problem_solved"],
                    PROJECT["tech_stack"],
                    PROJECT["architecture"],
                    PROJECT["design_process"],
                    PROJECT["image_url"],
                    category_id,
                    PROJECT["skills"],
                    json.dumps(PROJECT["key_features"]),
                    json.dumps(PROJECT["target_users"]),
                    json.dumps(PROJECT["challenges"]),
                    json.dumps(PROJECT["results"]),
                    json.dumps(PROJECT["future_improvements"]),
                    json.dumps(PROJECT["tags"]),
                    json.dumps(PROJECT["keywords"]),
                    json.dumps(PROJECT["faq"]),
                    project_id,
                ],
            )
            logger.info(f"✅ Updated project id={project_id}")
        else:
            cursor.execute(
                """
                INSERT INTO projects (
                    title, description, short_description, motivation, goal,
                    problem_solved, tech_stack, architecture, design_process,
                    image_url, category_id, skills,
                    key_features, target_users, challenges, results,
                    future_improvements, tags, keywords, faq
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s
                ) RETURNING id
                """,
                [
                    PROJECT["title"],
                    PROJECT["description"],
                    PROJECT["short_description"],
                    PROJECT["motivation"],
                    PROJECT["goal"],
                    PROJECT["problem_solved"],
                    PROJECT["tech_stack"],
                    PROJECT["architecture"],
                    PROJECT["design_process"],
                    PROJECT["image_url"],
                    category_id,
                    PROJECT["skills"],
                    json.dumps(PROJECT["key_features"]),
                    json.dumps(PROJECT["target_users"]),
                    json.dumps(PROJECT["challenges"]),
                    json.dumps(PROJECT["results"]),
                    json.dumps(PROJECT["future_improvements"]),
                    json.dumps(PROJECT["tags"]),
                    json.dumps(PROJECT["keywords"]),
                    json.dumps(PROJECT["faq"]),
                ],
            )
            new_id = cursor.fetchone()[0]
            logger.info(f"✅ Inserted new project id={new_id}")

        connection.commit()

    logger.info("Re-syncing ChromaDB from updated DB...")
    try:
        from utils.service_registry import get_rag_service
        rag_service = get_rag_service()
        vector_store = rag_service.vector_store

        # Fetch the newly inserted/updated project and add to vector store
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT p.id, p.title, p.description, p.tech_stack, c.name AS category, p.image_url,
                       p.short_description, p.motivation, p.goal, p.problem_solved, p.skills,
                       p.key_features, p.target_users, p.challenges, p.results, p.tags, p.keywords
                FROM projects p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id = %s
                """,
                [project_id],
            )
            row = cursor.fetchone()

        if row:
            proj_id, title, desc, tech, cat, img, short_desc, motivation, goal, problem, skills = row[:11]
            content = (
                f"Project Title: {title}\n"
                f"Short Description: {short_desc or desc}\n"
                f"Category: {cat}\n"
                f"Technologies: {tech}\n"
                f"Skills: {skills}\n"
                f"Goal: {goal}\n"
                f"Problem Solved: {problem}\n"
                f"Motivation: {motivation}\n"
                f"Key Features: {', '.join(PROJECT['key_features'])}\n"
                f"Results: {'; '.join(PROJECT['results'])}\n"
                f"Tags: {', '.join(PROJECT['tags'])}\n"
            )
            doc = {
                "project_id": str(proj_id),
                "title": title,
                "content": content,
                "image_url": img or "",
            }
            vector_store.add_documents([doc])
            logger.info(f"✅ Added/updated ChromaDB document for project id={proj_id}")
    except Exception as e:
        logger.warning(f"ChromaDB sync skipped (not critical): {e}")

    logger.info("🎉 Seed complete!")


if __name__ == "__main__":
    seed()
