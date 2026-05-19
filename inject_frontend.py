import os

user_dashboard_path = r"c:\Users\User\OneDrive\Documents\Projects Git Hub\CAT404\DebriSense\templates\user_dashboard.html"
with open(user_dashboard_path, 'r', encoding='utf-8') as f:
    ud_content = f.read()

modal_html = """
    <!-- Report Hotspot Modal -->
    <div class="modal report-modal" id="report-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:10000; align-items:center; justify-content:center; backdrop-filter:blur(3px);">
        <div class="modal-content" style="background:white; border-radius:16px; width:90%; max-width:500px; max-height:90vh; overflow-y:auto; padding:0; transform: translateY(0);">
            <div class="modal-header" style="padding:20px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; border-radius:16px 16px 0 0;">
                <h2 style="margin:0; font-size:18px; display:flex; align-items:center; gap:8px;"><span>📌</span> Submit Hotspot Report</h2>
                <button class="close-modal" onclick="document.getElementById('report-modal').style.display='none'" style="background:none; border:none; font-size:24px; cursor:pointer; color:#6c757d;">×</button>
            </div>
            <div class="modal-body" style="padding:24px;">
                <form id="report-form">
                    <input type="hidden" id="report-river-id" name="river_id">
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block; margin-bottom:5px; font-weight:600; color:#2c3e50; font-size:14px;">Location</label>
                        <input type="text" id="report-river-name" disabled style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid #ced4da; background:#e9ecef; color:#495057;">
                    </div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block; margin-bottom:5px; font-weight:600; color:#2c3e50; font-size:14px;">Debris Type *</label>
                        <select id="report-debris-type" name="debris_type" required style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid #ced4da; font-family:inherit;">
                            <option value="">-- Select Type --</option>
                            <option value="plastic">Plastic (bottles, bags, packaging)</option>
                            <option value="organic">Organic (branches, leaves)</option>
                            <option value="household">Household (furniture, appliances)</option>
                            <option value="industrial">Industrial (chemicals, construction)</option>
                            <option value="mixed">Mixed Types</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block; margin-bottom:5px; font-weight:600; color:#2c3e50; font-size:14px;">Estimated Amount *</label>
                        <select id="report-amount" name="estimated_amount" required style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid #ced4da; font-family:inherit;">
                            <option value="">-- Select Amount --</option>
                            <option value="small">Small (< 10 kg)</option>
                            <option value="medium">Medium (10-50 kg)</option>
                            <option value="large">Large (50-200 kg)</option>
                            <option value="massive">Massive (> 200 kg)</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block; margin-bottom:5px; font-weight:600; color:#2c3e50; font-size:14px;">Description</label>
                        <textarea id="report-desc" name="description" rows="3" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid #ced4da; font-family:inherit; resize:vertical;"></textarea>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="display:block; margin-bottom:5px; font-weight:600; color:#2c3e50; font-size:14px;">Photo (Optional)</label>
                        <input type="file" id="report-photo" name="photo" accept="image/*" style="width:100%; padding:8px 0;">
                    </div>
                    
                    <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                        <button type="button" onclick="document.getElementById('report-modal').style.display='none'" style="padding:10px 16px; border-radius:8px; border:1px solid #ced4da; background:white; cursor:pointer; font-weight:500;">Cancel</button>
                        <button type="submit" style="padding:10px 20px; border-radius:8px; border:none; background:#3498db; color:white; font-weight:600; cursor:pointer; box-shadow:0 4px 6px rgba(52,152,219,0.2);">Submit Report</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
"""

ud_content = ud_content.replace('<!-- Alerts Modal -->', modal_html + '\n    <!-- Alerts Modal -->')
with open(user_dashboard_path, 'w', encoding='utf-8') as f:
    f.write(ud_content)

js_path = r"c:\Users\User\OneDrive\Documents\Projects Git Hub\CAT404\DebriSense\static\js\user_dashboard.js"
with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

js_addition = """
// ============================================
// Report Submission
// ============================================
window.openReportModal = function(riverId, riverName) {
    if(document.getElementById('report-river-id')) {
        document.getElementById('report-river-id').value = riverId;
        document.getElementById('report-river-name').value = riverName;
        document.getElementById('report-form').reset();
        document.getElementById('report-modal').style.display = 'flex';
    } else {
        alert("Please log in to submit reports.");
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
            
            try {
                const formData = new FormData(this);
                const today = new Date().toISOString().split('T')[0];
                formData.append('sighting_date', today);
                
                const response = await fetch('/api/regular/reports/submit', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if (data.success) {
                    document.getElementById('report-modal').style.display = 'none';
                    if(document.getElementById('toast')) {
                        const toast = document.getElementById('toast');
                        toast.querySelector('.toast-message').textContent = 'Hotspot Report Submitted Successfully!';
                        toast.classList.add('show');
                        setTimeout(() => toast.classList.remove('show'), 3000);
                    }
                } else {
                    alert('Error submitting report: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Connection error while submitting report.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
"""

if "window.openReportModal =" not in js_content:
    with open(js_path, 'a', encoding='utf-8') as f:
        f.write(js_addition)

map_path = r"c:\Users\User\OneDrive\Documents\Projects Git Hub\CAT404\DebriSense\static\js\public_map.js"
with open(map_path, 'r', encoding='utf-8') as f:
    map_content = f.read()

# Let's inject the submit report button into public_map right after where watchlist is rendered
w_target = "                sidebarContent.innerHTML += `"
injection = """                // Add Submit Report Button
                sidebarContent.innerHTML += `
                    <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                        <button style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; background: #2c3e50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-family: 'Poppins', sans-serif; transition: all 0.2s;" onclick="if(window.openReportModal) { window.openReportModal(${river.id}, '${river.name.replace(/'/g, "\\\\'")}') } else { alert('Feature only available from User Dashboard') }" onmouseover="this.style.background='#1a252f';" onmouseout="this.style.background='#2c3e50';">
                            <span>📌</span> Submit Hotspot Report Here
                        </button>
                    </div>
                `;
                
                sidebarContent.innerHTML += `"""

if "Submit Hotspot Report Here" not in map_content:
    map_content = map_content.replace(w_target, injection)
    with open(map_path, 'w', encoding='utf-8') as f:
        f.write(map_content)

print("Injected frontend elements")
