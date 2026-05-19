import re

app_path = r"c:\Users\User\OneDrive\Documents\Projects Git Hub\CAT404\DebriSense\app.py"

with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

route_logic = '''
@app.route('/api/regular/reports/submit', methods=['POST'])
@regular_required
def submit_hotspot_report_regular():
    """Submit a new hotspot report as Regular User"""
    try:
        from datetime import datetime
        import os
        
        if request.content_type and 'multipart/form-data' in request.content_type:
            river_id = int(request.form.get('river_id'))
            debris_type = request.form.get('debris_type')
            estimated_amount = request.form.get('estimated_amount')
            description = request.form.get('description', '')
            latitude = request.form.get('latitude')
            longitude = request.form.get('longitude')
            sighting_date = request.form.get('sighting_date')
            
            photo_filename = None
            if 'photo' in request.files:
                file = request.files['photo']
                if file and file.filename and allowed_file(file.filename):
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    photo_filename = f"report_reg_{current_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
                    
                    report_folder = os.path.join('static', 'img', 'reports')
                    os.makedirs(report_folder, exist_ok=True)
                    file_path = os.path.join(report_folder, photo_filename)
                    file.save(file_path)
        else:
            data = request.get_json()
            river_id = int(data.get('river_id'))
            debris_type = data.get('debris_type')
            estimated_amount = data.get('estimated_amount')
            description = data.get('description', '')
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            sighting_date = data.get('sighting_date')
            photo_filename = None
        
        report = HotspotReport(
            regular_user_id=current_user.id,
            river_id=river_id,
            debris_type=debris_type,
            estimated_amount=estimated_amount,
            description=description,
            photo=photo_filename,
            latitude=float(latitude) if latitude else None,
            longitude=float(longitude) if longitude else None,
            sighting_date=datetime.strptime(sighting_date, '%Y-%m-%d') if sighting_date else None
        )
        db.session.add(report)
        db.session.commit()
        
        # Generate Alerts for NGO Watchlist users
        ngo_watchers = Watchlist.query.filter_by(river_id=river_id).all()
        for w in ngo_watchers:
            alert = Alert(
                user_id=w.user_id,
                alert_type='new_report',
                title='New Hotspot Report',
                message=f'A new {debris_type} hotspot report was submitted for {report.river.name}.',
                river_id=river_id,
                report_id=report.id
            )
            db.session.add(alert)
                
        # Generate Alerts for Regular Watchlist users
        regular_watchers = RegularWatchlist.query.filter_by(river_id=river_id).all()
        for rw in regular_watchers:
            if rw.regular_user_id != current_user.id:
                ralert = RegularAlert(
                    regular_user_id=rw.regular_user_id,
                    alert_type='new_report',
                    title='New Hotspot Report',
                    message=f'A new {debris_type} hotspot report was submitted for {report.river.name}.',
                    river_id=river_id
                )
                db.session.add(ralert)
            
        db.session.commit()
        
        return jsonify({'success': True, 'report': report.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
'''

# We will inject this right before /api/regular/watchlist
content = content.replace("@app.route('/api/regular/watchlist', methods=['GET'])", route_logic + "\n@app.route('/api/regular/watchlist', methods=['GET'])")

# Also replace "New Debris Report" strings remaining from before
content = content.replace("New Debris Report", "New Hotspot Report")
content = content.replace("debris report was submitted", "hotspot report was submitted")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected /api/regular/reports/submit")
