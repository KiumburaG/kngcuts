// KNGCuts - Dynamic Nav Auth UI
// Updates navbar based on auth state

(function() {
    window.addEventListener('kng-auth-ready', function() {
        updateNav();
    });

    function updateNav() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;

        // Remove any existing auth items
        navMenu.querySelectorAll('.nav-auth-item').forEach(el => el.remove());

        if (!window.kngAuth || !window.kngAuth.isLoggedIn()) {
            // Logged out: show Sign In link
            const li = document.createElement('li');
            li.className = 'nav-auth-item';
            li.innerHTML = '<a href="auth.html" class="nav-auth-btn">Sign In</a>';
            navMenu.appendChild(li);
        } else {
            // Logged in: show user dropdown
            const profile = window.kngAuth.getProfile();
            const user = window.kngAuth.getUser();
            const isAdmin = window.kngAuth.isAdmin() || user?.email === 'kngcutsbarbershop@gmail.com';
            const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Account';

            const dashboardLink = isAdmin ? `
                    <a href="admin-dashboard.html" class="user-dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                        Admin Dashboard
                    </a>
                    <a href="admin-calendar.html" class="user-dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Manage Calendar
                    </a>` : '';

            const avatarHtml = profile?.avatar_url
                ? `<img src="${profile.avatar_url}" alt="${displayName}" class="user-menu-avatar user-menu-avatar-img">`
                : `<span class="user-menu-avatar">${displayName.charAt(0).toUpperCase()}</span>`;

            const li = document.createElement('li');
            li.className = 'nav-auth-item user-menu';
            li.innerHTML = `
                <button class="nav-auth-btn user-menu-toggle">
                    ${avatarHtml}
                    <span class="user-menu-name">${displayName}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="user-dropdown">
                    ${dashboardLink}
                    <a href="profile.html" class="user-dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        My Appointments
                    </a>
                    <button class="user-dropdown-item user-dropdown-signout">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                    </button>
                </div>
            `;
            navMenu.appendChild(li);

            // Toggle dropdown
            const toggle = li.querySelector('.user-menu-toggle');
            const dropdown = li.querySelector('.user-dropdown');
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });

            // Sign out
            li.querySelector('.user-dropdown-signout').addEventListener('click', function() {
                window.kngAuth.signOut();
            });

            // Close dropdown on outside click
            document.addEventListener('click', function() {
                dropdown.classList.remove('active');
            });
        }
    }
})();
