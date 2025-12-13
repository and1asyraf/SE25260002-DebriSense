// Mobile navbar dropdown functionality
document.addEventListener('DOMContentLoaded', function() {
    const logo = document.getElementById('navbar-logo');
    const dropdown = document.getElementById('mobile-dropdown');
    const navbar = document.querySelector('.navbar');
    const mobileBtn = dropdown ? dropdown.querySelector('.mobile-btn') : null;
    
    // Check if we're on mobile (screen width <= 575px)
    function isMobile() {
        return window.innerWidth <= 575;
    }
    
    // Toggle dropdown when logo is clicked on mobile
    if (logo && dropdown) {
        logo.addEventListener('click', function(event) {
            if (isMobile()) {
                event.preventDefault();
                dropdown.classList.toggle('active');
                navbar.classList.toggle('dropdown-open');
            }
        });
        
        // Close dropdown when clicking outside (but not on the button)
        document.addEventListener('click', function(event) {
            if (isMobile() && 
                !logo.contains(event.target) && 
                !dropdown.contains(event.target) &&
                dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
                navbar.classList.remove('dropdown-open');
            }
        });
        
        // Allow mobile button to navigate (don't prevent default)
        if (mobileBtn) {
            mobileBtn.addEventListener('click', function(event) {
                // Let the link navigate naturally
                // Just close the dropdown after a tiny delay
                setTimeout(function() {
                    dropdown.classList.remove('active');
                    navbar.classList.remove('dropdown-open');
                }, 100);
            });
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        // Close dropdown if screen becomes larger than mobile
        if (!isMobile() && dropdown && dropdown.classList.contains('active')) {
            dropdown.classList.remove('active');
            navbar.classList.remove('dropdown-open');
        }
    });
});

