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
    const sidebar = document.getElementById('river-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mapElement = document.getElementById('map');
    
    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        mapElement.classList.remove('sidebar-open');
    }
    
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
}

async function loadRivers(map) {
    try {
        const response = await fetch('/api/rivers');
        const rivers = await response.json();
        
        rivers.forEach(river => {
            addRiverMarker(map, river);
        });
        
        // Fit map to show all markers
        if (rivers.length > 0) {
            const group = L.featureGroup(
                rivers.map(r => L.marker([r.latitude, r.longitude]))
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
}

function showRiverDetails(river, driData) {
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
    
    const sidebar = document.getElementById('river-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mapElement = document.getElementById('map');
    const sidebarName = document.getElementById('sidebar-river-name');
    const sidebarContent = document.getElementById('sidebar-content');
    
    if (!sidebar || !sidebarContent) {
        console.error('Sidebar elements not found!');
        return;
    }
    
    // Update sidebar title
    sidebarName.textContent = river.name;
    
    // Build image path (check if image exists)
    const imagePath = river.image ? `/static/img/rivers/${river.image}` : null;
    
    // Build sidebar content
    sidebarContent.innerHTML = `
        <!-- River Image Section -->
        ${imagePath ? `
        <div class="sidebar-section river-image-section">
            <img src="${imagePath}" alt="${river.name}" class="river-image" onerror="this.style.display='none'">
        </div>
        ` : ''}
        
        <!-- River Details Section -->
        <div class="sidebar-section">
            <h3>📍 River Information</h3>
            <div class="info-row">
                <span class="info-label">Location</span>
                <span class="info-value">${river.info}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Coordinates</span>
                <span class="info-value">${river.latitude.toFixed(4)}, ${river.longitude.toFixed(4)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Date Added</span>
                <span class="info-value">${river.date_added}</span>
            </div>
        </div>
        
        <!-- DRI Score Section -->
        <div class="sidebar-section">
            <h3>🎯 Debris Risk Index (DRI)</h3>
            <div class="dri-score" style="color: ${driData.risk_color};">
                ${driData.dri_score}
            </div>
            <div class="risk-badge" style="background-color: ${driData.risk_color};">
                ${driData.risk_level} Risk
            </div>
        </div>
        
        <!-- Weather Data Section -->
        <div class="sidebar-section">
            <h3>🌤️ Weather Conditions</h3>
            <div class="factor-card">
                <div class="factor-header">
                    <span class="factor-name">Rainfall</span>
                    <span class="factor-weight">Weight: ${driData.factors.rainfall.weight}</span>
                </div>
                <div class="factor-value">${driData.factors.rainfall.value} mm</div>
                <div class="factor-normalized">Normalized Score: ${driData.factors.rainfall.normalized}</div>
            </div>
            
            <div class="factor-card">
                <div class="factor-header">
                    <span class="factor-name">Wind Speed</span>
                    <span class="factor-weight">Weight: ${driData.factors.wind_speed.weight}</span>
                </div>
                <div class="factor-value">${driData.factors.wind_speed.value} kph</div>
                <div class="factor-normalized">Normalized Score: ${driData.factors.wind_speed.normalized}</div>
            </div>
        </div>
        
        <!-- Sensor Data Section -->
        <div class="sidebar-section">
            <h3>📊 Sensor Readings</h3>
            <div class="factor-card">
                <div class="factor-header">
                    <span class="factor-name">Tide Level</span>
                    <span class="factor-weight">Weight: ${driData.factors.tide_level.weight}</span>
                </div>
                <div class="factor-value">${driData.factors.tide_level.value} m</div>
                <div class="factor-normalized">Normalized Score: ${driData.factors.tide_level.normalized}</div>
            </div>
            
            <div class="factor-card">
                <div class="factor-header">
                    <span class="factor-name">Water Flow Rate</span>
                    <span class="factor-weight">Weight: ${driData.factors.water_flow.weight}</span>
                </div>
                <div class="factor-value">${driData.factors.water_flow.value} m³/s</div>
                <div class="factor-normalized">Normalized Score: ${driData.factors.water_flow.normalized}</div>
            </div>
        </div>
        
        <!-- Debris Prediction Section -->
        <div class="sidebar-section">
            <h3>🗑️ Debris Accumulation Prediction</h3>
            <div class="debris-estimate">
                <h4>Estimated Daily Debris</h4>
                <div class="debris-amount">${driData.debris_estimate_kg.toLocaleString()} kg</div>
                <p style="font-size: 12px; margin-top: 8px; opacity: 0.9;">
                    Based on DRI score and Klang River baseline data
                </p>
            </div>
        </div>
        
        <!-- Debris Types Section -->
        <div class="sidebar-section">
            <h3>🏷️ Predicted Debris Types</h3>
            <div class="land-use-badge">
                <span class="land-use-label">Land Use:</span>
                <span class="land-use-value">${capitalizeFirst(driData.land_use || 'urban')}</span>
            </div>
            <div class="debris-types-container">
                ${generateDebrisTypesHTML(driData.debris_types)}
            </div>
            <p class="debris-note">
                * Percentages adjusted based on current weather conditions
            </p>
        </div>
        
        <div class="sidebar-section">
            <div class="timestamp">
                Last updated: ${new Date(driData.timestamp).toLocaleString()}
            </div>
        </div>
    `;
    
    // Show sidebar
    sidebar.classList.add('active');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
    
    // On desktop, adjust map size
    if (window.innerWidth > 768 && mapElement) {
        mapElement.classList.add('sidebar-open');
        setTimeout(() => {
            if (window.map) window.map.invalidateSize();
        }, 300);
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

