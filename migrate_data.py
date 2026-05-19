import os
from sqlalchemy import create_engine, MetaData
from dotenv import load_dotenv

load_dotenv()

# Setup database URLs
sqlite_url = 'sqlite:///c:/Users/User/OneDrive/Documents/Projects Git Hub/CAT404/DebriSense/instance/debrisense.db'
postgres_url = os.environ.get('DATABASE_URL')
if postgres_url and postgres_url.startswith('postgres://'):
    postgres_url = postgres_url.replace('postgres://', 'postgresql://', 1)

print("Connecting to SQLite...")
sqlite_engine = create_engine(sqlite_url)
sqlite_meta = MetaData()
sqlite_meta.reflect(bind=sqlite_engine)

print("Connecting to PostgreSQL (Supabase)...")
pg_engine = create_engine(postgres_url)
pg_meta = MetaData()
pg_meta.reflect(bind=pg_engine)

print("Clearing existing seeded data from Supabase to prevent Primary Key clashes...")
with pg_engine.begin() as pg_conn:
    # Delete in reverse dependency order to respect foreign key constraints
    for table in reversed(sqlite_meta.sorted_tables):
        pg_table = pg_meta.tables.get(table.name)
        if pg_table is not None:
            try:
                pg_conn.execute(pg_table.delete())
                print(f" - Cleared {table.name}")
            except Exception as e:
                print(f" - Error clearing {table.name}: {e}")

print("Beginning Data Transfer...")
for table in sqlite_meta.sorted_tables:
    with sqlite_engine.connect() as sq_conn:
        records = sq_conn.execute(table.select()).fetchall()
        if not records:
            continue
            
        print(f"Migrating {len(records)} records for {table.name}...")
        pg_table = pg_meta.tables.get(table.name)
        if pg_table is None:
            print(f"Table {table.name} not found in Postgres. Skipping.")
            continue
            
        # Extract column names and remap rows into dictionaries
        keys = table.columns.keys()
        data = [dict(zip(keys, row)) for row in records]
        
        # Batch insert into Postgres
        with pg_engine.begin() as pg_conn:
            for row in data:
                try:
                    pg_conn.execute(pg_table.insert(), row)
                except Exception as e:
                    print(f"Error inserting row into {table.name}: {e}")

print("Successfully imported all SQLite data into Supabase Postgres!")
