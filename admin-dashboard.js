// Admin Dashboard JavaScript

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

// Styled Confirmation Modal
function showConfirmModal(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal">
            <div class="confirm-modal-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="confirm-modal-actions">
                <button class="confirm-btn-cancel">Cancel</button>
                <button class="confirm-btn-danger">Confirm</button>
            </div>
        </div>
    `;

    function closeModal() {
        overlay.style.animation = 'confirmFadeOut 0.2s ease forwards';
        setTimeout(() => overlay.remove(), 200);
    }

    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', closeModal);
    overlay.querySelector('.confirm-btn-danger').addEventListener('click', () => { closeModal(); onConfirm(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
}

// ==================== AUTH ====================

(async function checkAuth() {
    if (!supabase) {
        showToast('Supabase not configured', 'error');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        showToast('Please login as admin to access this page', 'warning');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    // Authenticated — populate dashboard with profile name
    const adminNameEl = document.getElementById('adminName');
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

        if (profile?.full_name) {
            adminNameEl.textContent = profile.full_name;
        } else {
            adminNameEl.textContent = user.email.split('@')[0];
        }

        // Verify admin access
        const isAdmin = profile?.role === 'admin' || user.email === 'kngcutsbarbershop@gmail.com';
        if (!isAdmin) {
            showToast('Admin access required', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            return;
        }
    } catch (e) {
        adminNameEl.textContent = user.email.split('@')[0];
    }

    loadStats();
    loadAdminGallery();
    loadHeroBackground();
    loadAppointments();
    loadAdminReviews();
})();

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// ==================== STATS ====================

async function loadStats() {
    if (!supabase) return;

    try {
        const today = new Date().toISOString().split('T')[0];

        // Upcoming appointments
        const { data: appts, error: apptsErr } = await supabase
            .from('appointments')
            .select('id', { count: 'exact' })
            .eq('status', 'confirmed')
            .gte('date', today);
        if (apptsErr) console.error('Stats appointments error:', apptsErr.message);
        document.getElementById('statAppointments').textContent = appts ? appts.length : 0;

        // Gallery photos
        const { data: photos, error: photosErr } = await supabase
            .from('gallery_images')
            .select('id', { count: 'exact' });
        if (photosErr) console.error('Stats photos error:', photosErr.message);
        document.getElementById('statPhotos').textContent = photos ? photos.length : 0;

        // Blocked dates
        const { data: blocked, error: blockedErr } = await supabase
            .from('blocked_dates')
            .select('id', { count: 'exact' })
            .gte('date', today);
        if (blockedErr) console.error('Stats blocked error:', blockedErr.message);
        document.getElementById('statBlocked').textContent = blocked ? blocked.length : 0;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// ==================== GALLERY ====================

const GALLERY_BUCKET = 'gallery';

const uploadBtn = document.getElementById('uploadBtn');
if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
        if (!supabase) { showToast('Backend not configured', 'error'); return; }

        const fileInput = document.getElementById('imageUpload');
        const labelInput = document.getElementById('imageLabel');
        const files = fileInput.files;

        if (!files || files.length === 0) {
            showToast('Please select at least one image', 'warning');
            return;
        }

        const label = labelInput ? labelInput.value.trim() : '';

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        let uploaded = 0, failed = 0;

        for (let file of files) {
            try {
                const name = file.name.toLowerCase();
                if (name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif') {
                    if (typeof heic2any !== 'undefined') {
                        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
                        file = new File([blob], file.name.replace(/\.heic|\.heif/i, '.jpg'), { type: 'image/jpeg' });
                    }
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
                const filePath = `gallery/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(GALLERY_BUCKET).upload(filePath, file, { cacheControl: '3600', upsert: false });
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(filePath);

                const { error: dbError } = await supabase
                    .from('gallery_images').insert([{ file_path: filePath, url: urlData.publicUrl, label: label || null }]);
                if (dbError) throw dbError;

                uploaded++;
            } catch (err) {
                console.error('Upload error:', err);
                failed++;
            }
        }

        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Images';
        fileInput.value = '';
        if (labelInput) labelInput.value = '';

        if (uploaded > 0) {
            showToast(`${uploaded} image${uploaded > 1 ? 's' : ''} uploaded!`, 'success');
            loadAdminGallery();
            loadStats();
        }
        if (failed > 0) showToast(`${failed} image${failed > 1 ? 's' : ''} failed`, 'error');
    });
}

async function loadAdminGallery() {
    const adminGallery = document.getElementById('adminGallery');
    if (!adminGallery || !supabase) return;

    try {
        let { data, error } = await supabase
            .from('gallery_images').select('*').order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
        // Fallback if sort_order column doesn't exist yet
        if (error) {
            const fallback = await supabase
                .from('gallery_images').select('*').order('created_at', { ascending: false });
            data = fallback.data;
            error = fallback.error;
        }
        if (error) throw error;

        if (!data || data.length === 0) {
            adminGallery.innerHTML = '<p style="text-align:center;color:var(--muted-text);padding:2rem;">No images uploaded yet</p>';
            return;
        }

        adminGallery.innerHTML = '';
        data.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'admin-gallery-item';
            item.draggable = true;
            item.dataset.id = img.id;
            item.dataset.index = index;
            item.innerHTML = `
                <div class="gallery-drag-handle" title="Drag to reorder">&#x2630;</div>
                <img src="${img.url}" alt="${img.label || 'Haircut'}">
                ${img.label ? `<div class="admin-gallery-label">${img.label}</div>` : ''}
                <div class="gallery-item-actions">
                    <button class="delete-img-btn" data-id="${img.id}" data-path="${img.file_path}" title="Delete">&times;</button>
                </div>
                <button class="edit-img-btn" data-id="${img.id}" data-label="${img.label || ''}" title="Edit label">&#x270E; Edit</button>
            `;
            adminGallery.appendChild(item);
        });

        initGalleryDragDrop(adminGallery);

        adminGallery.querySelectorAll('.edit-img-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                editGalleryLabel(btn.dataset.id, btn.dataset.label);
            });
        });

        adminGallery.querySelectorAll('.delete-img-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirmModal('Delete Photo', 'Are you sure you want to delete this photo? This cannot be undone.',
                    () => deleteGalleryImage(btn.dataset.id, btn.dataset.path));
            });
        });
    } catch (err) {
        console.error('Error loading admin gallery:', err);
    }
}

// ==================== GALLERY DRAG & DROP ====================

function showSaveOrderBtn() {
    const btn = document.getElementById('saveGalleryOrderBtn');
    if (btn) btn.style.display = 'inline-flex';
}

function hideSaveOrderBtn() {
    const btn = document.getElementById('saveGalleryOrderBtn');
    if (btn) btn.style.display = 'none';
}

function initGalleryDragDrop(container) {
    let dragItem = null;

    container.querySelectorAll('.admin-gallery-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            dragItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            container.querySelectorAll('.admin-gallery-item').forEach(el => el.classList.remove('drag-over'));
            dragItem = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (item !== dragItem) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            if (dragItem && dragItem !== item) {
                const items = [...container.querySelectorAll('.admin-gallery-item')];
                const fromIndex = items.indexOf(dragItem);
                const toIndex = items.indexOf(item);
                if (fromIndex < toIndex) {
                    item.after(dragItem);
                } else {
                    item.before(dragItem);
                }
                showSaveOrderBtn();
            }
        });

        // Touch support for mobile drag
        let touchClone = null;
        let touchActive = false;

        const handle = item.querySelector('.gallery-drag-handle');
        if (handle) {
            handle.addEventListener('touchstart', (e) => {
                dragItem = item;
                touchActive = true;
                const touch = e.touches[0];

                touchClone = item.cloneNode(true);
                touchClone.classList.add('drag-clone');
                touchClone.style.width = item.offsetWidth + 'px';
                touchClone.style.height = item.offsetHeight + 'px';
                document.body.appendChild(touchClone);
                positionClone(touchClone, touch);

                item.classList.add('dragging');
            }, { passive: true });
        }

        document.addEventListener('touchmove', (e) => {
            if (!touchActive || !touchClone) return;
            const touch = e.touches[0];
            positionClone(touchClone, touch);

            touchClone.style.display = 'none';
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            touchClone.style.display = '';

            const targetItem = elementBelow?.closest('.admin-gallery-item');
            container.querySelectorAll('.admin-gallery-item').forEach(el => el.classList.remove('drag-over'));
            if (targetItem && targetItem !== dragItem) {
                targetItem.classList.add('drag-over');
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (!touchActive) return;
            touchActive = false;
            if (touchClone) { touchClone.remove(); touchClone = null; }

            const overItem = container.querySelector('.admin-gallery-item.drag-over');
            if (overItem && dragItem && overItem !== dragItem) {
                const items = [...container.querySelectorAll('.admin-gallery-item')];
                const fromIndex = items.indexOf(dragItem);
                const toIndex = items.indexOf(overItem);
                if (fromIndex < toIndex) {
                    overItem.after(dragItem);
                } else {
                    overItem.before(dragItem);
                }
                showSaveOrderBtn();
            }

            container.querySelectorAll('.admin-gallery-item').forEach(el => el.classList.remove('drag-over', 'dragging'));
            dragItem = null;
        });
    });
}

function positionClone(clone, touch) {
    clone.style.left = (touch.clientX - clone.offsetWidth / 2) + 'px';
    clone.style.top = (touch.clientY - clone.offsetHeight / 2) + 'px';
}

// Save Order button
document.getElementById('saveGalleryOrderBtn')?.addEventListener('click', async () => {
    if (!supabase) return;

    const btn = document.getElementById('saveGalleryOrderBtn');
    const container = document.getElementById('adminGallery');
    const items = container.querySelectorAll('.admin-gallery-item');

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const updates = [];
        items.forEach((item, index) => {
            updates.push({ id: item.dataset.id, sort_order: index });
        });

        for (const update of updates) {
            const { error } = await supabase
                .from('gallery_images')
                .update({ sort_order: update.sort_order })
                .eq('id', update.id);
            if (error) throw error;
        }

        // Verify the save actually persisted
        const { data: check } = await supabase
            .from('gallery_images')
            .select('id, sort_order')
            .order('sort_order', { ascending: true });

        const allZero = check && check.every(r => r.sort_order === 0);
        if (allZero && items.length > 1) {
            showToast('Order not saved — check database permissions', 'warning');
        } else {
            showToast('Gallery order saved', 'success');
        }

        hideSaveOrderBtn();
        await loadAdminGallery();
        await loadStats();
    } catch (err) {
        console.error('Error saving gallery order:', err);
        showToast('Error saving order: ' + (err.message || err), 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Order';
    }
});

async function deleteGalleryImage(id, filePath) {
    if (!supabase) return;
    try {
        await supabase.storage.from(GALLERY_BUCKET).remove([filePath]);
        const { error } = await supabase.from('gallery_images').delete().eq('id', id);
        if (error) throw error;

        showToast('Photo deleted', 'success');
        loadAdminGallery();
        loadStats();
    } catch (err) {
        console.error('Error deleting image:', err);
        showToast('Error deleting photo', 'error');
    }
}

function editGalleryLabel(id, currentLabel) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal edit-modal">
            <div class="confirm-modal-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
            <h3>Edit Photo Label</h3>
            <div class="edit-modal-form">
                <div class="edit-modal-field">
                    <label for="editImgLabel">Label</label>
                    <input type="text" id="editImgLabel" value="${currentLabel}" placeholder="e.g. Mid Fade, Buzz Cut">
                </div>
            </div>
            <div class="confirm-modal-actions">
                <button class="confirm-btn-cancel">Cancel</button>
                <button class="confirm-btn-save">Save</button>
            </div>
        </div>
    `;

    function closeModal() {
        overlay.style.animation = 'confirmFadeOut 0.2s ease forwards';
        setTimeout(() => overlay.remove(), 200);
    }

    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', closeModal);
    overlay.querySelector('.confirm-btn-save').addEventListener('click', async () => {
        const newLabel = overlay.querySelector('#editImgLabel').value.trim();
        closeModal();

        try {
            const { error } = await supabase
                .from('gallery_images')
                .update({ label: newLabel || null })
                .eq('id', id);
            if (error) throw error;

            showToast('Label updated', 'success');
            loadAdminGallery();
        } catch (err) {
            console.error('Error updating label:', err);
            showToast('Error updating label', 'error');
        }
    });

    overlay.querySelector('#editImgLabel').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') overlay.querySelector('.confirm-btn-save').click();
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#editImgLabel');
    input.focus();
    input.select();
}

// ==================== HERO BACKGROUND ====================

const DEFAULT_HERO_BG = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070';

async function loadHeroBackground() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from('settings').select('value').eq('key', 'hero_background').single();
        if (error && error.code !== 'PGRST116') throw error;

        const preview = document.getElementById('heroPreview');
        if (data && data.value && data.value.url) {
            if (preview) preview.style.backgroundImage = `url('${data.value.url}')`;
        } else {
            if (preview) preview.style.backgroundImage = `url('${DEFAULT_HERO_BG}')`;
        }
    } catch (err) {
        console.error('Error loading hero background:', err);
    }
}

const heroUploadBtn = document.getElementById('heroUploadBtn');
if (heroUploadBtn) {
    heroUploadBtn.addEventListener('click', async () => {
        if (!supabase) { showToast('Backend not configured', 'error'); return; }

        const fileInput = document.getElementById('heroUpload');
        if (!fileInput.files || fileInput.files.length === 0) {
            showToast('Please select an image', 'warning');
            return;
        }

        heroUploadBtn.disabled = true;
        heroUploadBtn.textContent = 'Uploading...';

        try {
            let file = fileInput.files[0];
            const name = file.name.toLowerCase();
            if (name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif') {
                if (typeof heic2any !== 'undefined') {
                    const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
                    file = new File([blob], file.name.replace(/\.heic|\.heif/i, '.jpg'), { type: 'image/jpeg' });
                }
            }

            const fileExt = file.name.split('.').pop();
            const filePath = `hero/hero_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(GALLERY_BUCKET).upload(filePath, file, { cacheControl: '3600', upsert: false });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(filePath);

            const { error: dbError } = await supabase
                .from('settings').upsert({ key: 'hero_background', value: { url: urlData.publicUrl, file_path: filePath } }, { onConflict: 'key' });
            if (dbError) throw dbError;

            const preview = document.getElementById('heroPreview');
            if (preview) preview.style.backgroundImage = `url('${urlData.publicUrl}')`;
            fileInput.value = '';

            showToast('Background updated!', 'success');
        } catch (err) {
            console.error('Error uploading hero background:', err);
            showToast('Error uploading background', 'error');
        } finally {
            heroUploadBtn.disabled = false;
            heroUploadBtn.textContent = 'Change Background';
        }
    });
}

const heroResetBtn = document.getElementById('heroResetBtn');
if (heroResetBtn) {
    heroResetBtn.addEventListener('click', () => {
        showConfirmModal('Reset Background', 'Reset the homepage background to the default image?', async () => {
            if (!supabase) return;
            try {
                // Try update first (clear the value)
                const { error: updateErr } = await supabase
                    .from('settings')
                    .update({ value: {} })
                    .eq('key', 'hero_background');

                // If update fails, try delete as fallback
                if (updateErr) {
                    const { error: deleteErr } = await supabase
                        .from('settings')
                        .delete()
                        .eq('key', 'hero_background');
                    if (deleteErr) throw deleteErr;
                }

                const preview = document.getElementById('heroPreview');
                if (preview) preview.style.backgroundImage = `url('${DEFAULT_HERO_BG}')`;
                showToast('Background reset to default', 'success');
            } catch (err) {
                console.error('Error resetting background:', err);
                showToast('Error resetting background', 'error');
            }
        });
    });
}

// ==================== APPOINTMENTS ====================

async function loadAppointments() {
    if (!supabase) return;

    const container = document.getElementById('appointmentsList');
    if (!container) return;

    try {
        // Ensure we have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            container.innerHTML = '<p style="text-align:center;color:var(--muted-text);padding:2rem;">Please sign in to view appointments</p>';
            return;
        }

        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('status', 'confirmed')
            .order('date', { ascending: true });

        if (error) {
            console.error('Appointments query error:', error.message, error.code, error.details);
            // RLS or permission error — show empty state instead of error
            container.innerHTML = '<p style="text-align:center;color:var(--muted-text);padding:2rem;">No upcoming appointments</p>';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = (data || []).filter(row => {
            const [y, m, d] = row.date.split('-');
            return new Date(y, m - 1, d) >= today;
        });

        if (upcoming.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--muted-text);padding:2rem;">No upcoming appointments</p>';
            return;
        }

        container.innerHTML = '';
        upcoming.forEach(row => {
            container.appendChild(createAppointmentCard(row.id, row));
        });
    } catch (err) {
        console.error('Error loading appointments:', err);
        container.innerHTML = '<p style="text-align:center;color:var(--muted-text);padding:2rem;">No upcoming appointments</p>';
    }
}

function createAppointmentCard(id, data) {
    const card = document.createElement('div');
    card.className = 'appt-card';
    card.dataset.expanded = 'false';

    const extrasText = data.extras && data.extras.length > 0
        ? data.extras.map(e => e.name).join(', ')
        : 'None';

    card.innerHTML = `
        <div class="appt-summary">
            <div class="appt-summary-info">
                <span class="appt-name">${data.customer_name}</span>
                <span class="appt-service">${capitalizeService(data.haircut)}</span>
                <span class="appt-date">${formatDate(data.date)}</span>
                <span class="appt-time">${data.time}</span>
            </div>
            <span class="appt-toggle">&#x25BC;</span>
        </div>
        <div class="appt-details">
            <div class="appt-details-inner">
                <div class="appt-detail-row"><span class="appt-detail-label">Phone</span><span>${data.customer_phone}</span></div>
                <div class="appt-detail-row"><span class="appt-detail-label">Email</span><span>${data.customer_email}</span></div>
                <div class="appt-detail-row"><span class="appt-detail-label">Extras</span><span>${extrasText}</span></div>
                ${data.notes ? `<div class="appt-detail-row"><span class="appt-detail-label">Notes</span><span>${data.notes}</span></div>` : ''}
                <div class="appt-detail-row"><span class="appt-detail-label">Total</span><span>$${parseFloat(data.total).toFixed(2)}</span></div>
                <div class="appt-detail-row"><span class="appt-detail-label">Deposit Paid</span><span>$${parseFloat(data.deposit_amount).toFixed(2)}</span></div>
                <div class="appt-actions">
                    <button class="dash-btn dash-btn-primary appt-edit-btn">Edit</button>
                    <button class="dash-btn dash-btn-danger appt-cancel-btn">Cancel</button>
                </div>
            </div>
        </div>
    `;

    const summary = card.querySelector('.appt-summary');
    summary.addEventListener('click', () => {
        const isExpanded = card.classList.toggle('expanded');
        card.dataset.expanded = isExpanded ? 'true' : 'false';
    });

    card.querySelector('.appt-edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        editAppointment(id);
    });

    card.querySelector('.appt-cancel-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteAppointment(id);
    });

    return card;
}

// Styled Edit Modal
function showEditModal(appt, onSave) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal edit-modal">
            <div class="confirm-modal-icon"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
            <h3>Edit Appointment</h3>
            <p class="edit-modal-subtitle">
                <strong>${appt.customer_name}</strong> &mdash; ${capitalizeService(appt.haircut)}
            </p>
            <div class="edit-modal-form">
                <div class="edit-modal-field">
                    <label for="editApptDate">Date</label>
                    <input type="date" id="editApptDate" value="${appt.date}" min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="edit-modal-field">
                    <label for="editApptTime">Time</label>
                    <input type="text" id="editApptTime" value="${appt.time}" placeholder="e.g. 10:00 AM">
                </div>
            </div>
            <div class="confirm-modal-actions">
                <button class="confirm-btn-cancel">Cancel</button>
                <button class="confirm-btn-save">Save Changes</button>
            </div>
        </div>
    `;

    function closeModal() {
        overlay.style.animation = 'confirmFadeOut 0.2s ease forwards';
        setTimeout(() => overlay.remove(), 200);
    }

    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', closeModal);
    overlay.querySelector('.confirm-btn-save').addEventListener('click', () => {
        const newDate = overlay.querySelector('#editApptDate').value;
        const newTime = overlay.querySelector('#editApptTime').value.trim();
        if (!newDate) { showToast('Please select a date', 'warning'); return; }
        if (!newTime) { showToast('Please enter a time', 'warning'); return; }
        closeModal();
        onSave(newDate, newTime);
    });

    // Enter key submits from time field
    overlay.querySelector('#editApptTime').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') overlay.querySelector('.confirm-btn-save').click();
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    overlay.querySelector('#editApptDate').focus();
}

// Success Confirmation Popup
function showSuccessPopup(title, message) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal success-popup">
            <div class="success-popup-circle">
                <svg viewBox="0 0 52 52" class="success-checkmark">
                    <circle cx="26" cy="26" r="25" fill="none" class="success-checkmark-circle"/>
                    <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" class="success-checkmark-check"/>
                </svg>
            </div>
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="confirm-modal-actions">
                <button class="confirm-btn-save success-popup-ok">OK</button>
            </div>
        </div>
    `;

    function closeModal() {
        overlay.style.animation = 'confirmFadeOut 0.2s ease forwards';
        setTimeout(() => overlay.remove(), 200);
    }

    overlay.querySelector('.success-popup-ok').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);

    // Auto-close after 3 seconds
    setTimeout(() => { if (overlay.parentNode) closeModal(); }, 3000);
}

async function editAppointment(id) {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        showEditModal(data, async (newDate, newTime) => {
            try {
                const { error: updateError } = await supabase
                    .from('appointments')
                    .update({ date: newDate, time: newTime })
                    .eq('id', id);

                if (updateError) throw updateError;

                loadAppointments();
                loadStats();
                showSuccessPopup('Appointment Updated', `${data.customer_name}'s appointment has been moved to <strong>${formatDate(newDate)}</strong> at <strong>${newTime}</strong>.`);
            } catch (err) {
                console.error('Error updating appointment:', err);
                showToast('Error updating appointment. Please try again.', 'error');
            }
        });
    } catch (err) {
        console.error('Error loading appointment:', err);
        showToast('Error loading appointment data.', 'error');
    }
}

async function deleteAppointment(id) {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        showConfirmModal(
            'Cancel Appointment',
            `Are you sure you want to cancel <strong>${data.customer_name}</strong>'s <strong>${capitalizeService(data.haircut)}</strong> on <strong>${formatDate(data.date)}</strong> at <strong>${data.time}</strong>?<br><br>This action cannot be undone.`,
            async () => {
                try {
                    const { error: delError } = await supabase
                        .from('appointments')
                        .update({ status: 'cancelled' })
                        .eq('id', id);

                    if (delError) throw delError;

                    loadAppointments();
                    loadStats();
                    showSuccessPopup('Appointment Cancelled', `${data.customer_name}'s appointment has been cancelled.`);
                } catch (err) {
                    console.error('Error cancelling appointment:', err);
                    showToast('Error cancelling appointment. Please try again.', 'error');
                }
            }
        );
    } catch (err) {
        console.error('Error loading appointment:', err);
        showToast('Error loading appointment data.', 'error');
    }
}

// ==================== HELPERS ====================

function capitalizeService(service) {
    const serviceNames = {
        fade: 'Fade',
        buzz: 'Buzz Cut',
        trim: 'Trim'
    };
    return serviceNames[service] || service;
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// ==================== MANAGE REVIEWS ====================

async function loadAdminReviews() {
    const container = document.getElementById('adminReviews');
    if (!container || !supabase) return;

    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--muted-text);padding:1rem;">No reviews yet.</p>';
            return;
        }

        const pending = data.filter(r => !r.approved);
        const approved = data.filter(r => r.approved);

        let html = '';

        if (pending.length > 0) {
            html += '<h4 style="color:var(--primary-color);margin-bottom:0.5rem;">Pending Approval (' + pending.length + ')</h4>';
            html += pending.map(r => renderAdminReviewCard(r, false)).join('');
        }

        if (approved.length > 0) {
            html += '<h4 style="color:var(--muted-text);margin:1rem 0 0.5rem;">Approved (' + approved.length + ')</h4>';
            html += approved.map(r => renderAdminReviewCard(r, true)).join('');
        }

        container.innerHTML = html;

        // Attach event listeners
        container.querySelectorAll('.review-approve-btn').forEach(btn => {
            btn.addEventListener('click', () => approveReview(btn.dataset.id));
        });
        container.querySelectorAll('.review-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteReview(btn.dataset.id));
        });
    } catch (err) {
        console.error('Error loading reviews:', err);
        container.innerHTML = '<p style="text-align:center;color:var(--muted-text);padding:1rem;">No reviews yet</p>';
    }
}

function renderAdminReviewCard(review, isApproved) {
    const name = review.profiles?.full_name || 'Unknown';
    const stars = '&#9733;'.repeat(review.rating) + '&#9734;'.repeat(5 - review.rating);
    const dateStr = new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
        <div class="admin-review-card ${isApproved ? '' : 'admin-review-pending'}">
            <div class="admin-review-info">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong>${name}</strong>
                    <span style="font-size:0.75rem;color:var(--muted-text);">${dateStr}</span>
                </div>
                <div style="color:var(--primary-color);letter-spacing:2px;">${stars}</div>
                ${review.comment ? `<p style="margin:0.25rem 0 0;font-size:0.85rem;color:var(--muted-text);">${review.comment}</p>` : ''}
            </div>
            <div class="admin-review-actions">
                ${!isApproved ? `<button class="review-approve-btn dash-btn dash-btn-primary" data-id="${review.id}" style="padding:0.3rem 0.75rem;font-size:0.75rem;">Approve</button>` : ''}
                <button class="review-delete-btn dash-btn dash-btn-danger" data-id="${review.id}" style="padding:0.3rem 0.75rem;font-size:0.75rem;">Delete</button>
            </div>
        </div>
    `;
}

async function approveReview(id) {
    try {
        const { error } = await supabase
            .from('reviews')
            .update({ approved: true })
            .eq('id', id);

        if (error) throw error;
        showToast('Review approved!', 'success');
        loadAdminReviews();
    } catch (err) {
        console.error('Error approving review:', err);
        showToast('Failed to approve review', 'error');
    }
}

async function deleteReview(id) {
    if (!confirm('Delete this review?')) return;

    try {
        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('Review deleted', 'success');
        loadAdminReviews();
    } catch (err) {
        console.error('Error deleting review:', err);
        showToast('Failed to delete review', 'error');
    }
}

console.log('Admin dashboard loaded');
