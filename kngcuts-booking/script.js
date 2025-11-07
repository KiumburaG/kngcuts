// Mobile Navigation
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// Firebase initialization check
let db, storage, auth;

if (typeof firebase !== 'undefined') {
    db = firebase.firestore();
    storage = firebase.storage();
    auth = firebase.auth();
} else {
    console.warn('Firebase not loaded. Some features may not work.');
}

// Admin Login Modal
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminModal = document.getElementById('adminModal');
const adminDashboard = document.getElementById('adminDashboard');
const googleSignInButton = document.getElementById('googleSignInButton');
const closeButtons = document.querySelectorAll('.close');
const logoutBtn = document.getElementById('logoutBtn');

if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', () => {
        adminModal.style.display = 'block';
    });
}

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        adminModal.style.display = 'none';
        adminDashboard.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target === adminModal) {
        adminModal.style.display = 'none';
    }
    if (e.target === adminDashboard) {
        adminDashboard.style.display = 'none';
    }
});

// Google Sign In
if (googleSignInButton) {
    googleSignInButton.addEventListener('click', async () => {
        if (!auth) {
            alert('Firebase authentication not configured. Please see setup instructions.');
            return;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // Check if user is admin (you should configure this in Firebase)
            // For now, we'll allow any Google user to access admin
            document.getElementById('adminName').textContent = user.displayName;
            adminModal.style.display = 'none';
            adminDashboard.style.display = 'block';

            // Load admin data
            loadGalleryImages(true);
        } catch (error) {
            console.error('Error signing in:', error);
            alert('Error signing in. Please try again.');
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (auth) {
            await auth.signOut();
            adminDashboard.style.display = 'none';
            location.reload();
        }
    });
}

// Check auth state
if (auth) {
    auth.onAuthStateChanged((user) => {
        if (user && adminLoginBtn) {
            adminLoginBtn.textContent = 'Admin Dashboard';
            adminLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('adminName').textContent = user.displayName;
                adminDashboard.style.display = 'block';
                loadGalleryImages(true);
            });
        }
    });
}

// Image Upload
const imageUpload = document.getElementById('imageUpload');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');

if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
        if (!storage || !db) {
            alert('Firebase not configured. Please see setup instructions.');
            return;
        }

        const files = imageUpload.files;
        if (files.length === 0) {
            alert('Please select images to upload');
            return;
        }

        uploadStatus.innerHTML = '<p>Uploading...</p>';

        try {
            for (let file of files) {
                const storageRef = storage.ref(`gallery/${Date.now()}_${file.name}`);
                await storageRef.put(file);
                const url = await storageRef.getDownloadURL();

                // Save to Firestore
                await db.collection('gallery').add({
                    url: url,
                    filename: file.name,
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            uploadStatus.innerHTML = '<p class="success-message">Images uploaded successfully!</p>';
            imageUpload.value = '';
            loadGalleryImages(true);
            loadGalleryImages(false);

            setTimeout(() => {
                uploadStatus.innerHTML = '';
            }, 3000);
        } catch (error) {
            console.error('Error uploading:', error);
            uploadStatus.innerHTML = '<p class="error-message">Error uploading images. Please try again.</p>';
        }
    });
}

// Load Gallery Images
async function loadGalleryImages(isAdmin = false) {
    if (!db) return;

    const galleryContainer = isAdmin ?
        document.getElementById('adminGallery') :
        document.getElementById('galleryGrid');

    if (!galleryContainer) return;

    try {
        const snapshot = await db.collection('gallery')
            .orderBy('uploadedAt', 'desc')
            .get();

        if (snapshot.empty) {
            if (!isAdmin) {
                galleryContainer.innerHTML = `
                    <div class="gallery-placeholder">
                        <p>Gallery images will appear here</p>
                        <p class="admin-note">Admin: Login to upload your haircut photos</p>
                    </div>
                `;
            }
            return;
        }

        galleryContainer.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();

            if (isAdmin) {
                const item = document.createElement('div');
                item.className = 'admin-gallery-item';
                item.innerHTML = `
                    <img src="${data.url}" alt="Haircut">
                    <button class="delete-img-btn" onclick="deleteImage('${doc.id}', '${data.url}')">Delete</button>
                `;
                galleryContainer.appendChild(item);
            } else {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = `<img src="${data.url}" alt="Haircut by KNGCuts">`;
                galleryContainer.appendChild(item);
            }
        });
    } catch (error) {
        console.error('Error loading gallery:', error);
    }
}

// Delete Image
async function deleteImage(docId, imageUrl) {
    if (!confirm('Are you sure you want to delete this image?')) return;

    if (!storage || !db) return;

    try {
        // Delete from Storage
        const imageRef = storage.refFromURL(imageUrl);
        await imageRef.delete();

        // Delete from Firestore
        await db.collection('gallery').doc(docId).delete();

        // Reload galleries
        loadGalleryImages(true);
        loadGalleryImages(false);

        alert('Image deleted successfully');
    } catch (error) {
        console.error('Error deleting image:', error);
        alert('Error deleting image. Please try again.');
    }
}

// Make deleteImage globally available
window.deleteImage = deleteImage;

// Load gallery on page load
if (document.getElementById('galleryGrid')) {
    loadGalleryImages(false);
}

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
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

// Observe elements
document.querySelectorAll('.service-card, .gallery-item, .contact-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

console.log('KNGCuts website loaded successfully!');
