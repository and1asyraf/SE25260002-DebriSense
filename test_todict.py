import sys, os
sys.path.insert(0, os.getcwd())
from app import app, db
from models import HotspotReport

def test():
    with app.app_context():
        r = HotspotReport.query.first()
        if r:
            print(r.to_dict())
        else:
            print("No reports")

if __name__ == '__main__':
    test()
