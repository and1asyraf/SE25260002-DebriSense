import os

templates_dir = r"c:\Users\User\OneDrive\Documents\Projects Git Hub\CAT404\DebriSense\templates"

# 1. Update Admin Dashboard
admin_dashboard_path = os.path.join(templates_dir, "admin_dashboard.html")
with open(admin_dashboard_path, 'r', encoding='utf-8') as f:
    ad_content = f.read()

ad_content = ad_content.replace(
    '''<h4>Debris Reports</h4>
                <p>Review debris sighting reports from NGOs</p>
                <a href="{{ url_for('admin_reports') }}" class="action-btn">View Reports</a>''',
    '''<h4>Hotspot Reports</h4>
                <p>Review user-submitted hotspot sighting reports</p>
                <a href="{{ url_for('admin_reports') }}" class="action-btn">Manage Submissions</a>'''
)

ad_content = ad_content.replace(
    '''<h4>Hotspot Reports</h4>
                <p>Advanced hotspot analysis and management</p>
                <a href="{{ url_for('admin_hotspot_reports') }}" class="action-btn">Manage Hotspots</a>''',
    '''<h4>Hotspot Analysis</h4>
                <p>Advanced Debris Risk Index (DRI) analytics</p>
                <a href="{{ url_for('admin_hotspot_reports') }}" class="action-btn">View Analysis</a>'''
)

with open(admin_dashboard_path, 'w', encoding='utf-8') as f:
    f.write(ad_content)


# 2. Update Admin Reports Management (admin_reports.html)
admin_reports_path = os.path.join(templates_dir, "admin_reports.html")
if os.path.exists(admin_reports_path):
    with open(admin_reports_path, 'r', encoding='utf-8') as f:
        ar_content = f.read()
    
    ar_content = ar_content.replace('Debris Reports Management', 'Hotspot Reports Management')
    ar_content = ar_content.replace('<h1>Debris Reports</h1>', '<h1>Hotspot Reports Queue</h1>')
    ar_content = ar_content.replace('debris reports', 'hotspot reports')
    ar_content = ar_content.replace('Debris Report', 'Hotspot Report')
    
    with open(admin_reports_path, 'w', encoding='utf-8') as f:
        f.write(ar_content)


# 3. Update NGO Dashboard (ngo_dashboard.html)
ngo_dashboard_path = os.path.join(templates_dir, "ngo_dashboard.html")
if os.path.exists(ngo_dashboard_path):
    with open(ngo_dashboard_path, 'r', encoding='utf-8') as f:
        ngo_content = f.read()
        
    ngo_content = ngo_content.replace('Report Debris', 'Submit Hotspot Report')
    ngo_content = ngo_content.replace('report debris', 'submit hotspot report')
    ngo_content = ngo_content.replace('Debris Reports', 'Hotspot Reports')
    ngo_content = ngo_content.replace('Debris Report', 'Hotspot Report')
    
    with open(ngo_dashboard_path, 'w', encoding='utf-8') as f:
        f.write(ngo_content)

print("Updated HTML templates with Hotspot Report verbiage")
