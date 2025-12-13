// NGO Features JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeNGOFeatures();
    loadWatchlist();
    loadAlerts();
    loadRiversForDropdowns();
});

// ============================================
// Initialization
// ============================================

function initializeNGOFeatures() {
    // NGO Tools Sidebar
    const ngoToolsBtn = document.getElementById('ngo-tools-btn');
    const ngoToolsBtnMobile = document.getElementById('ngo-tools-btn-mobile');
    const ngoSidebar = document.getElementById('ngo-sidebar');
    const closeNgoSidebar = document.getElementById('close-ngo-sidebar');
    
    if (ngoToolsBtn) {
        ngoToolsBtn.addEventListener('click', () => toggleNgoSidebar(true));
    }
    if (ngoToolsBtnMobile) {
        ngoToolsBtnMobile.addEventListener('click', () => {
            document.getElementById('mobile-dropdown').classList.remove('active');
            toggleNgoSidebar(true);
        });
    }
    if (closeNgoSidebar) {
        closeNgoSidebar.addEventListener('click', () => toggleNgoSidebar(false));
    }
    
    // Alerts Button
    const alertsBtn = document.getElementById('alerts-btn');
    if (alertsBtn) {
        alertsBtn.addEventListener('click', () => openModal('alerts-modal'));
    }
    
    // Report Debris Modal
    setupModal('report-debris-modal', 'report-debris-btn', 'close-report-modal', 'cancel-report-btn');
    
    // Request Location Modal
    setupModal('request-location-modal', 'request-location-btn', 'close-request-modal', 'cancel-request-btn');
    
    // My Reports Modal
    setupModal('my-reports-modal', 'my-reports-btn', 'close-my-reports-modal', null, loadMyReports);
    
    // My Requests Modal
    setupModal('my-requests-modal', 'my-requests-btn', 'close-my-requests-modal', null, loadMyRequests);
    
    // Export Modal
    setupModal('export-modal', 'export-data-btn', 'close-export-modal');
    
    // Alerts Modal
    document.getElementById('close-alerts-modal')?.addEventListener('click', () => closeModal('alerts-modal'));
    
    // History Modal
    document.getElementById('close-history-modal')?.addEventListener('click', () => closeModal('history-modal'));
    
    // Form Submissions
    document.getElementById('report-debris-form')?.addEventListener('submit', submitDebrisReport);
    document.getElementById('request-location-form')?.addEventListener('submit', submitLocationRequest);
    
    // Export Buttons
    document.getElementById('export-watchlist-btn')?.addEventListener('click', exportWatchlistData);
    document.getElementById('export-river-btn')?.addEventListener('click', exportRiverData);
    
    // Mark All Read
    document.getElementById('mark-all-read-btn')?.addEventListener('click', markAllAlertsRead);
}

function setupModal(modalId, openBtnId, closeBtnId, cancelBtnId, onOpenCallback) {
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = document.getElementById(closeBtnId);
    const cancelBtn = cancelBtnId ? document.getElementById(cancelBtnId) : null;
    
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            openModal(modalId);
            if (onOpenCallback) onOpenCallback();
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(modalId));
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal(modalId));
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modalId);
        });
    }
}

function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

function toggleNgoSidebar(show) {
    const sidebar = document.getElementById('ngo-sidebar');
    if (sidebar) {
        if (show) {
            sidebar.classList.add('active');
        } else {
            sidebar.classList.remove('active');
        }
    }
}

// ============================================
// Toast Notification
// ============================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const toastMessage = toast.querySelector('.toast-message') || toast;
    toastMessage.textContent = message;
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// Load Rivers for Dropdowns
// ============================================

async function loadRiversForDropdowns() {
    try {
        const response = await fetch('/api/rivers');
        const rivers = await response.json();
        
        const reportSelect = document.getElementById('report-river');
        const exportSelect = document.getElementById('export-river-select');
        
        rivers.forEach(river => {
            const option = document.createElement('option');
            option.value = river.id;
            option.textContent = river.name;
            
            if (reportSelect) reportSelect.appendChild(option.cloneNode(true));
            if (exportSelect) exportSelect.appendChild(option.cloneNode(true));
        });
    } catch (error) {
        console.error('Error loading rivers:', error);
    }
}

// ============================================
// Watchlist Functions
// ============================================

async function loadWatchlist() {
    const container = document.getElementById('watchlist-container');
    if (!container) return;
    
    try {
        const response = await fetch('/api/ngo/watchlist');
        const data = await response.json();
        
        if (data.success && data.watchlist.length > 0) {
            container.innerHTML = data.watchlist.map(item => `
                <div class="watchlist-item" data-river-id="${item.river_id}">
                    <div class="watchlist-info">
                        <span class="watchlist-name">${item.river_name}</span>
                        <span class="watchlist-status">Watching</span>
                    </div>
                    <div class="watchlist-actions">
                        <button class="btn-icon-small" onclick="viewRiverHistory(${item.river_id})" title="View History">
                            📊
                        </button>
                        <button class="btn-icon-small" onclick="removeFromWatchlist(${item.river_id})" title="Remove">
                            ❌
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="empty-text">No rivers in watchlist. Click on a river marker and add it to your watchlist!</p>';
        }
    } catch (error) {
        console.error('Error loading watchlist:', error);
        container.innerHTML = '<p class="error-text">Error loading watchlist</p>';
    }
}

async function addToWatchlist(riverId) {
    try {
        const response = await fetch('/api/ngo/watchlist/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ river_id: riverId })
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('Added to watchlist!');
            loadWatchlist();
            return true;
        } else {
            showToast(data.error || 'Failed to add to watchlist', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        showToast('Error adding to watchlist', 'error');
        return false;
    }
}

async function removeFromWatchlist(riverId) {
    try {
        const response = await fetch('/api/ngo/watchlist/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ river_id: riverId })
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('Removed from watchlist');
            loadWatchlist();
        } else {
            showToast(data.error || 'Failed to remove', 'error');
        }
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        showToast('Error removing from watchlist', 'error');
    }
}

// Make functions globally available
window.addToWatchlist = addToWatchlist;
window.removeFromWatchlist = removeFromWatchlist;

// ============================================
// Alerts Functions
// ============================================

async function loadAlerts() {
    try {
        const response = await fetch('/api/ngo/alerts');
        const data = await response.json();
        
        // Update badge
        const badge = document.getElementById('alert-badge');
        if (badge) {
            if (data.unread_count > 0) {
                badge.textContent = data.unread_count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
        // Update alerts container
        const container = document.getElementById('alerts-container');
        if (container && data.alerts) {
            if (data.alerts.length > 0) {
                container.innerHTML = data.alerts.map(alert => `
                    <div class="alert-item ${alert.is_read ? '' : 'unread'}">
                        <div class="alert-icon">${getAlertIcon(alert.alert_type)}</div>
                        <div class="alert-content">
                            <h4>${alert.title}</h4>
                            <p>${alert.message}</p>
                            <span class="alert-time">${alert.created_at}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="empty-text">No notifications yet</p>';
            }
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

function getAlertIcon(type) {
    const icons = {
        'dri_high': '⚠️',
        'dri_critical': '🚨',
        'report_reviewed': '✅',
        'request_approved': '🎉',
        'request_rejected': '❌'
    };
    return icons[type] || '🔔';
}

async function markAllAlertsRead() {
    try {
        const response = await fetch('/api/ngo/alerts/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();
        
        if (data.success) {
            loadAlerts();
            showToast('All notifications marked as read');
        }
    } catch (error) {
        console.error('Error marking alerts as read:', error);
    }
}

// ============================================
// Debris Report Functions
// ============================================

async function submitDebrisReport(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/ngo/reports/submit', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('Debris report submitted successfully!');
            closeModal('report-debris-modal');
            form.reset();
        } else {
            showToast(data.error || 'Failed to submit report', 'error');
        }
    } catch (error) {
        console.error('Error submitting report:', error);
        showToast('Error submitting report', 'error');
    }
}

async function loadMyReports() {
    const container = document.getElementById('my-reports-container');
    if (!container) return;
    
    try {
        const response = await fetch('/api/ngo/reports');
        const data = await response.json();
        
        if (data.success && data.reports.length > 0) {
            container.innerHTML = `
                <div class="reports-list">
                    ${data.reports.map(report => `
                        <div class="report-card">
                            <div class="report-header">
                                <span class="report-river">${report.river_name}</span>
                                <span class="report-status status-${report.status}">${report.status}</span>
                            </div>
                            <div class="report-details">
                                <p><strong>Type:</strong> ${report.debris_type}</p>
                                <p><strong>Amount:</strong> ${report.estimated_amount}</p>
                                <p><strong>Date:</strong> ${report.reported_at}</p>
                                ${report.description ? `<p><strong>Description:</strong> ${report.description}</p>` : ''}
                                ${report.admin_notes ? `<p class="admin-notes"><strong>Admin Notes:</strong> ${report.admin_notes}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '<p class="empty-text">You haven\'t submitted any debris reports yet.</p>';
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        container.innerHTML = '<p class="error-text">Error loading reports</p>';
    }
}

// ============================================
// Location Request Functions
// ============================================

async function submitLocationRequest(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/ngo/requests/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('Location request submitted successfully!');
            closeModal('request-location-modal');
            form.reset();
        } else {
            showToast(result.error || 'Failed to submit request', 'error');
        }
    } catch (error) {
        console.error('Error submitting request:', error);
        showToast('Error submitting request', 'error');
    }
}

async function loadMyRequests() {
    const container = document.getElementById('my-requests-container');
    if (!container) return;
    
    try {
        const response = await fetch('/api/ngo/requests');
        const data = await response.json();
        
        if (data.success && data.requests.length > 0) {
            container.innerHTML = `
                <div class="requests-list">
                    ${data.requests.map(req => `
                        <div class="request-card">
                            <div class="request-header">
                                <span class="request-name">${req.location_name}</span>
                                <span class="request-status status-${req.status}">${req.status}</span>
                            </div>
                            <div class="request-details">
                                <p><strong>Coordinates:</strong> ${req.latitude}, ${req.longitude}</p>
                                <p><strong>Land Use:</strong> ${req.land_use}</p>
                                <p><strong>Reason:</strong> ${req.reason}</p>
                                <p><strong>Submitted:</strong> ${req.requested_at}</p>
                                ${req.admin_response ? `<p class="admin-response"><strong>Admin Response:</strong> ${req.admin_response}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '<p class="empty-text">You haven\'t submitted any location requests yet.</p>';
        }
    } catch (error) {
        console.error('Error loading requests:', error);
        container.innerHTML = '<p class="error-text">Error loading requests</p>';
    }
}

// ============================================
// Historical Data & Charts
// ============================================

let driChart = null;

async function viewRiverHistory(riverId) {
    openModal('history-modal');
    
    try {
        const response = await fetch(`/api/ngo/river/${riverId}/history?days=30`);
        const data = await response.json();
        
        if (data.success) {
            renderDRIChart(data.river_name, data.readings);
            renderHistoryStats(data);
        } else {
            showToast('Error loading history', 'error');
        }
    } catch (error) {
        console.error('Error loading river history:', error);
        showToast('Error loading history', 'error');
    }
}

function renderDRIChart(riverName, readings) {
    const ctx = document.getElementById('dri-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (driChart) {
        driChart.destroy();
    }
    
    const labels = readings.map(r => r.recorded_at.split(' ')[0]);
    const scores = readings.map(r => r.dri_score);
    const colors = readings.map(r => getRiskColor(r.risk_level));
    
    driChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'DRI Score',
                data: scores,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: colors,
                pointBorderColor: colors,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `DRI History - ${riverName}`,
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'DRI Score'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

function getRiskColor(riskLevel) {
    const colors = {
        'Very Low': '#28a745',
        'Low': '#90EE90',
        'Medium': '#ffc107',
        'High': '#fd7e14',
        'Critical': '#dc3545'
    };
    return colors[riskLevel] || '#6c757d';
}

function renderHistoryStats(data) {
    const container = document.getElementById('history-stats');
    if (!container || !data.readings.length) return;
    
    const scores = data.readings.map(r => r.dri_score);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    const max = Math.max(...scores).toFixed(2);
    const min = Math.min(...scores).toFixed(2);
    
    container.innerHTML = `
        <div class="stat-card">
            <span class="stat-label">Average DRI</span>
            <span class="stat-value">${avg}</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Highest DRI</span>
            <span class="stat-value">${max}</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Lowest DRI</span>
            <span class="stat-value">${min}</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Total Readings</span>
            <span class="stat-value">${data.readings.length}</span>
        </div>
    `;
}

window.viewRiverHistory = viewRiverHistory;

// ============================================
// Export Functions
// ============================================

function exportWatchlistData() {
    const days = document.getElementById('export-days').value;
    window.location.href = `/api/ngo/export/watchlist?days=${days}`;
    showToast('Downloading watchlist data...');
}

function exportRiverData() {
    const riverId = document.getElementById('export-river-select').value;
    if (!riverId) {
        showToast('Please select a river', 'error');
        return;
    }
    const days = document.getElementById('export-days').value;
    window.location.href = `/api/ngo/export/river/${riverId}?days=${days}`;
    showToast('Downloading river data...');
}

