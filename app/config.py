"""Centralized configuration loaded from environment variables.

Separates configuration from source code. All settings have
sensible defaults for local development.
"""

import os
from pathlib import Path

# Base directory of the project (parent of the `app` package)
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------- Database ----------
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "healthcare.db"))

# ---------- Logging ----------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ---------- CORS ----------
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
]

# ---------- Concurrency ----------
PREDICTION_WORKERS = int(os.getenv("PREDICTION_WORKERS", "3"))

# ---------- Upload ----------
UPLOAD_DIR = BASE_DIR / "temp_uploads"
