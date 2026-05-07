import os
from pathlib import Path

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./relay.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def data_root() -> Path:
    here = Path(__file__).resolve()
    return here.parents[3] / "data"


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    if DATABASE_URL.startswith("sqlite"):
        ensure_sqlite_columns()


def ensure_sqlite_columns() -> None:
    incident_columns = {
        "care_domain": "TEXT",
        "required_fields_json": "TEXT NOT NULL DEFAULT '[]'",
        "unsafe_claims_json": "TEXT NOT NULL DEFAULT '[]'",
        "source_assertions_json": "TEXT NOT NULL DEFAULT '[]'",
        "conflicts_json": "TEXT NOT NULL DEFAULT '[]'",
        "handoff_status": "TEXT",
    }
    with engine.begin() as connection:
        existing = {row[1] for row in connection.execute(text("PRAGMA table_info(incident)"))}
        for column, ddl in incident_columns.items():
            if column not in existing:
                connection.execute(text(f"ALTER TABLE incident ADD COLUMN {column} {ddl}"))


def get_session():
    with Session(engine) as session:
        yield session
