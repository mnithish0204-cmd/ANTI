from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# SQLite configuration with thread check disabled for FastAPI async handlers
engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def upgrade_schema():
    """Safely adds missing columns to existing SQLite database without dropping tables or losing data."""
    import sqlite3
    from urllib.parse import urlparse

    # Extract SQLite path
    db_path = settings.DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check and add columns for reports
    report_cols = [row[1] for row in cursor.execute("PRAGMA table_info(reports)").fetchall()]
    new_report_cols = [
        ("private_ownership_attribute", "TEXT DEFAULT ''"),
        ("image_relevance_score", "REAL DEFAULT NULL"),
        ("image_relevance_status", "TEXT DEFAULT NULL"),
    ]
    for col_name, col_type in new_report_cols:
        if col_name not in report_cols:
            cursor.execute(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type};")

    # Check and add columns for matches
    match_cols = [row[1] for row in cursor.execute("PRAGMA table_info(matches)").fetchall()]
    new_match_cols = [
        ("evidence_quality", "TEXT DEFAULT 'Good'"),
        ("supporting_evidence", "TEXT DEFAULT '[]'"),
        ("conflicting_evidence", "TEXT DEFAULT '[]'"),
        ("contradiction_warning", "TEXT DEFAULT NULL"),
        ("verification_status", "TEXT DEFAULT 'not_verified'"),
        ("verification_attempt", "TEXT DEFAULT NULL"),
        ("ownership_verification_result", "TEXT DEFAULT NULL"),
    ]
    for col_name, col_type in new_match_cols:
        if col_name not in match_cols:
            cursor.execute(f"ALTER TABLE matches ADD COLUMN {col_name} {col_type};")

    conn.commit()
    conn.close()

# Run schema upgrade immediately
import os
upgrade_schema()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

