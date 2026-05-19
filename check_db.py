import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
sqlite_url = 'sqlite:///c:/Users/User/OneDrive/Documents/Projects Git Hub/CAT404/DebriSense/debrisense.db'
postgres_url = os.environ.get('DATABASE_URL')
if postgres_url and postgres_url.startswith('postgres://'):
    postgres_url = postgres_url.replace('postgres://', 'postgresql://', 1)

sq_engine = create_engine(sqlite_url)
pg_engine = create_engine(postgres_url)

print("----- SQLITE -----")
try:
    with sq_engine.connect() as conn:
        for t in ['users', 'admin_users', 'regular_users', 'rivers', 'hotspot_reports']:
            res = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"{t}: {res}")
except Exception as e:
    print(f"Error querying SQLite: {e}")

print("\n----- POSTGRES (SUPABASE) -----")
try:
    with pg_engine.connect() as conn:
        for t in ['users', 'admin_users', 'regular_users', 'rivers', 'hotspot_reports']:
            res = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"{t}: {res}")
except Exception as e:
    print(f"Error querying Postgres: {e}")
