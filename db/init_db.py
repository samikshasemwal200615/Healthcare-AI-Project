"""Database schema initialization.

Reads schema.sql and executes it to create tables and indexes.
Uses CREATE TABLE IF NOT EXISTS for idempotent, repeatable initialization.
"""

import logging
from pathlib import Path

from db.connection import DatabaseManager

logger = logging.getLogger("healthcare.db")

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def initialize_database(db: DatabaseManager) -> None:
    """Initialize the database schema from schema.sql.

    Safe to call on every startup — IF NOT EXISTS clauses
    ensure no duplicate tables are created.
    """
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    db.execute_script(schema_sql)
    logger.info("Database schema initialized successfully")

    # Seed demonstration data if tables are empty
    try:
        from db.seed_demo_data import seed_database_if_empty
        seed_database_if_empty(db)
    except Exception as e:
        logger.warning(f"Could not seed demo data: {e}")

