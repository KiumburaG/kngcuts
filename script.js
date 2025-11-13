// KNGCuts - Static Site JavaScript

// Mobile Navigation
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
}

// Admin Login - Simplified (no database)
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminModal = document.getElementById('adminModal');

if (adminLoginBtn && adminModal) {
    adminLoginBtn.addEventListener('click', () => {
        alert('Admin features are currently disabled.\n\nFor a full booking system with admin dashboard, Firebase setup is required.\n\nCurrent version: Simple static site with payment links.');
    });

    // Close modal
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            adminModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
        }
    });
}

// Gallery Placeholder
const galleryGrid = document.getElementById('galleryGrid');
if (galleryGrid && !galleryGrid.querySelector('.gallery-item')) {
    galleryGrid.innerHTML = `
        <div class="gallery-placeholder">
            <p>📸 Gallery photos coming soon!</p>
            <p class="admin-note">Upload your haircut photos to showcase your work</p>
        </div>
    `;
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

// Observe elements for fade-in animation
document.querySelectorAll('.service-card, .gallery-item, .contact-item, .extra-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Add active navbar highlighting on scroll
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

console.log('KNGCuts website loaded successfully! ✂️');
