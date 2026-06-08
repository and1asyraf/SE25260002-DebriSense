import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, text
from app import app, db

# Load environment variables (this will pull DATABASE_URL from .env)
load_dotenv()

def migrate():
    print("🚀 Starting Migration from local SQLite to Supabase PostgreSQL...")
    
    # Ensure Postgres schema is created
    print("1. Creating database tables in Supabase...")
    with app.app_context():
        db.create_all()
    
    # Database URIs
    sqlite_uri = 'sqlite:///instance/debrisense.db'
    pg_uri = os.environ.get('DATABASE_URL')
    
    if not pg_uri or not pg_uri.startswith('postgres'):
        print("❌ Error: DATABASE_URL is not configured for PostgreSQL in .env!")
        return

    sqlite_engine = create_engine(sqlite_uri)
    pg_engine = create_engine(pg_uri)

    sqlite_meta = MetaData()
    sqlite_meta.reflect(bind=sqlite_engine)

    pg_meta = MetaData()
    pg_meta.reflect(bind=pg_engine)

    # Tables to migrate in order of dependencies
    # We use sqlite_meta.sorted_tables to respect foreign keys
    
    print("\n2. Transferring data...")
    with sqlite_engine.connect() as sqlite_conn:
        with pg_engine.begin() as pg_conn:
            for table in sqlite_meta.sorted_tables:
                print(f"   -> Migrating table: {table.name}")
                
                # Check if table exists in postgres
                if table.name not in pg_meta.tables:
                    print(f"      Skipping {table.name} (not found in target DB)")
                    continue
                
                pg_table = pg_meta.tables[table.name]
                
                # Clear existing data in target table to avoid duplicates during migration
                pg_conn.execute(pg_table.delete())
                
                # Read from SQLite
                rows = sqlite_conn.execute(table.select()).fetchall()
                if rows:
                    # Convert rows to dictionaries
                    data = [dict(row._mapping) for row in rows]
                    
                    # Insert into Postgres
                    pg_conn.execute(pg_table.insert(), data)
                    print(f"      ✅ Inserted {len(data)} rows")
                else:
                    print("      ℹ️ No data to migrate")
                    
            print("\n3. Updating PostgreSQL sequences (auto-increments)...")
            # Postgres needs to know what the next ID should be since we manually inserted IDs
            for table in sqlite_meta.sorted_tables:
                if table.name in pg_meta.tables and 'id' in pg_table.c:
                    try:
                        seq_name = f"{table.name}_id_seq"
                        pg_conn.execute(text(f"SELECT setval('{seq_name}', COALESCE((SELECT MAX(id)+1 FROM {table.name}), 1), false);"))
                        print(f"   -> Reset sequence for {table.name}")
                    except Exception as e:
                        pass # Ignore if sequence doesn't exist
                        
    print("\n🎉 Migration completed successfully!")
    print("Your Supabase database now contains all your local data.")

if __name__ == '__main__':
    migrate()
