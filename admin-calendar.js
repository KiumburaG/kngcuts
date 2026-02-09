// Admin Calendar Management System - Supabase Version

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

// Check authentication on page load
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

    // User is authenticated, load data
    loadSchedule();
    loadBlockedDates();
    loadAppointments();
})();

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// Weekly Schedule Management
const dayToggles = document.querySelectorAll('.day-toggle');
const startTimeInputs = document.querySelectorAll('.start-time');
const endTimeInputs = document.querySelectorAll('.end-time');

dayToggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
        const day = e.target.dataset.day;
        const startTime = document.querySelector(`.start-time[data-day="${day}"]`);
        const endTime = document.querySelector(`.end-time[data-day="${day}"]`);

        if (e.target.checked) {
            startTime.disabled = false;
            endTime.disabled = false;
        } else {
            startTime.disabled = true;
            endTime.disabled = true;
        }
    });
});

// Save Schedule
document.getElementById('saveSchedule')?.addEventListener('click', async function() {
    if (!supabase) {
        showToast('Supabase not configured', 'error');
        return;
    }

    const btn = this;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const schedule = {};

    dayToggles.forEach(toggle => {
        const day = toggle.dataset.day;
        const startTime = document.querySelector(`.start-time[data-day="${day}"]`);
        const endTime = document.querySelector(`.end-time[data-day="${day}"]`);

        if (toggle.checked) {
            schedule[day] = {
                enabled: true,
                start: startTime.value,
                end: endTime.value
            };
        } else {
            schedule[day] = {
                enabled: false,
                start: null,
                end: null
            };
        }
    });

    try {
        const { error } = await supabase
            .from('settings')
            .upsert({
                key: 'schedule',
                value: schedule
            }, { onConflict: 'key' });

        if (error) throw error;

        showSuccessPopup('Schedule Saved', 'Your weekly availability has been updated successfully.');
    } catch (error) {
        console.error('Error saving schedule:', error);
        showToast('Error saving schedule: ' + (error.message || 'Please try again.'), 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

// Load Schedule
async function loadSchedule() {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'schedule')
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data && data.value) {
            const schedule = data.value;

            Object.keys(schedule).forEach(day => {
                const toggle = document.querySelector(`.day-toggle[data-day="${day}"]`);
                const startTime = document.querySelector(`.start-time[data-day="${day}"]`);
                const endTime = document.querySelector(`.end-time[data-day="${day}"]`);

                if (!toggle || !startTime || !endTime) return;

                if (schedule[day].enabled) {
                    toggle.checked = true;
                    startTime.disabled = false;
                    endTime.disabled = false;
                    startTime.value = schedule[day].start;
                    endTime.value = schedule[day].end;
                } else {
                    toggle.checked = false;
                    startTime.disabled = true;
                    endTime.disabled = true;
                }
            });
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

// Block Dates
const blockDateInput = document.getElementById('blockDate');
const blockReasonInput = document.getElementById('blockReason');
const addBlockBtn = document.getElementById('addBlockBtn');

// Set min date to today
if (blockDateInput) {
    blockDateInput.min = new Date().toISOString().split('T')[0];
}

addBlockBtn?.addEventListener('click', async () => {
    if (!supabase) {
        showToast('Supabase not configured', 'error');
        return;
    }

    const date = blockDateInput.value;
    const reason = blockReasonInput.value || 'Unavailable';

    if (!date) {
        showToast('Please select a date to block', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('blocked_dates')
            .insert([{ date, reason }]);

        if (error) throw error;

        blockDateInput.value = '';
        blockReasonInput.value = '';

        loadBlockedDates();
        showToast('Date blocked successfully!', 'success');
    } catch (error) {
        console.error('Error blocking date:', error);
        showToast('Error blocking date. Please try again.', 'error');
    }
});

// Load Blocked Dates
async function loadBlockedDates() {
    if (!supabase) return;

    const container = document.getElementById('blockedDatesList');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('blocked_dates')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No blocked dates</p>';
            return;
        }

        container.innerHTML = '';

        data.forEach(row => {
            const item = document.createElement('div');
            item.className = 'blocked-date-item';
            item.innerHTML = `
                <div>
                    <strong>${formatDate(row.date)}</strong>
                    <p style="font-size: 0.9rem; color: #666; margin-top: 0.3rem;">${row.reason}</p>
                </div>
                <button class="remove-block-btn" onclick="removeBlockedDate('${row.id}')">Remove</button>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading blocked dates:', error);
    }
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

    setTimeout(() => { if (overlay.parentNode) closeModal(); }, 3000);
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

    overlay.querySelector('.confirm-btn-danger').addEventListener('click', () => {
        closeModal();
        onConfirm();
    });

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    document.body.appendChild(overlay);
}

// Remove Blocked Date
async function removeBlockedDate(id) {
    showConfirmModal(
        'Remove Blocked Date',
        'Are you sure you want to remove this blocked date? Customers will be able to book this date again.',
        async () => {
            if (!supabase) return;

            try {
                const { error } = await supabase
                    .from('blocked_dates')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                loadBlockedDates();
                showToast('Blocked date removed', 'success');
            } catch (error) {
                console.error('Error removing blocked date:', error);
                showToast('Error removing blocked date. Please try again.', 'error');
            }
        }
    );
}

window.removeBlockedDate = removeBlockedDate;

// Load Appointments
async function loadAppointments() {
    if (!supabase) return;

    const container = document.getElementById('appointmentsList');
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('status', 'confirmed')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-appointments"><p>No upcoming appointments</p></div>';
            return;
        }

        container.innerHTML = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let hasUpcoming = false;

        data.forEach(row => {
            const [y, m, d] = row.date.split('-');
            const appointmentDate = new Date(y, m - 1, d);
            if (appointmentDate >= today) {
                hasUpcoming = true;
                const card = createAppointmentCard(row.id, row);
                container.appendChild(card);
            }
        });

        if (!hasUpcoming) {
            container.innerHTML = '<div class="no-appointments"><p>No upcoming appointments</p></div>';
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Create Appointment Card
function createAppointmentCard(id, data) {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    card.style.position = 'relative';

    const extrasText = data.extras && data.extras.length > 0
        ? data.extras.map(e => e.name).join(', ')
        : 'None';

    card.innerHTML = `
        <div class="appointment-content">
            <h4>${data.customer_name}</h4>
            <p><strong>Service:</strong> ${capitalizeService(data.haircut)}</p>
            <p><strong>Extras:</strong> ${extrasText}</p>
            <p><strong>Date:</strong> ${formatDate(data.date)}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Phone:</strong> ${data.customer_phone}</p>
            <p><strong>Email:</strong> ${data.customer_email}</p>
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            <p><strong>Total:</strong> $${parseFloat(data.total).toFixed(2)} (Deposit paid: $${parseFloat(data.deposit_amount).toFixed(2)})</p>
        </div>
        <div class="appointment-actions" style="display: none; position: absolute; top: 10px; right: 10px; background: white; padding: 0.5rem; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 10;">
            <button onclick="editAppointment('${id}')" style="background: var(--primary-color); color: var(--secondary-color); border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; margin-right: 0.5rem; font-weight: 600;">Edit</button>
            <button onclick="deleteAppointment('${id}')" style="background: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; font-weight: 600;">Cancel</button>
        </div>
    `;

    card.addEventListener('mouseenter', () => {
        card.querySelector('.appointment-actions').style.display = 'block';
    });

    card.addEventListener('mouseleave', () => {
        card.querySelector('.appointment-actions').style.display = 'none';
    });

    return card;
}

// Edit Appointment
async function editAppointment(id) {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const newDate = prompt('Enter new date (YYYY-MM-DD):', data.date);
        if (!newDate) return;

        const newTime = prompt('Enter new time (e.g., 10:00 AM):', data.time);
        if (!newTime) return;

        const { error: updateError } = await supabase
            .from('appointments')
            .update({
                date: newDate,
                time: newTime
            })
            .eq('id', id);

        if (updateError) throw updateError;

        showToast('Appointment updated successfully!', 'success');
        loadAppointments();
    } catch (error) {
        console.error('Error editing appointment:', error);
        showToast('Error editing appointment. Please try again.', 'error');
    }
}

window.editAppointment = editAppointment;

// Delete (Cancel) Appointment
async function deleteAppointment(id) {
    showConfirmModal(
        'Cancel Appointment',
        'Are you sure you want to cancel this appointment? This will cancel the customer\'s booking.',
        async () => {
            if (!supabase) return;

            try {
                const { error } = await supabase
                    .from('appointments')
                    .update({ status: 'cancelled' })
                    .eq('id', id);

                if (error) throw error;

                showToast('Appointment cancelled', 'success');
                loadAppointments();
            } catch (error) {
                console.error('Error cancelling appointment:', error);
                showToast('Error cancelling appointment. Please try again.', 'error');
            }
        }
    );
}

window.deleteAppointment = deleteAppointment;

// Helper Functions
function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function capitalizeService(service) {
    const serviceNames = {
        fade: 'Fade',
        buzz: 'Buzz Cut',
        trim: 'Trim'
    };
    return serviceNames[service] || service;
}

console.log('Admin calendar system loaded (Supabase)');
