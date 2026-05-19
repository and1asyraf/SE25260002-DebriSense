import sys, os
sys.path.insert(0, os.getcwd())
import random
from datetime import datetime, timedelta

from app import app, db
from models import HotspotReport, User

def generate_random_date(start_date, end_date):
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    if days_between_dates <= 0:
        return end_date
    random_number_of_days = random.randrange(days_between_dates)
    return start_date + timedelta(days=random_number_of_days)

def run_backfill():
    with app.app_context():
        ngo_names = ["Bersih USM", "Zero Waste Malaysia", "EcoKnights"]
        
        users = []
        for name in ngo_names:
            user = User.query.filter_by(ngo_name=name).first()
            if not user:
                user = User(
                    ngo_name=name,
                    email=f"{name.replace(' ', '').lower()}@example.com",
                    is_verified=True
                )
                user.set_password('password123')
                db.session.add(user)
                db.session.flush()
            users.append(user)
        
        db.session.commit()
        
        end_date = datetime(2026, 5, 18)
        start_date = datetime(2025, 1, 1)

        reports = HotspotReport.query.all()
        for report in reports:
            random_user = random.choice(users)
            report.user_id = random_user.id
            
            report.status = 'resolved'
            report.reported_at = generate_random_date(start_date, end_date - timedelta(days=5))
            report.reviewed_at = report.reported_at + timedelta(days=random.randint(1, 4))
            
            total_debris = random.uniform(1000, 6000)
            
            report.plastic_amount = total_debris * random.uniform(0.2, 0.5)
            report.organic_amount = total_debris * random.uniform(0.1, 0.4)
            report.household_amount = total_debris * random.uniform(0.1, 0.3)
            report.industrial_amount = total_debris * random.uniform(0.0, 0.15)
            report.others_amount = total_debris * random.uniform(0.05, 0.1)
            
            if not report.snapshot_estimated_payload:
                report.snapshot_estimated_payload = total_debris * random.uniform(0.8, 1.2)
                report.snapshot_rainfall = random.uniform(0, 20)
                report.snapshot_wind_speed = random.uniform(5, 15)
                report.snapshot_tide_level = random.uniform(0, 2.5)
                report.snapshot_water_flow = random.uniform(50, 100)
                
        db.session.commit()
        print(f"Successfully backfilled {len(reports)} reports.")

if __name__ == '__main__':
    run_backfill()
