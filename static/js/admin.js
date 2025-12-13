// Admin Dashboard Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const addLocationBtn = document.getElementById('add-location-btn');
    const addLocationBtnMobile = document.getElementById('add-location-btn-mobile');
    const addLocationModal = document.getElementById('add-location-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const addLocationForm = document.getElementById('add-location-form');
    const toast = document.getElementById('toast');
    
    // Quick Actions sidebar elements
    const quickActionsBtn = document.getElementById('quick-actions-btn');
    const quickActionsBtnMobile = document.getElementById('quick-actions-btn-mobile');
    const adminSidebar = document.getElementById('admin-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    
    // User dropdown elements
    const userDropdownBtn = document.getElementById('user-dropdown-btn');
    const userDropdown = userDropdownBtn ? userDropdownBtn.closest('.user-dropdown') : null;
    
    // Quick Actions sidebar toggle
    if (quickActionsBtn && adminSidebar) {
        quickActionsBtn.addEventListener('click', function() {
            adminSidebar.classList.toggle('active');
        });
    }
    
    // Quick Actions sidebar toggle (mobile)
    if (quickActionsBtnMobile && adminSidebar) {
        quickActionsBtnMobile.addEventListener('click', function() {
            const dropdown = document.getElementById('mobile-dropdown');
            if (dropdown) {
                dropdown.classList.remove('active');
            }
            adminSidebar.classList.add('active');
        });
    }
    
    // Close Quick Actions sidebar
    if (closeSidebarBtn && adminSidebar) {
        closeSidebarBtn.addEventListener('click', function() {
            adminSidebar.classList.remove('active');
        });
    }
    
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
    
    // Open modal
    function openModal() {
        if (addLocationModal) {
            addLocationModal.classList.add('active');
        }
    }
    
    // Close modal
    function closeModal() {
        if (addLocationModal) {
            addLocationModal.classList.remove('active');
            if (addLocationForm) addLocationForm.reset();
        }
    }
    
    // Show toast notification
    function showToast(message, type = 'success') {
        const toastMessage = toast.querySelector('.toast-message') || toast;
        toastMessage.textContent = message;
        toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Event listeners
    if (addLocationBtn) {
        addLocationBtn.addEventListener('click', openModal);
    }
    
    if (addLocationBtnMobile) {
        addLocationBtnMobile.addEventListener('click', function() {
            const dropdown = document.getElementById('mobile-dropdown');
            if (dropdown) {
                dropdown.classList.remove('active');
            }
            openModal();
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    addLocationModal.addEventListener('click', function(e) {
        if (e.target === addLocationModal) {
            closeModal();
        }
    });
    
    // Handle form submission
    if (addLocationForm) {
        addLocationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data as FormData (to handle file upload)
            const formData = new FormData(addLocationForm);
            
            try {
                // Send data to backend with FormData (multipart/form-data)
                const response = await fetch('/api/add-river', {
                    method: 'POST',
                    body: formData  // Don't set Content-Type header, browser will set it with boundary
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Add marker to map with full DRI functionality
                    if (window.map && window.addRiverMarker) {
                        // Use the same function as public_map.js for consistent behavior
                        window.addRiverMarker(window.map, result.river);
                        
                        // Center map on new location
                        window.map.setView([
                            parseFloat(result.river.latitude),
                            parseFloat(result.river.longitude)
                        ], 13);
                    }
                    
                    // Show success message
                    showToast(`Successfully added ${formData.get('river_name')} to monitoring locations!`);
                    
                    // Close modal
                    closeModal();
                } else {
                    showToast('Error adding location: ' + (result.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error adding location', 'error');
            }
        });
    }
    
    // Make map globally accessible for admin functions
    if (typeof initializeMap === 'function') {
        // The map is already initialized in map.js
        // We can access it through window.map if needed
    }
});

