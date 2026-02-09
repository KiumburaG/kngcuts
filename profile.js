// KNGCuts - User Profile Page

// Toast Notification
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

// Wait for auth to be ready
window.kngAuth.onReady(async function(authData) {
    if (!authData.user) {
        window.location.href = 'auth.html?redirect=profile.html';
        return;
    }

    // Populate profile header
    const profile = authData.profile;
    const user = authData.user;
    const displayName = profile?.full_name || user.email.split('@')[0];

    const avatarEl = document.getElementById('profileAvatar');
    document.getElementById('profileName').textContent = displayName;
    document.getElementById('profileEmail').textContent = user.email;

    // Show avatar image or initial
    if (profile?.avatar_url) {
        avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="${displayName}">`;
    } else {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
    }

    const createdAt = new Date(user.created_at);
    document.getElementById('profileSince').textContent = 'Member since ' + createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Populate profile details
    document.getElementById('detailName').textContent = profile?.full_name || '-';
    document.getElementById('detailEmail').textContent = user.email;
    document.getElementById('detailPhone').textContent = profile?.phone || '-';

    // Edit profile button
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        showEditProfileModal(user, profile, displayName, avatarEl);
    });

    // Avatar upload handler — opens crop modal (with HEIC support)
    document.getElementById('avatarUpload').addEventListener('change', async (e) => {
        let file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showToast('Image must be under 10MB', 'error');
            e.target.value = '';
            return;
        }

        // Convert HEIC/HEIF to JPEG
        const name = file.name.toLowerCase();
        if (name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif') {
            if (typeof heic2any !== 'undefined') {
                try {
                    showToast('Converting image format...', 'info');
                    const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
                    file = new File([blob], file.name.replace(/\.heic|\.heif/i, '.jpg'), { type: 'image/jpeg' });
                } catch (convErr) {
                    console.error('HEIC conversion error:', convErr);
                    showToast('Could not convert this image. Try a JPG or PNG instead.', 'error');
                    e.target.value = '';
                    return;
                }
            } else {
                showToast('HEIC format not supported. Please use JPG or PNG.', 'error');
                e.target.value = '';
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = () => showCropModal(reader.result, user, displayName, avatarEl);
        reader.readAsDataURL(file);
        e.target.value = '';
    });

    // Load appointments
    await loadAppointments(user.id);
});

async function loadAppointments(userId) {
    if (!supabase) return;

    try {
        // Ensure we have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            document.getElementById('upcomingAppointments').innerHTML = '<p class="profile-empty">No upcoming appointments. <a href="bookings.html">Book one now!</a></p>';
            document.getElementById('pastAppointments').innerHTML = '<p class="profile-empty">No past appointments yet.</p>';
            return;
        }

        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (error) {
            console.error('Appointments query error:', error.message, error.code);
            // Show empty state instead of error
            renderUpcoming([]);
            renderPast([]);
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = [];
        const past = [];

        (data || []).forEach(appt => {
            const [y, m, d] = appt.date.split('-');
            const apptDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));

            if (apptDate >= today && appt.status === 'confirmed') {
                upcoming.push(appt);
            } else {
                past.push(appt);
            }
        });

        renderUpcoming(upcoming);
        await renderPast(past);
    } catch (err) {
        console.error('Error loading appointments:', err);
        renderUpcoming([]);
        await renderPast([]);
    }
}

function renderUpcoming(appointments) {
    const container = document.getElementById('upcomingAppointments');

    if (appointments.length === 0) {
        container.innerHTML = '<p class="profile-empty">No upcoming appointments. <a href="bookings.html">Book one now!</a></p>';
        return;
    }

    container.innerHTML = appointments.map(appt => {
        const dateObj = parseDateStr(appt.date);
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

        return `
            <div class="profile-appt-card">
                <div class="profile-appt-info">
                    <div class="profile-appt-service">${capitalizeService(appt.haircut)}</div>
                    <div class="profile-appt-datetime">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        ${dateStr} at ${appt.time}
                    </div>
                    ${appt.extras && appt.extras.length > 0 ? `<div class="profile-appt-extras">+ ${appt.extras.map(e => e.name).join(', ')}</div>` : ''}
                    <div class="profile-appt-total">Total: $${parseFloat(appt.total).toFixed(2)} <span class="status-badge status-${appt.status}">${appt.status}</span></div>
                </div>
                <button class="cancel-appt-btn" onclick="cancelAppointment('${appt.id}')">Cancel</button>
            </div>
        `;
    }).join('');
}

async function renderPast(appointments) {
    const container = document.getElementById('pastAppointments');

    if (appointments.length === 0) {
        container.innerHTML = '<p class="profile-empty">No past appointments yet.</p>';
        return;
    }

    // Check which appointments already have reviews
    let reviewedIds = new Set();
    try {
        const user = window.kngAuth.getUser();
        if (user) {
            const { data: reviews } = await supabase
                .from('reviews')
                .select('appointment_id')
                .eq('user_id', user.id);
            if (reviews) {
                reviewedIds = new Set(reviews.map(r => r.appointment_id));
            }
        }
    } catch (e) { /* ignore */ }

    container.innerHTML = appointments.map(appt => {
        const dateObj = parseDateStr(appt.date);
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const canReview = appt.status !== 'cancelled' && !reviewedIds.has(appt.id);
        const alreadyReviewed = reviewedIds.has(appt.id);

        return `
            <div class="profile-appt-card profile-appt-past">
                <div class="profile-appt-info">
                    <div class="profile-appt-service">${capitalizeService(appt.haircut)}</div>
                    <div class="profile-appt-datetime">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        ${dateStr} at ${appt.time}
                    </div>
                    <div class="profile-appt-total">Total: $${parseFloat(appt.total).toFixed(2)} <span class="status-badge status-${appt.status}">${appt.status}</span></div>
                </div>
                ${canReview ? `<button class="leave-review-btn" onclick="showReviewModal('${appt.id}')">Leave Review</button>` : ''}
                ${alreadyReviewed ? `<span class="reviewed-badge">Reviewed</span>` : ''}
            </div>
        `;
    }).join('');
}

// Cancel appointment
async function cancelAppointment(id) {
    // Show confirmation modal
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal disclaimer-modal">
            <div class="confirm-modal-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <h3>Cancel Appointment?</h3>
            <p>Are you sure you want to cancel this appointment? The <strong>$5.00 deposit is non-refundable</strong>.</p>
            <div class="confirm-modal-actions">
                <button class="confirm-btn-cancel" id="cancelNo">Keep Appointment</button>
                <button class="confirm-btn-danger" id="cancelYes">Cancel Appointment</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('cancelNo').addEventListener('click', () => {
        overlay.remove();
    });

    document.getElementById('cancelYes').addEventListener('click', async () => {
        try {
            // Fetch appointment details before cancelling (for notification)
            const { data: appt } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', id)
                .single();

            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;

            showToast('Appointment cancelled successfully', 'success');
            overlay.remove();

            // Send admin cancellation notification (non-blocking)
            if (appt) {
                const haircutLabels = { 'fade': 'Fade', 'buzz': 'Buzz Cut', 'trim': 'Trim' };
                try {
                    await supabase.functions.invoke('send-booking-email', {
                        body: {
                            type: 'cancellation',
                            customerName: appt.customer_name,
                            customerEmail: appt.customer_email,
                            service: haircutLabels[appt.haircut] || appt.haircut,
                            date: appt.date,
                            time: appt.time,
                            total: appt.total,
                            extras: appt.extras
                        }
                    });
                } catch (e) {
                    console.log('Cancellation notification failed (non-blocking):', e);
                }
            }

            // Refresh appointments
            const user = window.kngAuth.getUser();
            if (user) await loadAppointments(user.id);
        } catch (err) {
            console.error('Error cancelling appointment:', err);
            showToast('Failed to cancel appointment. Please try again.', 'error');
            overlay.remove();
        }
    });
}

window.cancelAppointment = cancelAppointment;

// Helpers
function parseDateStr(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

// ==================== EDIT PROFILE MODAL ====================

function showEditProfileModal(user, profile, displayName, avatarEl) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal edit-modal">
            <div class="confirm-modal-icon">
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
            </div>
            <h3>Edit Profile</h3>
            <div class="edit-modal-form">
                <div class="edit-modal-field">
                    <label for="editFullName">Full Name</label>
                    <input type="text" id="editFullName" value="${profile?.full_name || ''}" placeholder="Your full name">
                </div>
                <div class="edit-modal-field">
                    <label for="editPhone">Phone Number</label>
                    <input type="tel" id="editPhone" value="${profile?.phone || ''}" placeholder="(201) 555-0123">
                </div>
                <div class="edit-modal-field">
                    <label>Email</label>
                    <input type="email" value="${user.email}" disabled style="opacity:0.6;cursor:not-allowed;">
                    <span style="font-size:0.75rem;color:var(--muted-text);">Email cannot be changed</span>
                </div>
            </div>
            <div class="confirm-modal-actions">
                <button class="confirm-btn-cancel" id="editProfileCancel">Cancel</button>
                <button class="confirm-btn-save" id="editProfileSave">Save Changes</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('editProfileCancel').addEventListener('click', () => {
        overlay.style.animation = 'confirmFadeOut 0.2s ease forwards';
        setTimeout(() => overlay.remove(), 200);
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.animation = 'confirmFadeOut 0.2s ease forwards';
            setTimeout(() => overlay.remove(), 200);
        }
    });

    document.getElementById('editProfileSave').addEventListener('click', async () => {
        const newName = document.getElementById('editFullName').value.trim();
        const newPhone = document.getElementById('editPhone').value.trim();

        if (!newName) {
            showToast('Please enter your name', 'warning');
            return;
        }

        const saveBtn = document.getElementById('editProfileSave');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: newName, phone: newPhone })
                .eq('id', user.id);

            if (error) throw error;

            // Update UI everywhere
            document.getElementById('profileName').textContent = newName;
            document.getElementById('detailName').textContent = newName;
            document.getElementById('detailPhone').textContent = newPhone || '-';

            // Update avatar initial if no photo
            if (!profile?.avatar_url) {
                avatarEl.textContent = newName.charAt(0).toUpperCase();
            }

            // Update the stored profile
            if (profile) {
                profile.full_name = newName;
                profile.phone = newPhone;
            }

            showToast('Profile updated!', 'success');
            overlay.style.animation = 'confirmFadeOut 0.2s ease forwards';
            setTimeout(() => overlay.remove(), 200);
        } catch (err) {
            console.error('Error updating profile:', err);
            showToast('Failed to update profile', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    });

    // Enter key saves
    document.getElementById('editPhone').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('editProfileSave').click();
    });

    document.getElementById('editFullName').focus();
}

function capitalizeService(service) {
    const labels = {
        'fade': 'Fade',
        'buzz': 'Buzz Cut',
        'trim': 'Trim'
    };
    return labels[service] || service;
}

// ==================== AVATAR CROP MODAL ====================

function showCropModal(imageSrc, user, displayName, avatarEl) {
    const SIZE = 280;
    let scale = 1, offsetX = 0, offsetY = 0;
    let img = new Image();
    let dragging = false, lastX = 0, lastY = 0;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal crop-modal">
            <h3>Adjust Your Photo</h3>
            <p style="color:var(--muted-text);font-size:0.85rem;margin-bottom:1rem;">Drag to reposition. Use slider to zoom.</p>
            <div class="crop-canvas-wrapper">
                <canvas id="cropCanvas" width="${SIZE}" height="${SIZE}"></canvas>
                <div class="crop-circle-guide"></div>
            </div>
            <div class="crop-zoom-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                <input type="range" id="cropZoom" min="50" max="300" value="100" class="crop-zoom-slider">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>
            <div class="confirm-modal-actions">
                <button class="confirm-btn-cancel" id="cropCancel">Cancel</button>
                <button class="confirm-btn-save" id="cropSave">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    const zoomSlider = document.getElementById('cropZoom');

    img.onload = () => {
        // Fit image to canvas initially
        const ratio = Math.max(SIZE / img.width, SIZE / img.height);
        scale = ratio * 100;
        zoomSlider.value = Math.round(scale);
        zoomSlider.min = Math.round(Math.max(SIZE / img.width, SIZE / img.height) * 100 * 0.5);
        offsetX = (SIZE - img.width * scale / 100) / 2;
        offsetY = (SIZE - img.height * scale / 100) / 2;
        draw();
    };
    img.src = imageSrc;

    function draw() {
        ctx.clearRect(0, 0, SIZE, SIZE);
        // Dark background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, SIZE, SIZE);
        // Draw image
        const w = img.width * scale / 100;
        const h = img.height * scale / 100;
        ctx.drawImage(img, offsetX, offsetY, w, h);
        // Darken outside circle
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Zoom
    zoomSlider.addEventListener('input', () => {
        const oldScale = scale;
        scale = parseFloat(zoomSlider.value);
        // Zoom towards center
        const factor = scale / oldScale;
        offsetX = SIZE / 2 - factor * (SIZE / 2 - offsetX);
        offsetY = SIZE / 2 - factor * (SIZE / 2 - offsetY);
        draw();
    });

    // Mouse drag
    canvas.addEventListener('mousedown', (e) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        offsetX += e.clientX - lastX;
        offsetY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        draw();
    });
    window.addEventListener('mouseup', () => {
        dragging = false;
        canvas.style.cursor = 'grab';
    });

    // Touch drag
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            dragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (!dragging || e.touches.length !== 1) return;
        offsetX += e.touches[0].clientX - lastX;
        offsetY += e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        draw();
    }, { passive: true });
    window.addEventListener('touchend', () => { dragging = false; });

    // Cancel
    document.getElementById('cropCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    // Save — redraw for export (clean circle crop) and upload
    document.getElementById('cropSave').addEventListener('click', async () => {
        const saveBtn = document.getElementById('cropSave');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Uploading...';

        try {
            // Create a separate export canvas to avoid composite issues
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = SIZE;
            exportCanvas.height = SIZE;
            const ectx = exportCanvas.getContext('2d');

            // Fill with white background (JPEG has no transparency)
            ectx.fillStyle = '#ffffff';
            ectx.fillRect(0, 0, SIZE, SIZE);

            // Clip to circle
            ectx.save();
            ectx.beginPath();
            ectx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
            ectx.closePath();
            ectx.clip();

            // Draw image with current position/scale
            const w = img.width * scale / 100;
            const h = img.height * scale / 100;
            ectx.drawImage(img, offsetX, offsetY, w, h);
            ectx.restore();

            // Export to blob
            const blob = await new Promise((resolve, reject) => {
                exportCanvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to create image'));
                }, 'image/jpeg', 0.9);
            });

            const filePath = `${user.id}.jpg`;

            const { error: uploadErr } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' });

            if (uploadErr) throw new Error('Upload failed: ' + uploadErr.message);

            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ avatar_url: avatarUrl })
                .eq('id', user.id);

            if (updateErr) throw new Error('Profile update failed: ' + updateErr.message);

            avatarEl.innerHTML = `<img src="${avatarUrl}" alt="${displayName}">`;

            // Update nav avatar too
            const navAvatar = document.querySelector('.user-menu-avatar');
            if (navAvatar) {
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.alt = displayName;
                img.className = 'user-menu-avatar user-menu-avatar-img';
                navAvatar.replaceWith(img);
            }

            showToast('Profile picture updated!', 'success');
            overlay.remove();
        } catch (err) {
            console.error('Avatar error:', err);
            showToast(err.message || 'Failed to update profile picture', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });
}

// ==================== LEAVE REVIEW MODAL ====================

function showReviewModal(appointmentId) {
    let selectedRating = 0;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal review-modal">
            <div class="confirm-modal-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
            </div>
            <h3>Leave a Review</h3>
            <p style="color:var(--muted-text);font-size:0.9rem;">How was your experience?</p>
            <div class="review-stars-input" id="reviewStarsInput">
                ${[1,2,3,4,5].map(i => `<span class="review-star" data-rating="${i}">&#9734;</span>`).join('')}
            </div>
            <textarea id="reviewComment" class="review-comment-input" placeholder="Tell us about your experience (optional)" rows="3" maxlength="500"></textarea>
            <div class="confirm-modal-actions">
                <button class="confirm-btn-cancel" id="reviewCancel">Cancel</button>
                <button class="confirm-btn-save" id="reviewSubmit" disabled>Submit Review</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Star selection
    const starsContainer = document.getElementById('reviewStarsInput');
    const stars = starsContainer.querySelectorAll('.review-star');
    const submitBtn = document.getElementById('reviewSubmit');

    function updateStars(rating) {
        stars.forEach((s, i) => {
            s.innerHTML = i < rating ? '&#9733;' : '&#9734;';
            s.classList.toggle('active', i < rating);
        });
    }

    stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            updateStars(parseInt(star.dataset.rating));
        });

        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            updateStars(selectedRating);
            submitBtn.disabled = false;
        });
    });

    starsContainer.addEventListener('mouseleave', () => {
        updateStars(selectedRating);
    });

    // Cancel
    document.getElementById('reviewCancel').addEventListener('click', () => {
        overlay.style.animation = 'confirmFadeOut 0.2s ease forwards';
        setTimeout(() => overlay.remove(), 200);
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.animation = 'confirmFadeOut 0.2s ease forwards';
            setTimeout(() => overlay.remove(), 200);
        }
    });

    // Submit
    submitBtn.addEventListener('click', async () => {
        if (selectedRating === 0) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const user = window.kngAuth.getUser();
            const comment = document.getElementById('reviewComment').value.trim();

            const { error } = await supabase
                .from('reviews')
                .insert([{
                    user_id: user.id,
                    appointment_id: appointmentId,
                    rating: selectedRating,
                    comment: comment || null,
                    approved: false
                }]);

            if (error) throw error;

            showToast('Review submitted! It will appear once approved.', 'success');
            overlay.remove();

            // Refresh past appointments to show "Reviewed" badge
            await loadAppointments(user.id);
        } catch (err) {
            console.error('Error submitting review:', err);
            showToast('Failed to submit review. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review';
        }
    });
}

window.showReviewModal = showReviewModal;
