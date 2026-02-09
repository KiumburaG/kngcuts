// KNGCuts - Auth Page JavaScript

// Toast Notification (standalone for auth page)
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        info: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span>${message}</span>
        <button class="toast-close">\u00D7</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }
    }, 3500);
}

// Get redirect param
function getRedirect() {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || 'index.html';
}

// Check if already logged in
(async function checkExistingAuth() {
    if (!supabase) return;
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
            window.location.href = getRedirect();
        }
    } catch (err) {
        // Not logged in, continue
    }
})();

// Tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const target = this.dataset.tab;

        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        document.getElementById(target === 'signin' ? 'signinForm' : 'signupForm').classList.add('active');
    });
});

// Sign In
document.getElementById('signinForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('signinEmail').value.trim();
    const password = document.getElementById('signinPassword').value;
    const errorEl = document.getElementById('signinError');
    const btn = e.target.querySelector('.auth-submit-btn');

    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.style.display = 'none';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        showToast('Signed in successfully!', 'success');
        setTimeout(() => {
            window.location.href = getRedirect();
        }, 500);
    } catch (error) {
        errorEl.textContent = error.message || 'Invalid email or password';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
});

// Sign Up
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const errorEl = document.getElementById('signupError');
    const btn = e.target.querySelector('.auth-submit-btn');

    if (!name || !email || !phone || !password) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    errorEl.style.display = 'none';

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone
                }
            }
        });

        if (error) throw error;

        if (data.user && !data.user.confirmed_at && data.user.identities?.length === 0) {
            errorEl.textContent = 'An account with this email already exists. Please sign in.';
            errorEl.style.display = 'block';
            return;
        }

        if (data.session) {
            showToast('Account created! Signing you in...', 'success');
            setTimeout(() => {
                window.location.href = getRedirect();
            }, 500);
        } else if (data.user) {
            // Auto-sign in the user (no email verification required)
            try {
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (!signInError && signInData.session) {
                    showToast('Account created! Signing you in...', 'success');
                    setTimeout(() => {
                        window.location.href = getRedirect();
                    }, 500);
                    return;
                }
            } catch (e) { /* fall through */ }
            showToast('Account created! You can now sign in.', 'success');
            document.querySelector('.auth-tab[data-tab="signin"]').click();
            document.getElementById('signinEmail').value = email;
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Failed to create account';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
});

// Forgot Password
document.getElementById('forgotPassword').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value.trim();

    if (!email) {
        showToast('Please enter your email address first', 'warning');
        document.getElementById('signinEmail').focus();
        return;
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/auth.html?reset=true'
        });
        if (error) throw error;
        showToast('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to send reset email', 'error');
    }
});

// Handle password reset if redirected back with reset token
(async function handlePasswordReset() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
        // Check if we have a session (user clicked the reset link in email)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const newPassword = prompt('Enter your new password (min 6 characters):');
            if (newPassword && newPassword.length >= 6) {
                try {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                    showToast('Password updated successfully! You are now signed in.', 'success');
                    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
                } catch (error) {
                    showToast(error.message || 'Failed to update password', 'error');
                }
            }
        }
    }
})();

