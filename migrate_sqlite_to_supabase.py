"""
One-time script: copy data from local SQLite (instance/debrisense.db) to Supabase (PostgreSQL).
Run with: python migrate_sqlite_to_supabase.py
Make sure .env has DATABASE_URL set to your Supabase connection string.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text, MetaData, Table, inspect

# Source: local SQLite
BASE_DIR = Path(__file__).resolve().parent
SQLITE_PATH = BASE_DIR / "instance" / "debrisense.db"
if not SQLITE_PATH.exists():
    print("SQLite database not found at instance/debrisense.db. Nothing to migrate.")
    sys.exit(1)

src_engine = create_engine(f"sqlite:///{SQLITE_PATH}")

# Target: Supabase from .env
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL is not set in .env. Set it to your Supabase URL to migrate.")
    sys.exit(1)
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
dst_engine = create_engine(db_url)

# Tables in dependency order (parents before children)
TABLES = [
    "admins",
    "users",
    "rivers",
    "dri_readings",
    "debris_reports",
    "watchlist",
    "location_requests",
    "alerts",
]


def get_pg_boolean_columns(table_name):
    """Return set of column names that are boolean in PostgreSQL."""
    inspector = inspect(dst_engine)
    booleans = set()
    for col in inspector.get_columns(table_name):
        type_name = col["type"].__class__.__name__.upper()
        if "BOOL" in type_name:
            booleans.add(col["name"])
    return booleans


def migrate_table(table_name):
    """Copy one table from SQLite to PostgreSQL."""
    with src_engine.connect() as src_conn:
        result = src_conn.execute(text(f'SELECT * FROM "{table_name}"'))
        rows = result.fetchall()
        col_names = list(result.keys())
    if not rows:
        return 0
    boolean_cols = get_pg_boolean_columns(table_name)
    # Build INSERT for PostgreSQL; skip rows that already exist (safe to re-run)
    cols = ", ".join(f'"{c}"' for c in col_names)
    placeholders = ", ".join(f":{c}" for c in col_names)
    insert_sql = f'INSERT INTO "{table_name}" ({cols}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING'
    with dst_engine.connect() as dst_conn:
        for row in rows:
            row_dict = dict(zip(col_names, row))
            # SQLite stores booleans as 0/1; PostgreSQL needs real booleans
            for col in boolean_cols:
                if col in row_dict and row_dict[col] is not None:
                    row_dict[col] = bool(row_dict[col])
            dst_conn.execute(text(insert_sql), row_dict)
        dst_conn.commit()
    return len(rows)


def main():
    print("Migrating from SQLite (instance/debrisense.db) to Supabase (PostgreSQL)...")
    # Ensure Supabase tables exist (app creates them on first run)
    # If tables don't exist, we'd need to run the app once against Supabase first.
    inspector = inspect(dst_engine)
    existing = inspector.get_table_names()
    for table in TABLES:
        if table not in existing:
            print(f"  Table '{table}' does not exist in Supabase. Run the app once (python app.py) so tables are created, then run this script again.")
            return
    total = 0
    for table in TABLES:
        try:
            n = migrate_table(table)
            total += n
            print(f"  {table}: {n} rows")
        except Exception as e:
            print(f"  {table}: ERROR - {e}")
            raise
    print(f"Done. Total rows copied: {total}")


if __name__ == "__main__":
    main()
