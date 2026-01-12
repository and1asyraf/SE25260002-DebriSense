// Report Management Module
// Handles hotspot reports, downloads, and management

class ReportManagement {
    constructor() {
        this.reports = [];
        this.filteredReports = [];
        this.selectedReport = null;
        this.map = null;
        this.markers = [];
        this.heatmapLayer = null;
        
        this.init();
    }
    
    init() {
        // Initialize based on user type
        this.userType = this.detectUserType();
        console.log('Report Management initialized for:', this.userType);
    }
    
    detectUserType() {
        if (document.querySelector('.admin-badge')) return 'admin';
        if (document.querySelector('.ngo-badge')) return 'ngo';
        return 'public';
    }
    
    // ====================================
    // Load Reports
    // ====================================
    
    async loadHotspotReports(filters = {}) {
        try {
            const endpoint = this.userType === 'admin' 
                ? '/api/admin/reports' 
                : '/api/ngo/reports';
            
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.success || data.reports) {
                this.reports = data.reports || [];
                this.applyFilters(filters);
                return this.filteredReports;
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            return [];
        }
    }
    
    applyFilters(filters) {
        this.filteredReports = this.reports.filter(report => {
            if (filters.status && filters.status !== 'all' && report.status !== filters.status) {
                return false;
            }
            if (filters.river_id && report.river_id !== parseInt(filters.river_id)) {
                return false;
            }
            if (filters.debris_type && filters.debris_type !== 'all' && report.debris_type !== filters.debris_type) {
                return false;
            }
            if (filters.date_from && report.reported_at < filters.date_from) {
                return false;
            }
            if (filters.date_to && report.reported_at > filters.date_to) {
                return false;
            }
            return true;
        });
    }
    
    // ====================================
    // Render Reports
    // ====================================
    
    renderReportGrid(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (this.filteredReports.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }
        
        container.innerHTML = `
            <div class="reports-grid">
                ${this.filteredReports.map(report => this.createReportCard(report)).join('')}
            </div>
        `;
        
        // Attach event listeners
        this.attachReportCardListeners();
    }
    
    createReportCard(report) {
        const imageUrl = report.photo 
            ? `/static/img/reports/${report.photo}` 
            : null;
        
        return `
            <div class="report-card-detailed" data-report-id="${report.id}">
                ${imageUrl ? `
                    <img src="${imageUrl}" alt="Report" class="report-card-image">
                ` : `
                    <div class="report-card-image no-image">📋</div>
                `}
                
                <div class="report-card-body">
                    <div class="report-card-header-detail">
                        <div>
                            <div class="report-location-name">${report.river_name || 'Unknown Location'}</div>
                            <div class="report-submitter">
                                <span>👤</span> ${report.user_name || 'Anonymous'}
                            </div>
                        </div>
                        <span class="report-status-badge ${report.status}">${report.status}</span>
                    </div>
                    
                    <div class="report-details-grid">
                        <div class="report-detail-item">
                            <span class="report-detail-label">Debris Type</span>
                            <span class="debris-type-badge ${report.debris_type}">${report.debris_type}</span>
                        </div>
                        <div class="report-detail-item">
                            <span class="report-detail-label">Amount</span>
                            <span class="amount-badge ${report.estimated_amount}">${report.estimated_amount}</span>
                        </div>
                    </div>
                    
                    ${report.description ? `
                        <div class="report-description-preview">${this.escapeHtml(report.description)}</div>
                    ` : ''}
                    
                    <div class="report-card-footer">
                        <div class="report-date">
                            <span>📅</span> ${report.reported_at || 'N/A'}
                        </div>
                        <div class="report-actions-quick">
                            <button class="btn-icon-action" onclick="reportManagement.viewReport(${report.id})" title="View Details">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" stroke-width="2"/>
                                    <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="btn-icon-action" onclick="reportManagement.downloadSingleReport(${report.id})" title="Download">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            ${this.userType === 'admin' ? `
                                <button class="btn-icon-action" onclick="reportManagement.editReport(${report.id})" title="Manage">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachReportCardListeners() {
        document.querySelectorAll('.report-card-detailed').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking buttons
                if (e.target.closest('.btn-icon-action')) return;
                
                const reportId = parseInt(card.dataset.reportId);
                this.viewReport(reportId);
            });
        });
    }
    
    getEmptyState() {
        return `
            <div class="empty-state-reports">
                <div class="empty-icon">📋</div>
                <h3>No Reports Found</h3>
                <p>There are no reports matching your current filters.</p>
            </div>
        `;
    }
    
    // ====================================
    // View Report Details
    // ====================================
    
    viewReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) return;
        
        this.selectedReport = report;
        
        // Create modal if it doesn't exist
        if (!document.getElementById('report-detail-modal')) {
            this.createReportDetailModal();
        }
        
        // Populate modal
        this.populateReportDetailModal(report);
        
        // Show modal
        document.getElementById('report-detail-modal').classList.add('active');
    }
    
    createReportDetailModal() {
        const modal = document.createElement('div');
        modal.id = 'report-detail-modal';
        modal.className = 'report-modal';
        modal.innerHTML = `
            <div class="report-modal-content">
                <div class="report-modal-header">
                    <h2>📋 Report Details</h2>
                    <button class="report-modal-close" onclick="reportManagement.closeReportModal()">×</button>
                </div>
                <div class="report-modal-body" id="report-modal-body-content">
                    <!-- Populated dynamically -->
                </div>
                <div class="report-modal-actions">
                    <button class="btn-secondary" onclick="reportManagement.closeReportModal()">Close</button>
                    <button class="btn-export" onclick="reportManagement.downloadSingleReport(${this.selectedReport?.id})">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Download
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    populateReportDetailModal(report) {
        const bodyContent = document.getElementById('report-modal-body-content');
        
        bodyContent.innerHTML = `
            ${report.photo ? `
                <img src="/static/img/reports/${report.photo}" alt="Report Photo" class="report-full-image">
            ` : ''}
            
            <div class="report-info-section">
                <h3>📍 Location Information</h3>
                <div class="report-info-grid">
                    <div class="report-info-item">
                        <label>River/Location</label>
                        <p>${report.river_name || 'Unknown'}</p>
                    </div>
                    <div class="report-info-item">
                        <label>Submitted By</label>
                        <p>${report.user_name || 'Anonymous'}</p>
                    </div>
                    <div class="report-info-item">
                        <label>Report Date</label>
                        <p>${report.reported_at || 'N/A'}</p>
                    </div>
                    <div class="report-info-item">
                        <label>Sighting Date</label>
                        <p>${report.sighting_date || 'Not specified'}</p>
                    </div>
                </div>
            </div>
            
            <div class="report-info-section">
                <h3>🗑️ Debris Information</h3>
                <div class="report-info-grid">
                    <div class="report-info-item">
                        <label>Debris Type</label>
                        <p><span class="debris-type-badge ${report.debris_type}">${report.debris_type}</span></p>
                    </div>
                    <div class="report-info-item">
                        <label>Estimated Amount</label>
                        <p><span class="amount-badge ${report.estimated_amount}">${report.estimated_amount}</span></p>
                    </div>
                    <div class="report-info-item">
                        <label>Status</label>
                        <p><span class="report-status-badge ${report.status}">${report.status}</span></p>
                    </div>
                    <div class="report-info-item">
                        <label>Report ID</label>
                        <p>#${report.id}</p>
                    </div>
                </div>
            </div>
            
            ${report.description ? `
                <div class="report-info-section">
                    <h3>📝 Description</h3>
                    <div class="report-description-full">${this.escapeHtml(report.description)}</div>
                </div>
            ` : ''}
            
            ${report.latitude && report.longitude ? `
                <div class="report-info-section">
                    <h3>🗺️ Map Location</h3>
                    <div class="report-map-preview" id="report-detail-map"></div>
                </div>
            ` : ''}
            
            ${report.admin_notes || this.userType === 'admin' ? `
                <div class="report-info-section">
                    <div class="report-admin-section">
                        <h3>⚙️ Admin Section</h3>
                        ${report.admin_notes ? `
                            <div class="report-admin-notes">${this.escapeHtml(report.admin_notes)}</div>
                        ` : ''}
                        ${this.userType === 'admin' ? `
                            <button class="btn-primary" style="margin-top: 15px;" onclick="reportManagement.editReport(${report.id})">
                                Manage Report
                            </button>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        `;
        
        // Initialize map if coordinates available
        if (report.latitude && report.longitude) {
            setTimeout(() => this.initReportDetailMap(report), 100);
        }
    }
    
    initReportDetailMap(report) {
        const mapContainer = document.getElementById('report-detail-map');
        if (!mapContainer || !window.L) return;
        
        // Clear previous map
        if (this.detailMap) {
            this.detailMap.remove();
        }
        
        // Create new map
        this.detailMap = L.map('report-detail-map').setView([report.latitude, report.longitude], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.detailMap);
        
        // Add marker
        L.marker([report.latitude, report.longitude])
            .addTo(this.detailMap)
            .bindPopup(`<strong>${report.river_name}</strong><br>${report.debris_type} debris`);
    }
    
    closeReportModal() {
        const modal = document.getElementById('report-detail-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        if (this.detailMap) {
            this.detailMap.remove();
            this.detailMap = null;
        }
    }
    
    // ====================================
    // Edit/Manage Report (Admin)
    // ====================================
    
    editReport(reportId) {
        if (this.userType !== 'admin') return;
        
        const report = this.reports.find(r => r.id === reportId);
        if (!report) return;
        
        // Create or show edit modal
        if (!document.getElementById('edit-report-modal')) {
            this.createEditReportModal();
        }
        
        // Populate form
        document.getElementById('edit-report-id').value = report.id;
        document.getElementById('edit-report-status').value = report.status;
        document.getElementById('edit-report-notes').value = report.admin_notes || '';
        
        // Show modal
        document.getElementById('edit-report-modal').classList.add('active');
    }
    
    createEditReportModal() {
        const modal = document.createElement('div');
        modal.id = 'edit-report-modal';
        modal.className = 'report-modal';
        modal.innerHTML = `
            <div class="report-modal-content" style="max-width: 600px;">
                <div class="report-modal-header">
                    <h2>⚙️ Manage Report</h2>
                    <button class="report-modal-close" onclick="reportManagement.closeEditModal()">×</button>
                </div>
                <div class="report-modal-body">
                    <form id="edit-report-form" onsubmit="reportManagement.saveReportEdit(event)">
                        <input type="hidden" id="edit-report-id">
                        
                        <div class="form-group">
                            <label for="edit-report-status">Status</label>
                            <select id="edit-report-status" required style="width: 100%; padding: 10px; border: 2px solid #dee2e6; border-radius: 8px;">
                                <option value="pending">Pending</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-report-notes">Admin Notes</label>
                            <textarea id="edit-report-notes" rows="5" style="width: 100%; padding: 10px; border: 2px solid #dee2e6; border-radius: 8px;" placeholder="Add notes about this report..."></textarea>
                        </div>
                        
                        <div class="report-modal-actions" style="padding: 0; border: none; margin-top: 20px;">
                            <button type="button" class="btn-secondary" onclick="reportManagement.closeEditModal()">Cancel</button>
                            <button type="submit" class="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    async saveReportEdit(event) {
        event.preventDefault();
        
        const reportId = document.getElementById('edit-report-id').value;
        const status = document.getElementById('edit-report-status').value;
        const adminNotes = document.getElementById('edit-report-notes').value;
        
        try {
            const response = await fetch(`/api/admin/reports/${reportId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status,
                    admin_notes: adminNotes
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Report updated successfully!', 'success');
                this.closeEditModal();
                this.closeReportModal();
                
                // Reload reports
                await this.loadHotspotReports();
                this.renderReportGrid('reports-container');
            } else {
                this.showToast(data.error || 'Failed to update report', 'error');
            }
        } catch (error) {
            console.error('Error updating report:', error);
            this.showToast('Error updating report', 'error');
        }
    }
    
    closeEditModal() {
        const modal = document.getElementById('edit-report-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    // ====================================
    // Download Reports
    // ====================================
    
    async downloadSingleReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) return;
        
        // Generate CSV for single report
        const csv = this.generateReportCSV([report]);
        this.downloadCSV(csv, `report_${reportId}_${this.getTimestamp()}.csv`);
        
        this.showToast('Report downloaded successfully!', 'success');
    }
    
    async downloadAllReports(filters = {}) {
        await this.loadHotspotReports(filters);
        
        if (this.filteredReports.length === 0) {
            this.showToast('No reports to download', 'warning');
            return;
        }
        
        const csv = this.generateReportCSV(this.filteredReports);
        this.downloadCSV(csv, `reports_${this.getTimestamp()}.csv`);
        
        this.showToast(`Downloaded ${this.filteredReports.length} reports!`, 'success');
    }
    
    generateReportCSV(reports) {
        const headers = [
            'Report ID',
            'River Name',
            'Submitted By',
            'Debris Type',
            'Estimated Amount',
            'Status',
            'Reported Date',
            'Sighting Date',
            'Latitude',
            'Longitude',
            'Description',
            'Admin Notes'
        ];
        
        const rows = reports.map(report => [
            report.id,
            report.river_name || '',
            report.user_name || '',
            report.debris_type,
            report.estimated_amount,
            report.status,
            report.reported_at || '',
            report.sighting_date || '',
            report.latitude || '',
            report.longitude || '',
            (report.description || '').replace(/"/g, '""'),
            (report.admin_notes || '').replace(/"/g, '""')
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }
    
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // ====================================
    // Hotspot Analytics
    // ====================================
    
    getHotspotStats() {
        const stats = {
            total: this.reports.length,
            pending: this.reports.filter(r => r.status === 'pending').length,
            reviewed: this.reports.filter(r => r.status === 'reviewed').length,
            resolved: this.reports.filter(r => r.status === 'resolved').length,
            thisMonth: 0,
            lastMonth: 0,
            plastic: this.reports.filter(r => r.debris_type === 'plastic').length,
            organic: this.reports.filter(r => r.debris_type === 'organic').length,
            household: this.reports.filter(r => r.debris_type === 'household').length,
            industrial: this.reports.filter(r => r.debris_type === 'industrial').length
        };
        
        // Calculate this month vs last month
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        this.reports.forEach(report => {
            if (!report.reported_at) return;
            const reportDate = new Date(report.reported_at);
            
            if (reportDate >= thisMonthStart) {
                stats.thisMonth++;
            } else if (reportDate >= lastMonthStart && reportDate < thisMonthStart) {
                stats.lastMonth++;
            }
        });
        
        return stats;
    }
    
    renderHotspotStats(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const stats = this.getHotspotStats();
        const change = stats.lastMonth > 0 
            ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)
            : 0;
        
        container.innerHTML = `
            <div class="hotspot-stats">
                <div class="stat-card-hotspot">
                    <div class="stat-icon">📋</div>
                    <div class="stat-label">Total Reports</div>
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-change ${change >= 0 ? 'positive' : 'negative'}">
                        ${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}% this month
                    </div>
                </div>
                
                <div class="stat-card-hotspot">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-label">Pending</div>
                    <div class="stat-value">${stats.pending}</div>
                </div>
                
                <div class="stat-card-hotspot">
                    <div class="stat-icon">✅</div>
                    <div class="stat-label">Reviewed</div>
                    <div class="stat-value">${stats.reviewed}</div>
                </div>
                
                <div class="stat-card-hotspot">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-label">Resolved</div>
                    <div class="stat-value">${stats.resolved}</div>
                </div>
            </div>
        `;
    }
    
    // ====================================
    // Utility Methods
    // ====================================
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }
    
    showToast(message, type = 'success') {
        // Check if there's an existing toast function
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }
        
        // Create simple toast
        let toast = document.getElementById('report-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'report-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#dc3545'};
                color: white;
                padding: 14px 24px;
                border-radius: 25px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                z-index: 9999;
                font-family: 'Poppins', sans-serif;
                font-weight: 500;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    }
}

// Initialize global instance
let reportManagement;

document.addEventListener('DOMContentLoaded', () => {
    reportManagement = new ReportManagement();
    window.reportManagement = reportManagement; // Make available globally
});

