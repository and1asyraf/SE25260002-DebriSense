import sys, os
sys.path.insert(0, os.getcwd())
from app import app, calculate_dri
from models import River

def test():
    with app.app_context():
        # Get first river
        river = River.query.first()
        if river:
            print(f"Testing calculate_dri for {river.name} (ID: {river.id})")
            # Call calculate_dri with empty weather data to use random/fallback weather
            res = calculate_dri(river, None)
            
            print(f"Total Predicted Payload: {res['debris_estimate_kg']} kg")
            print(f"Debris Breakdown: {res['debris_types']}")
        else:
            print("No rivers found.")

if __name__ == '__main__':
    test()
