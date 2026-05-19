document.addEventListener('DOMContentLoaded', function() {
    // User dropdown elements
    const userDropdownBtn = document.getElementById('user-dropdown-btn');
    const userDropdown = userDropdownBtn ? userDropdownBtn.closest('.user-dropdown') : null;
    
    // User dropdown toggle
    if (userDropdownBtn && userDropdown) {
        userDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userDropdown.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }
    
    // User Panel Toggle
    const watchlistToggleBtn = document.getElementById('watchlist-toggle-btn');
    const userPanel = document.getElementById('user-panel');
    if (watchlistToggleBtn && userPanel) {
        watchlistToggleBtn.addEventListener('click', function() {
            userPanel.classList.toggle('active');
        });
    }

    // Initialize regular user features
    if (window.loadWatchlist) window.loadWatchlist();
    if (window.loadAlerts) window.loadAlerts();
    
    window.addEventListener('watchlistUpdated', function() {
        if (window.loadWatchlist) window.loadWatchlist();
    });
});

// ============================================
// Watchlist Functions
// ============================================

window.loadWatchlist = async function() {
    const container = document.getElementById('watchlist-container');
    if (!container) return;
    
    try {
        const response = await fetch('/api/ngo/watchlist');
        const data = await response.json();
        
        if (data.success && data.watchlist.length > 0) {
            container.innerHTML = data.watchlist.map(item => `
                <div class="watchlist-item" data-river-id="${item.river_id}">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; color:#2c3e50;">${item.river_name}</span>
                        <span style="font-size:12px; color:#28a745;">⭐ Watching</span>
                    </div>
                    <div>
                        <button class="btn-icon-small" onclick="window.removeFromWatchlist(${item.river_id})" title="Remove" style="background:none; border:none; cursor:pointer; font-size:16px; opacity:0.6; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
                            ❌
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="font-size:13px; color:#6c757d; text-align:center;">No rivers in watchlist.<br>Add some from the map!</p>';
        }
    } catch (error) {
        console.error('Error loading watchlist:', error);
        container.innerHTML = '<p style="font-size:13px; color:#e74c3c; text-align:center;">Error loading watchlist</p>';
    }
}

window.removeFromWatchlist = async function(riverId) {
    try {
        const response = await fetch('/api/ngo/watchlist/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ river_id: riverId })
        });
        const data = await response.json();
        
        if (data.success) {
            window.loadWatchlist();
            window.dispatchEvent(new CustomEvent('watchlistUpdated'));
            if(document.getElementById('toast')) {
                const toast = document.getElementById('toast');
                toast.querySelector('.toast-message').textContent = 'Removed from watchlist';
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3000);
            }
        }
    } catch (error) {
        console.error('Error removing from watchlist:', error);
    }
}

// ============================================
// Alerts Functions
// ============================================

window.loadAlerts = async function() {
    try {
        const response = await fetch('/api/ngo/alerts');
        const data = await response.json();
        
        const badge = document.getElementById('alert-badge');
        if (badge) {
            if (data.unread_count > 0) {
                badge.textContent = data.unread_count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
        
        const container = document.getElementById('alerts-container');
        if (container && data.alerts) {
            if (data.alerts.length > 0) {
                container.innerHTML = data.alerts.map(alert => `
                    <div class="alert-item ${alert.is_read ? '' : 'unread'}">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <h4 style="margin:0; font-size:15px; color:#2c3e50;">${alert.title}</h4>
                            <span style="font-size:11px; color:#95a5a6;">${alert.created_at}</span>
                        </div>
                        <p style="margin:0; font-size:13px; color:#34495e; line-height:1.4;">${alert.message}</p>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="empty-text" style="font-size:14px; color:#6c757d; text-align:center;">No notifications yet</p>';
            }
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

window.markAllAlertsRead = async function() {
    try {
        const response = await fetch('/api/ngo/alerts/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();
        
        if (data.success) {
            window.loadAlerts();
            if (document.getElementById('toast')) {
                const toast = document.getElementById('toast');
                toast.querySelector('.toast-message').textContent = 'All notifications marked as read';
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3000);
            }
        }
    } catch (error) {
        console.error('Error marking alerts as read:', error);
    }
}

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
                
                const response = await fetch('/api/ngo/reports/submit', {
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
