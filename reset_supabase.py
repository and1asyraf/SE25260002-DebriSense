from app import app, db
from sqlalchemy import text

print("Connecting to Supabase and refreshing schema...")
with app.app_context():
    try:
        # Reflect and drop all existing tables properly to clear old artifacts
        db.reflect()
        db.drop_all()
        print("Dropped all existing tables.")
        
        # Create freshly minted verified tables from models.py
        db.create_all()
        print("Created all new tables defined in models.py.")
        
        print("Database sync completed successfully via SQLAlchemy reflection!")
    except Exception as e:
        print(f"Error during recreation: {e}")
