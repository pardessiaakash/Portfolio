"""
utils/helpers.py

Miscellaneous helper functions used across the project.
"""

import os
import re
import logging
from pathlib import Path

logger = logging.getLogger("services")


def sanitize_project_id(project_id: str) -> str:
    """
    Clean a project_id to ensure it's safe to use as a ChromaDB filter value.
    Removes characters that could cause issues.
    """
    # Allow only alphanumeric, underscores, hyphens
    clean = re.sub(r"[^\w\-]", "_", str(project_id).strip())
    return clean[:128]  # Limit length


def ensure_directory(path: str) -> Path:
    """
    Create a directory (and parents) if it doesn't exist.
    Returns the Path object.
    """
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def format_file_size(size_bytes: int) -> str:
    """
    Format a file size in bytes to a human-readable string.
    E.g., 1048576 → '1.0 MB'
    """
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def truncate_text(text: str, max_length: int = 200) -> str:
    """
    Truncate a string to max_length characters with an ellipsis.
    """
    if len(text) <= max_length:
        return text
    return text[:max_length].rstrip() + "..."
