// KNGCuts - Shared Auth State Module
// Provides window.kngAuth with helpers for auth state across all pages

(function() {
    let _user = null;
    let _profile = null;
    let _ready = false;

    async function init() {
        if (!supabase) {
            _ready = true;
            dispatch();
            return;
        }

        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (!error && user) {
                _user = user;
                await loadProfile(user.id);
            }
        } catch (err) {
            console.log('Auth state: not logged in');
        }

        _ready = true;
        dispatch();

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                _user = session.user;
                await loadProfile(session.user.id);
                dispatch();
            } else if (event === 'SIGNED_OUT') {
                _user = null;
                _profile = null;
                dispatch();
            }
        });
    }

    async function loadProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (!error && data) {
                _profile = data;
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        }
    }

    function dispatch() {
        window.dispatchEvent(new CustomEvent('kng-auth-ready', {
            detail: { user: _user, profile: _profile }
        }));
    }

    async function signOut() {
        if (supabase) {
            await supabase.auth.signOut();
        }
        _user = null;
        _profile = null;
        window.location.href = 'index.html';
    }

    window.kngAuth = {
        isLoggedIn: function() { return !!_user; },
        isAdmin: function() { return _profile?.role === 'admin'; },
        isClient: function() { return _profile?.role === 'client'; },
        getUser: function() { return _user; },
        getProfile: function() { return _profile; },
        isReady: function() { return _ready; },
        signOut: signOut,
        onReady: function(cb) {
            if (_ready) {
                cb({ user: _user, profile: _profile });
            } else {
                window.addEventListener('kng-auth-ready', function handler(e) {
                    window.removeEventListener('kng-auth-ready', handler);
                    cb(e.detail);
                });
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
