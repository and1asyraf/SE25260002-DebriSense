// NGO Dashboard Functionality

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
    
    console.log('NGO Dashboard initialized');
});

