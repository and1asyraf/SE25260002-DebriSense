import sys, os
sys.path.insert(0, os.getcwd())
import random
from datetime import datetime, timedelta

from app import app, db
from models import HotspotReport, User, River

def generate_random_date(start_date, end_date):
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    if days_between_dates <= 0:
        return end_date
    random_number_of_days = random.randrange(days_between_dates)
    return start_date + timedelta(days=random_number_of_days)

def run_seed():
    with app.app_context():
        # First, ensure NGOs exist
        ngo_names = ["Bersih USM", "Zero Waste Malaysia", "EcoKnights"]
        users = []
        for name in ngo_names:
            user = User.query.filter_by(ngo_name=name).first()
            if not user:
                user = User(
                    ngo_name=name,
                    email=f"{name.replace(' ', '').lower()}@example.com",
                    is_verified=True,
                    role='ngo'
                )
                user.set_password('password123')
                db.session.add(user)
                db.session.flush()
            users.append(user)
        db.session.commit()
        
        # Now get all rivers
        rivers = River.query.all()
        
        # Clear existing reports if any to start fresh
        HotspotReport.query.delete()
        db.session.commit()
        
        end_date = datetime(2026, 5, 18)
        start_date = datetime(2025, 1, 1)

        reports_added = 0
        for river in rivers:
            # Add 2-4 reports per river
            num_reports = random.randint(2, 4)
            for i in range(num_reports):
                random_user = random.choice(users)
                reported_at = generate_random_date(start_date, end_date - timedelta(days=5))
                reviewed_at = reported_at + timedelta(days=random.randint(1, 4))
                
                total_debris = random.uniform(1500, 7500)
                
                lat_offset = random.uniform(-0.02, 0.02)
                lon_offset = random.uniform(-0.02, 0.02)
                
                report = HotspotReport(
                    user_id=random_user.id,
                    river_id=river.id,
                    debris_type='mixed',
                    estimated_amount='large',
                    plastic_amount=total_debris * random.uniform(0.2, 0.5),
                    organic_amount=total_debris * random.uniform(0.1, 0.4),
                    household_amount=total_debris * random.uniform(0.1, 0.3),
                    industrial_amount=total_debris * random.uniform(0.0, 0.15),
                    others_amount=total_debris * random.uniform(0.05, 0.1),
                    snapshot_estimated_payload=total_debris * random.uniform(0.8, 1.2),
                    snapshot_rainfall=random.uniform(0, 20),
                    snapshot_wind_speed=random.uniform(5, 15),
                    snapshot_tide_level=random.uniform(0, 2.5),
                    snapshot_water_flow=random.uniform(50, 100),
                    description=f"Cleanup operation led by {random_user.ngo_name} at {river.name}.",
                    latitude=float(river.latitude) + lat_offset,
                    longitude=float(river.longitude) + lon_offset,
                    status='resolved',
                    reported_at=reported_at,
                    reviewed_at=reviewed_at,
                    sighting_date=reported_at
                )
                db.session.add(report)
                reports_added += 1
                
        db.session.commit()
        print(f"Successfully seeded {reports_added} real reports for {len(rivers)} rivers.")

if __name__ == '__main__':
    run_seed()
