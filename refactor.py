import os
import re

app_path = r"c:\Users\User\OneDrive\Documents\Projects Git Hub\CAT404\DebriSense\app.py"

with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace class names
content = content.replace("DebrisReport", "HotspotReport")
content = content.replace("debris_reports", "hotspot_reports")
content = content.replace("debris_report", "hotspot_report")

# Note: We keep "debris_type" or "estimated_amount" as is since that describes the trash, not the report concept itself.
# Admin template targets: admin_reports.html -> admin_hotspot_reports.html
# Wait, actually there's already admin_hotspot_reports.html for the advanced analysis. We will rename admin_reports.html to admin_user_reports.html maybe? Let's leave template names the same for now to avoid breaking routing, we just change the text inside.

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced DebrisReport -> HotspotReport in app.py")
