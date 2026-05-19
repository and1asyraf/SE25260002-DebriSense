// Public map functionality with river markers and DRI display

document.addEventListener('DOMContentLoaded', function() {
    initializePublicMap();
    initializeSidebar();
});

// Expose addRiverMarker globally so admin.js can use it
window.addRiverMarker = addRiverMarker;

function initializePublicMap() {
    // Center map on Malaysia
    const malaysiaCenter = [4.2105, 108.9758];  // Center of Malaysia
    const defaultZoom = 6;
    
    // Create the map
    const map = L.map('map', {
        center: malaysiaCenter,
        zoom: defaultZoom,
        zoomControl: true,
        attributionControl: true
    });
    
    // Make map globally accessible
    window.map = map;
    
    // Add CartoDB Positron (Light Theme) tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        minZoom: 3
    }).addTo(map);
    
    // Load rivers from API
    loadRivers(map);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        map.invalidateSize();
    });
    
    console.log('DebriSense public map initialized successfully');
}

function initializeSidebar() {
    const sidebar = document.getElementById('bottom-sheet');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mapElement = document.getElementById('map');
    
    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        mapElement.classList.remove('bottom-sheet-open');
    }
    
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    // Swipe to expand logic
    const dragHandleContainer = document.createElement('div');
    dragHandleContainer.className = 'sheet-drag-area';
    dragHandleContainer.innerHTML = '<div class="sheet-drag-handle"></div>';
    sidebar.insertBefore(dragHandleContainer, sidebar.firstChild);
    
    let startY = 0;
    let isDragging = false;
    let isExpanded = false;
    
    function onDragStart(e) {
        isDragging = true;
        startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        sidebar.classList.add('dragging');
        
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('touchmove', onDragMove, {passive: false});
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchend', onDragEnd);
    }
    
    function onDragMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        const currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        let newHeightPx = isExpanded ? window.innerHeight - 70 - deltaY : window.innerHeight / 2 - deltaY;
        
        // Limits
        const minHeight = window.innerHeight / 2;
        const maxHeight = window.innerHeight - 70;
        
        if (newHeightPx < minHeight) newHeightPx = minHeight;
        if (newHeightPx > maxHeight) newHeightPx = maxHeight;
        
        sidebar.style.height = `${newHeightPx}px`;
    }
    
    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        sidebar.classList.remove('dragging');
        
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchend', onDragEnd);
        
        const currentHeightPx = parseFloat(sidebar.style.height || 0);
        const threshold = window.innerHeight * 0.7; // 70% of screen height to snap up
        
        sidebar.style.height = ''; // Let CSS take over
        
        if (currentHeightPx > threshold) {
            sidebar.classList.add('expanded');
            isExpanded = true;
        } else {
            sidebar.classList.remove('expanded');
            isExpanded = false;
        }
    }
    
    // Handle click to toggle
    dragHandleContainer.addEventListener('click', () => {
        if (isExpanded) {
            sidebar.classList.remove('expanded');
            isExpanded = false;
        } else {
            sidebar.classList.add('expanded');
            isExpanded = true;
        }
    });
    
    dragHandleContainer.addEventListener('mousedown', onDragStart);
    dragHandleContainer.addEventListener('touchstart', onDragStart, {passive: true});
    
    // Reset state when closed
    const originalCloseSidebar = closeSidebar;
    closeSidebar = function() {
        originalCloseSidebar();
        sidebar.classList.remove('expanded');
        isExpanded = false;
    };
    
    // Re-bind close with the wrapper
    if (closeSidebarBtn) {
        closeSidebarBtn.removeEventListener('click', originalCloseSidebar);
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.removeEventListener('click', originalCloseSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
}

let allRiverMarkers = [];
let userWatchlistIds = new Set();
let isWatchlistFilterActive = false;

function addWatchlistToggleControl(map) {
    const toggleControl = L.control({position: 'topright'});
    
    toggleControl.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'watchlist-toggle-control');
        div.style.backgroundColor = 'white';
        div.style.padding = '8px 12px';
        div.style.borderRadius = '8px';
        div.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        div.style.cursor = 'pointer';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '8px';
        div.style.fontWeight = '600';
        div.style.color = '#2c3e50';
        
        div.innerHTML = `
            <input type="checkbox" id="watchlistToggle" style="cursor: pointer; width: 16px; height: 16px;">
            <label for="watchlistToggle" style="cursor: pointer; margin: 0; user-select: none;">Show Watchlist Only</label>
        `;
        
        L.DomEvent.on(div, 'click', function(e) {
            L.DomEvent.stopPropagation(e);
        });
        
        const checkbox = div.querySelector('#watchlistToggle');
        checkbox.addEventListener('change', (e) => {
            isWatchlistFilterActive = e.target.checked;
            updateMapMarkers(map);
        });
        
        return div;
    };
    
    toggleControl.addTo(map);
}

function updateMapMarkers(map) {
    let visibleMarkers = [];
    allRiverMarkers.forEach(item => {
        if (isWatchlistFilterActive) {
            if (userWatchlistIds.has(item.riverId)) {
                if (!map.hasLayer(item.marker)) {
                    map.addLayer(item.marker);
                }
                visibleMarkers.push(item.marker);
            } else {
                if (map.hasLayer(item.marker)) {
                    map.removeLayer(item.marker);
                }
            }
        } else {
            if (!map.hasLayer(item.marker)) {
                map.addLayer(item.marker);
            }
            visibleMarkers.push(item.marker);
        }
    });
    
    if (visibleMarkers.length > 0) {
        const group = L.featureGroup(visibleMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

async function loadRivers(map) {
    try {
        const response = await fetch('/api/rivers');
        const rivers = await response.json();
        
        // Attempt to fetch watchlist to check if user is NGO
        try {
            const wlResponse = await fetch('/api/ngo/watchlist');
            if (wlResponse.ok) {
                const wlData = await wlResponse.json();
                if (wlData.watchlist) {
                    wlData.watchlist.forEach(w => userWatchlistIds.add(w.river_id));
                }
                addWatchlistToggleControl(map);
            }
        } catch (e) {
            console.log('User is not NGO or watchlist unavailable');
        }
        
        const promises = rivers.map(async river => {
            const marker = await addRiverMarker(map, river);
            allRiverMarkers.push({ marker, riverId: river.id });
        });
        await Promise.all(promises);
        
        // Fit map to show all markers initially
        if (allRiverMarkers.length > 0) {
            const group = L.featureGroup(
                allRiverMarkers.map(m => m.marker)
            );
            map.fitBounds(group.getBounds().pad(0.1));
        }
        
    } catch (error) {
        console.error('Error loading rivers:', error);
    }
}

async function addRiverMarker(map, river) {
    // Create marker
    const marker = L.marker([river.latitude, river.longitude]).addTo(map);
    
    // Store river data for click handler
    let driData = null;
    
    // Fetch DRI data
    try {
        const response = await fetch(`/api/river/${river.id}/dri`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        driData = await response.json();
        
        // Update marker color based on risk
        const iconHtml = `
            <div style="
                background-color: ${driData.risk_color || '#6c757d'};
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
        `;
        
        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        marker.setIcon(customIcon);
        
    } catch (error) {
        console.error(`Error loading DRI for ${river.name}:`, error);
        
        // Use default marker color if DRI fetch fails
        const iconHtml = `
            <div style="
                background-color: #6c757d;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
        `;
        
        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        marker.setIcon(customIcon);
    }
    
    // Always set up click handler
    marker.on('click', function() {
        if (driData && driData.factors) {
            showRiverDetails(river, driData);
        } else {
            // If DRI data not available, fetch it now
            fetch(`/api/river/${river.id}/dri`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    driData = data;
                    showRiverDetails(river, data);
                })
                .catch(err => {
                    console.error('Error fetching DRI on click:', err);
                    alert(`Error loading river data: ${err.message}`);
                });
        }
    });
    
    return marker;
}

async function showRiverDetails(river, driData) {
    // Check if driData is an error response
    if (driData && driData.error) {
        console.error('API returned error:', driData.error);
        alert(`Error loading river data: ${driData.error}`);
        return;
    }
    
    // Validate driData structure
    if (!driData || !driData.factors || !driData.factors.rainfall) {
        console.error('Invalid DRI data structure:', driData);
        alert('Error: Invalid river data received. Please refresh and try again.');
        return;
    }
    
    const sidebar = document.getElementById('bottom-sheet');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mapElement = document.getElementById('map');
    const sidebarName = document.getElementById('sidebar-river-name');
    const sidebarContent = document.getElementById('sidebar-content');
    
    if (!sidebar || !sidebarContent) {
        console.error('Sidebar elements not found!');
        return;
    }
    
    // Show loading state
    sidebarContent.innerHTML = '<div class="sidebar-loading"><div class="spinner"></div><p>Loading river data...</p></div>';
    sidebar.classList.add('active');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');

    // Fetch auth status to determine layers
    let isAuthenticated = false;
    let userRole = null;
    try {
        const sessionRes = await fetch('/api/auth/session', { credentials: 'same-origin' });
        const sessionData = await sessionRes.json();
        isAuthenticated = sessionData.authenticated;
        userRole = sessionData.role;
    } catch (e) {
        console.error('Error fetching session:', e);
    }
    
    // Update sidebar title
    sidebarName.textContent = river.name;
    
    // Build image path (check if image exists)
    const imagePath = river.image ? `/static/img/rivers/${river.image}` : null;
    
    // Generate Contextual Summary
    let summaryText = 'Normal conditions. Debris is within expected baseline levels.';
    if (driData.factors.rainfall.value > 30) {
        summaryText = 'Heavy rainfall is increasing organic debris runoff from surrounding land.';
    } else if (driData.factors.wind_speed.value > 25) {
        summaryText = 'High winds are increasing the accumulation of lightweight plastics.';
    } else if (driData.factors.water_flow.value > 80) {
        summaryText = 'High water flow rate is accelerating the transport of debris downstream.';
    }
    
    let html = '';
    
    // River Image
    if (imagePath) {
        html += `
        <div class="sidebar-section river-image-section">
            <img src="${imagePath}" alt="${river.name}" class="river-image" onerror="this.style.display='none'">
        </div>
        `;
    }
    
    // ==========================================
    // LAYER 1: PUBLIC DASHBOARD (High-Level)
    // ==========================================
    html += `
        <div class="sidebar-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0;">Status</h3>
                <div class="risk-badge" style="background-color: ${driData.risk_color}; margin: 0; padding: 6px 12px; font-size: 14px;">
                    ${driData.risk_level} Risk
                </div>
            </div>
            <div style="background: #f8f9fa; border-left: 4px solid ${driData.risk_color}; padding: 12px; border-radius: 4px; margin-top: 15px;">
                <strong>Summary:</strong> ${summaryText}
            </div>
            <div id="watchlist-btn-container" style="margin-top: 15px;"></div>
        </div>
        
        <div class="sidebar-section">
            <h3>Predicted Debris Breakdown</h3>
            <div style="height: 200px; position: relative;">
                <canvas id="debrisPieChart"></canvas>
            </div>
            <p style="font-size: 12px; color: #6c757d; text-align: center; margin-top: 10px;">
                Breakdown based on ${capitalizeFirst(driData.land_use || 'urban')} baseline & current weather.
            </p>
        </div>
    `;

    // ==========================================
    // LAYER 2: ACTIONABLE INTELLIGENCE (NGOs)
    // ==========================================
    if (isAuthenticated) {
        html += `
        <div class="sidebar-section" style="border-top: 2px dashed #dee2e6; padding-top: 20px;">
            <h3 style="color: #2c3e50;"><span style="font-size:18px;">🔒</span> Actionable Intelligence (NGO)</h3>
            
            <div class="info-row" style="margin-top: 15px; background: #e9fcfa; padding: 10px; border-radius: 8px;">
                <span class="info-label" style="color: #0ca678;">Estimated Daily Payload</span>
                <span class="info-value" style="font-weight: bold; font-size: 16px; color: #087f5b;">${driData.debris_estimate_kg.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg</span>
            </div>
            
            <div class="info-row" style="margin-top: 10px;">
                <span class="info-label">Coordinates</span>
                <span class="info-value">${river.latitude.toFixed(4)}, ${river.longitude.toFixed(4)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Location Type</span>
                <span class="info-value">${river.info}</span>
            </div>
        </div>
        
        <div class="sidebar-section">
            <h4>Raw API Inputs</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                <div class="factor-card" style="margin: 0; padding: 10px;">
                    <div class="factor-name" style="font-size: 11px;">Rainfall</div>
                    <div class="factor-value" style="font-size: 14px;">${driData.factors.rainfall.value} mm</div>
                </div>
                <div class="factor-card" style="margin: 0; padding: 10px;">
                    <div class="factor-name" style="font-size: 11px;">Wind Speed</div>
                    <div class="factor-value" style="font-size: 14px;">${driData.factors.wind_speed.value} kph</div>
                </div>
                <div class="factor-card" style="margin: 0; padding: 10px;">
                    <div class="factor-name" style="font-size: 11px;">Tide Level</div>
                    <div class="factor-value" style="font-size: 14px;">${driData.factors.tide_level.value} m</div>
                </div>
                <div class="factor-card" style="margin: 0; padding: 10px;">
                    <div class="factor-name" style="font-size: 11px;">Water Flow</div>
                    <div class="factor-value" style="font-size: 14px;">${driData.factors.water_flow.value} m³/s</div>
                </div>
            </div>
        </div>
        
        <div class="sidebar-section" id="river-reports-section">
            <h3>📄 Historical Ground-Truth Logs</h3>
            <p style="font-size: 13px; color: #6c757d;">Loading reports...</p>
        </div>
        `;
    }

    html += `
        <div class="sidebar-section" style="border-top: none;">
            <div class="timestamp">
                Last updated: ${new Date(driData.timestamp).toLocaleString()}
            </div>
        </div>
    `;
    
    // Build sidebar content
    sidebarContent.innerHTML = html;

    // Render Pie Chart
    setTimeout(() => {
        const ctx = document.getElementById('debrisPieChart');
        if (ctx) {
            const debrisTypes = driData.debris_types;
            const labels = ['Plastic', 'Organic', 'Household', 'Industrial', 'Others'];
            const keys = ['plastic', 'organic', 'household', 'industrial', 'others'];
            const data = keys.map(k => debrisTypes[k] || 0);
            const colors = ['#3498db', '#27ae60', '#9b59b6', '#e67e22', '#95a5a6'];
            const totalPayload = driData.debris_estimate_kg || 0;
            
            const logisticalHints = {
                'Plastic': 'Requires fine mesh nets & high volunteer count.',
                'Organic': 'Requires rakes, biodegradable bags & composting.',
                'Household': 'Requires flatbed trucks & heavy lifting winches.',
                'Industrial': 'HAZMAT gear may be required. Heavy machinery.',
                'Others': 'Standard cleanup equipment needed.'
            };
            
            const centerTextPlugin = {
                id: 'centerText',
                beforeDraw: function(chart) {
                    if (chart.config.type !== 'doughnut') return;
                    var ctx = chart.ctx;
                    ctx.restore();
                    
                    // The exact center of the doughnut, ignoring the legend
                    var centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                    var centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                    
                    var fontSize = (chart.height / 110).toFixed(2);
                    ctx.font = "bold " + fontSize + "em sans-serif";
                    ctx.textBaseline = "middle";
                    ctx.textAlign = "center";
                    ctx.fillStyle = "#2c3e50";
                
                    var text = totalPayload > 0 ? totalPayload.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " kg" : "N/A";
                    ctx.fillText(text, centerX, centerY + 8);
                    
                    ctx.font = (fontSize * 0.4).toFixed(2) + "em sans-serif";
                    ctx.fillStyle = "#6c757d";
                    ctx.fillText("Total Predicted", centerX, centerY - 12);
                    
                    ctx.save();
                }
            };
            
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 1,
                        cutout: '70%'
                    }]
                },
                plugins: [centerTextPlugin],
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            right: 20 // Extra padding for the legend
                        }
                    },
                    plugins: {
                        legend: { 
                            position: 'right',
                            labels: {
                                boxWidth: 12,
                                font: { size: 11 },
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map(function(label, i) {
                                            const meta = chart.getDatasetMeta(0);
                                            const style = meta.controller.getStyle(i);
                                            const val = data.datasets[0].data[i];
                                            const exactWeight = ((val / 100) * totalPayload).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                                            const isMax = val === Math.max(...data.datasets[0].data);
                                            return {
                                                text: `${label}: ${val}% (${exactWeight}kg) ${isMax ? '⚠️' : ''}`,
                                                fillStyle: style.backgroundColor,
                                                strokeStyle: style.borderColor,
                                                lineWidth: style.borderWidth,
                                                hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const val = context.raw || 0;
                                    const exactWeight = ((val / 100) * totalPayload).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                                    return `${label}: ${val}% (${exactWeight} kg)`;
                                },
                                afterLabel: function(context) {
                                    return '💡 ' + (logisticalHints[context.label] || '');
                                }
                            }
                        }
                    }
                }
            });
        }
    }, 100);

    // Load reports only when the user is logged in
    if (isAuthenticated) {
        loadRiverReportsIfLoggedIn(river.id);
    }
    
    // Load Watchlist Button if Logged In
    if (isAuthenticated && (userRole === 'ngo' || userRole === 'regular')) {
        try {
            const endpoint = userRole === 'ngo' 
                ? `/api/ngo/watchlist/check/${river.id}`
                : `/api/regular/watchlist/check/${river.id}`;
                
            const watchRes = await fetch(endpoint, { credentials: 'same-origin' });
            const watchData = await watchRes.json();
            
            const isWatched = watchData.in_watchlist;
            
            const btnContainer = document.getElementById('watchlist-btn-container');
            if (btnContainer) {
                btnContainer.innerHTML = `
                    <button class="btn-primary" onclick="window.toggleWatchlistFromSidebar(${river.id}, '${userRole}', ${isWatched})" style="width:100%; padding:10px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:8px; border:none; cursor:pointer; background:${isWatched ? '#e74c3c' : '#3498db'}; color:white; transition: 0.2s;">
                        <span style="font-size:18px;">${isWatched ? '🌟' : '⭐'}</span> 
                        ${isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    </button>
                `;
            }
        } catch (e) {
            console.error('Error loading watchlist button:', e);
        }
    }
    
    // On desktop, adjust map size
    if (window.innerWidth > 768 && mapElement) {
        mapElement.classList.add('bottom-sheet-open');
        setTimeout(() => {
            if (window.map) window.map.invalidateSize();
        }, 300);
    }
}

// Global function to toggle watchlist from sidebar
window.toggleWatchlistFromSidebar = async function(riverId, role, isCurrentlyWatched) {
    const action = isCurrentlyWatched ? 'remove' : 'add';
    const endpoint = role === 'ngo'
        ? `/api/ngo/watchlist/${action}`
        : `/api/regular/watchlist/${action}`;
        
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({river_id: riverId})
        });
        const data = await res.json();
        
        if (data.success) {
            // Update button UI
            const newIsWatched = !isCurrentlyWatched;
            const btnContainer = document.getElementById('watchlist-btn-container');
            if (btnContainer) {
                btnContainer.innerHTML = `
                    <button class="btn-primary" onclick="window.toggleWatchlistFromSidebar(${riverId}, '${role}', ${newIsWatched})" style="width:100%; padding:10px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:8px; border:none; cursor:pointer; background:${newIsWatched ? '#e74c3c' : '#3498db'}; color:white; transition: 0.2s;">
                        <span style="font-size:18px;">${newIsWatched ? '🌟' : '⭐'}</span> 
                        ${newIsWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    </button>
                `;
            }
            
            // Optionally dispatch a custom event to notify other scripts (like ngo_features.js or user_dashboard.js)
            window.dispatchEvent(new CustomEvent('watchlistUpdated'));
            
        } else {
            alert(data.error || 'Failed to update watchlist');
        }
    } catch(e) {
        console.error('Error toggling watchlist:', e);
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateDebrisTypesHTML(debrisTypes) {
    if (!debrisTypes) {
        return '<p>No debris data available</p>';
    }
    
    const debrisIcons = {
        plastic: '🥤',
        organic: '🍂',
        household: '🛋️',
        industrial: '🏭',
        others: '📦'
    };
    
    const debrisLabels = {
        plastic: 'Plastic',
        organic: 'Organic',
        household: 'Household',
        industrial: 'Industrial',
        others: 'Others'
    };
    
    const debrisColors = {
        plastic: '#3498db',
        organic: '#27ae60',
        household: '#9b59b6',
        industrial: '#e67e22',
        others: '#95a5a6'
    };
    
    let html = '';
    
    // Sort by percentage (highest first)
    const sorted = Object.entries(debrisTypes).sort((a, b) => b[1] - a[1]);
    
    for (const [type, percentage] of sorted) {
        html += `
            <div class="debris-type-item">
                <div class="debris-type-header">
                    <span class="debris-icon">${debrisIcons[type] || '📦'}</span>
                    <span class="debris-label">${debrisLabels[type] || type}</span>
                    <span class="debris-percentage">${percentage}%</span>
                </div>
                <div class="debris-bar-container">
                    <div class="debris-bar" style="width: ${percentage}%; background-color: ${debrisColors[type] || '#95a5a6'};"></div>
                </div>
            </div>
        `;
    }
    
    return html;
}

function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (c) => {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return map[c] || c;
    });
}

function renderReportCard(report, index) {
    const reporterName = escapeHtml(report.user_name || 'Anonymous NGO');
    const totalAmount = (report.plastic_amount||0) + (report.organic_amount||0) + (report.household_amount||0) + (report.industrial_amount||0) + (report.others_amount||0);
    const amountStr = totalAmount > 0 ? `Collected: ${totalAmount.toFixed(2)} kg` : '';
    const dateStr = escapeHtml(report.reviewed_at || report.reported_at || '');
    const status = escapeHtml(report.status || '');

    return `
        <div class="interactive-report-card" onclick="showReportOverlay(${index})" 
             style="border:1px solid #e9ecef; border-radius:10px; padding:12px; margin-bottom:10px; cursor:pointer; transition:all 0.2s; background:white;"
             onmouseover="this.style.borderColor='#3498db'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)';"
             onmouseout="this.style.borderColor='#e9ecef'; this.style.boxShadow='none'; this.style.transform='none';">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                <div style="font-weight:600; color:#2c3e50; font-size:15px;">👤 ${reporterName}</div>
                ${status ? `<div style="font-size:11px; font-weight:600; padding:3px 8px; border-radius:12px; background:#f8f9fa; color:#6c757d; border:1px solid #e9ecef;">${status.toUpperCase()}</div>` : ``}
            </div>
            ${amountStr ? `<div style="font-size:13px;color:#495057; margin-top:8px;"><strong>${amountStr}</strong></div>` : ``}
            ${dateStr ? `<div style="font-size:12px;color:#adb5bd; margin-top:6px; display:flex; align-items:center; gap:4px;">✅ Approved on: ${dateStr}</div>` : ``}
        </div>
    `;
}

async function loadRiverReportsIfLoggedIn(riverId) {
    const section = document.getElementById('river-reports-section');
    if (!section) return;

    try {
        const sessionRes = await fetch('/api/auth/session', { credentials: 'same-origin' });
        const sessionData = await sessionRes.json();

        if (!sessionData.authenticated) {
            section.innerHTML = `
                <h3>📄 Reports</h3>
                <p style="font-size: 13px; color: #6c757d;">Log in to view reports for this location.</p>
            `;
            return;
        }

        const reportsRes = await fetch(`/api/river/${riverId}/reports`, { credentials: 'same-origin' });
        if (!reportsRes.ok) {
            section.innerHTML = `
                <h3>📄 Reports</h3>
                <p style="font-size: 13px; color: #6c757d;">Error loading reports.</p>
            `;
            return;
        }

        const data = await reportsRes.json();
        const reports = data.reports || [];
        
        window.currentRiverReports = reports;

        if (reports.length === 0) {
            section.innerHTML = `
                <h3>📄 Reports</h3>
                <p style="font-size: 13px; color: #6c757d;">No reports available for this location.</p>
            `;
            return;
        }

        section.innerHTML = `
            <h3>📄 Reports</h3>
            <p style="font-size:12px; color:#6c757d; margin-bottom:12px;">Click on a report to view details and export.</p>
            ${reports.map((r, i) => renderReportCard(r, i)).join('')}
        `;
    } catch (e) {
        section.innerHTML = `
            <h3>📄 Reports</h3>
            <p style="font-size: 13px; color: #6c757d;">Error loading reports.</p>
        `;
        console.error('Error loading river reports:', e);
    }
}

window.showReportOverlay = function(index) {
    const report = window.currentRiverReports[index];
    if (!report) return;
    
    let overlay = document.getElementById('report-detail-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'report-detail-overlay';
        overlay.className = 'modal';
        document.body.appendChild(overlay);
    }
    
    const reporterName = escapeHtml(report.user_name || 'Anonymous NGO');
    const totalAmount = (report.plastic_amount||0) + (report.organic_amount||0) + (report.household_amount||0) + (report.industrial_amount||0) + (report.others_amount||0);
    const amount = totalAmount > 0 ? `${totalAmount.toFixed(2)} kg` : escapeHtml(report.estimated_amount || '');
    const approvedDate = escapeHtml(report.reviewed_at || report.reported_at || '');
    const description = report.description ? escapeHtml(report.description) : 'No description provided.';
    const status = escapeHtml(report.status || '');
    const snapshotHtml = report.snapshot_estimated_payload ? `
        <div style="margin-bottom: 24px;">
            <div style="font-size:12px; font-weight:600; color:#adb5bd; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">System Prediction Snapshot</div>
            <div style="background:#f4f6f8; border:1px solid #ced4da; padding:16px; border-radius:12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center;">
                    <span style="color: #495057; font-size: 14px; font-weight: 600;">Predicted Daily Payload</span>
                    <span style="font-weight: 700; font-size: 16px; color: #d9534f;">${report.snapshot_estimated_payload.toFixed(2)} kg</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #6c757d; border-top: 1px dashed #ced4da; padding-top: 12px;">
                    <div>🌧️ Rain: ${report.snapshot_rainfall ? report.snapshot_rainfall.toFixed(2) : 0} mm</div>
                    <div>💨 Wind: ${report.snapshot_wind_speed ? report.snapshot_wind_speed.toFixed(2) : 0} kph</div>
                    <div>🌊 Tide: ${report.snapshot_tide_level ? report.snapshot_tide_level.toFixed(2) : 0} m</div>
                    <div>💧 Flow: ${report.snapshot_water_flow ? report.snapshot_water_flow.toFixed(2) : 0} m³/s</div>
                </div>
            </div>
        </div>
    ` : '';
    
    const breakdownHtml = `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
            <span style="color: #495057;">🥤 Plastic</span>
            <span style="font-weight: 600;">${report.plastic_amount ? report.plastic_amount.toFixed(2) : 0} kg</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
            <span style="color: #495057;">🍂 Organic</span>
            <span style="font-weight: 600;">${report.organic_amount ? report.organic_amount.toFixed(2) : 0} kg</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
            <span style="color: #495057;">🛋️ Household</span>
            <span style="font-weight: 600;">${report.household_amount ? report.household_amount.toFixed(2) : 0} kg</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
            <span style="color: #495057;">🏭 Industrial</span>
            <span style="font-weight: 600;">${report.industrial_amount ? report.industrial_amount.toFixed(2) : 0} kg</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: #495057;">📦 Others</span>
            <span style="font-weight: 600;">${report.others_amount ? report.others_amount.toFixed(2) : 0} kg</span>
        </div>
    `;
    
    overlay.innerHTML = `
        <div class="modal-content" style="max-width:500px; border-radius:16px; overflow:hidden;">
            <div class="modal-header" style="background:#f8f9fa; border-bottom:1px solid #e9ecef; padding:20px; display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:18px; color:#2c3e50; display:flex; align-items:center; gap:8px;">
                    <span style="font-size:20px;">📋</span> Report Details
                </h2>
                <button class="close-modal" style="background:none; border:none; font-size:24px; color:#6c757d; cursor:pointer;" onclick="document.getElementById('report-detail-overlay').classList.remove('active')">×</button>
            </div>
            <div class="modal-body" style="padding:24px; max-height: 70vh; overflow-y: auto;">
                <div style="margin-bottom: 24px; display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:12px; font-weight:600; color:#adb5bd; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Reporting NGO</div>
                        <h3 style="margin:0; font-size:22px; color:#2c3e50;">👤 ${reporterName}</h3>
                    </div>
                    ${status ? `<span style="font-size:12px; font-weight:600; padding:6px 12px; border-radius:20px; background:#e9fcfa; color:#0ca678; border:1px solid #c3fae8;">${status.toUpperCase()}</span>` : ``}
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background:#f8f9fa; padding:16px; border-radius:12px; border:1px solid #e9ecef;">
                    <div>
                        <div style="font-size:12px; font-weight:600; color:#adb5bd; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Total Collected</div>
                        <div style="font-weight:700; color:#27ae60; font-size: 16px;">${amount || 'N/A'}</div>
                    </div>
                    <div>
                        <div style="font-size:12px; font-weight:600; color:#adb5bd; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Approved Date</div>
                        <div style="font-weight:600; color:#343a40; font-size: 14px;">✅ ${approvedDate || 'N/A'}</div>
                    </div>
                </div>
                ${snapshotHtml}
                
                <div style="margin-bottom: 24px;">
                    <div style="font-size:12px; font-weight:600; color:#adb5bd; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Actual Debris Collected / Cleaned</div>
                    <div style="background:#fff; border:1px solid #ced4da; padding:16px; border-radius:12px;">
                        ${breakdownHtml}
                    </div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <div style="font-size:12px; font-weight:600; color:#adb5bd; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Description</div>
                    <div style="background:#fff; border:1px solid #e9ecef; padding:16px; border-radius:12px; min-height:80px; color:#495057; line-height:1.6; font-size:14px;">${description}</div>
                </div>
                
                <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:12px; align-items:center;">
                    <button type="button" class="btn-secondary" style="padding:10px 20px; border-radius:8px; border:1px solid #ced4da; background:#fff; font-weight:600; cursor:pointer; color:#495057;" onclick="document.getElementById('report-detail-overlay').classList.remove('active')">Close</button>
                    <button type="button" class="btn-primary" style="padding:10px 20px; border-radius:8px; border:none; background:#3498db; color:white; font-weight:600; display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="exportSingleReport(${index})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export to CSV
                    </button>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
    
    if (!document.getElementById('report-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'report-modal-styles';
        style.innerHTML = `
            #report-detail-overlay {
                display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.6); z-index: 10000;
                align-items: center; justify-content: center; backdrop-filter: blur(3px);
                opacity: 0; transition: opacity 0.3s ease;
            }
            #report-detail-overlay.active {
                display: flex; opacity: 1;
            }
            #report-detail-overlay .modal-content {
                transform: translateY(30px) scale(0.95); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                margin: 20px;
            }
            #report-detail-overlay.active .modal-content {
                transform: translateY(0) scale(1);
            }
        `;
        document.head.appendChild(style);
    }
};

window.exportSingleReport = function(index) {
    const report = window.currentRiverReports[index];
    if (!report) return;
    
    const headers = ['Report ID', 'Debris Type', 'Estimated Amount', 'Status', 'Reported At', 'Description'];
    const row = [
        report.id || 'N/A',
        '"' + (report.debris_type || '').replace(/"/g, '""') + '"',
        '"' + (report.estimated_amount || '').replace(/"/g, '""') + '"',
        '"' + (report.status || '').replace(/"/g, '""') + '"',
        '"' + (report.reported_at || '').replace(/"/g, '""') + '"',
        '"' + (report.description || '').replace(/"/g, '""') + '"'
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\\n" + row.join(',');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", "debris_report_" + (report.id || index) + "_" + dateStr + ".csv");
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.addEventListener('watchlistUpdated', async function() {
    try {
        const wlResponse = await fetch('/api/ngo/watchlist');
        if (wlResponse.ok) {
            const wlData = await wlResponse.json();
            if (wlData.watchlist) {
                userWatchlistIds.clear();
                wlData.watchlist.forEach(w => userWatchlistIds.add(w.river_id));
                if (typeof isWatchlistFilterActive !== 'undefined' && typeof updateMapMarkers === 'function' && window.map) {
                    updateMapMarkers(window.map);
                }
            }
        }
    } catch (e) {
        console.error('Error refreshing watchlist for map filter:', e);
    }
});
