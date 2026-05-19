import os

js_path = r"c:\Users\User\OneDrive\Documents\Projects Git Hub\CAT404\DebriSense\static\js\ngo_features.js"

addition = """
document.addEventListener('DOMContentLoaded', function() {
    // Watchlist Panel Toggle
    const watchlistToggleBtn = document.getElementById('watchlist-toggle-btn');
    const userPanel = document.getElementById('user-panel');
    if (watchlistToggleBtn && userPanel) {
        watchlistToggleBtn.addEventListener('click', function() {
            userPanel.classList.toggle('active');
        });
    }
});
"""

with open(js_path, 'r', encoding='utf-8') as f:
    content = f.read()

if "watchlistToggleBtn.addEventListener" not in content:
    with open(js_path, 'a', encoding='utf-8') as f:
        f.write(addition)

print("Toggle Appended")
