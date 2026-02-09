// KNGCuts - Main Site JavaScript (Supabase Version)

// Toast Notification System
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
        info: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
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



// Check for declined booking redirect
(function() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('declined') === 'true') {
        showToast('Thank you for visiting KNGCuts!', 'info');
        // Clean up URL
        window.history.replaceState({}, document.title, 'index.html');
    }
})();

// ==================== PUBLIC GALLERY ====================

const galleryGrid = document.getElementById('galleryGrid');

loadPublicGallery();

async function loadPublicGallery() {
    if (!galleryGrid || !supabase) return;

    try {
        let { data, error } = await supabase
            .from('gallery_images')
            .select('*')
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });

        // Fallback if sort_order column doesn't exist yet
        if (error) {
            const fallback = await supabase
                .from('gallery_images').select('*').order('created_at', { ascending: false });
            data = fallback.data;
            error = fallback.error;
        }
        if (error) throw error;

        if (!data || data.length === 0) {
            galleryGrid.innerHTML = `
                <div class="gallery-placeholder">
                    <p>Gallery photos coming soon!</p>
                    <p class="admin-note">Upload your haircut photos to showcase your work</p>
                </div>
            `;
            return;
        }

        galleryGrid.innerHTML = '';
        data.forEach(img => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <img src="${img.url}" alt="${img.label || 'Haircut'}" loading="lazy">
                ${img.label ? `<div class="gallery-label">${img.label}</div>` : ''}
            `;
            galleryGrid.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading gallery:', err);
    }
}

// ==================== HERO BACKGROUND ====================

const DEFAULT_HERO_BG = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070';

loadHeroBackground();

async function loadHeroBackground() {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'hero_background')
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        const hero = document.getElementById('hero');
        if (data && data.value && data.value.url) {
            if (hero) hero.style.background = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${data.value.url}') center/cover`;
        } else {
            if (hero) hero.style.background = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${DEFAULT_HERO_BG}') center/cover`;
        }
    } catch (err) {
        console.error('Error loading hero background:', err);
    }
}

// ==================== REVIEWS ====================

const reviewsGrid = document.getElementById('reviewsGrid');

loadPublicReviews();

async function loadPublicReviews() {
    if (!reviewsGrid || !supabase) return;

    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, profiles(full_name, avatar_url)')
            .eq('approved', true)
            .order('created_at', { ascending: false })
            .limit(6);

        if (error) throw error;

        if (!data || data.length === 0) {
            reviewsGrid.innerHTML = '<div class="reviews-placeholder"><p>No reviews yet</p></div>';
            return;
        }

        reviewsGrid.innerHTML = '';
        data.forEach(review => {
            const name = review.profiles?.full_name || 'Client';
            const avatarUrl = review.profiles?.avatar_url;
            const stars = '&#9733;'.repeat(review.rating) + '&#9734;'.repeat(5 - review.rating);
            const dateStr = new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div class="review-header">
                    ${avatarUrl
                        ? `<img src="${avatarUrl}" alt="${name}" class="review-avatar">`
                        : `<span class="review-avatar">${name.charAt(0).toUpperCase()}</span>`
                    }
                    <div>
                        <div class="review-name">${name}</div>
                        <div class="review-date">${dateStr}</div>
                    </div>
                </div>
                <div class="review-stars">${stars}</div>
                ${review.comment ? `<p class="review-comment">${review.comment}</p>` : ''}
            `;
            reviewsGrid.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading reviews:', err);
        reviewsGrid.innerHTML = '<div class="reviews-placeholder"><p>No reviews yet</p></div>';
    }
}

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.service-card, .gallery-item, .contact-item, .extra-card, .review-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Active navbar highlighting on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-menu a');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= (sectionTop - 100)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

console.log('KNGCuts website loaded successfully!');
