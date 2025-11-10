// Admin Calendar Management System

let db, auth;

if (typeof firebase !== 'undefined') {
    db = firebase.firestore();
    auth = firebase.auth();

    // Check authentication
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // Redirect to home if not logged in
            alert('Please login as admin to access this page');
            window.location.href = 'index.html';
        } else {
            loadSchedule();
            loadBlockedDates();
            loadAppointments();
        }
    });
} else {
    console.warn('Firebase not loaded');
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (auth) {
        await auth.signOut();
        window.location.href = 'index.html';
    }
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
document.getElementById('saveSchedule')?.addEventListener('click', async () => {
    if (!db) {
        alert('Firebase not configured');
        return;
    }

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
        await db.collection('settings').doc('schedule').set({
            weeklySchedule: schedule,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Schedule saved successfully!');
    } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Error saving schedule. Please try again.');
    }
});

// Load Schedule
async function loadSchedule() {
    if (!db) return;

    try {
        const doc = await db.collection('settings').doc('schedule').get();

        if (doc.exists) {
            const data = doc.data();
            const schedule = data.weeklySchedule;

            Object.keys(schedule).forEach(day => {
                const toggle = document.querySelector(`.day-toggle[data-day="${day}"]`);
                const startTime = document.querySelector(`.start-time[data-day="${day}"]`);
                const endTime = document.querySelector(`.end-time[data-day="${day}"]`);

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
    if (!db) {
        alert('Firebase not configured');
        return;
    }

    const date = blockDateInput.value;
    const reason = blockReasonInput.value || 'Unavailable';

    if (!date) {
        alert('Please select a date to block');
        return;
    }

    try {
        await db.collection('blockedDates').add({
            date: date,
            reason: reason,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        blockDateInput.value = '';
        blockReasonInput.value = '';

        loadBlockedDates();
        alert('Date blocked successfully!');
    } catch (error) {
        console.error('Error blocking date:', error);
        alert('Error blocking date. Please try again.');
    }
});

// Load Blocked Dates
async function loadBlockedDates() {
    if (!db) return;

    const container = document.getElementById('blockedDatesList');
    if (!container) return;

    try {
        const snapshot = await db.collection('blockedDates')
            .orderBy('date', 'asc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No blocked dates</p>';
            return;
        }

        container.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'blocked-date-item';
            item.innerHTML = `
                <div>
                    <strong>${formatDate(data.date)}</strong>
                    <p style="font-size: 0.9rem; color: #666; margin-top: 0.3rem;">${data.reason}</p>
                </div>
                <button class="remove-block-btn" onclick="removeBlockedDate('${doc.id}')">Remove</button>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading blocked dates:', error);
    }
}

// Remove Blocked Date
async function removeBlockedDate(docId) {
    if (!confirm('Remove this blocked date?')) return;

    if (!db) return;

    try {
        await db.collection('blockedDates').doc(docId).delete();
        loadBlockedDates();
        alert('Blocked date removed successfully!');
    } catch (error) {
        console.error('Error removing blocked date:', error);
        alert('Error removing blocked date. Please try again.');
    }
}

window.removeBlockedDate = removeBlockedDate;

// Load Appointments
async function loadAppointments() {
    if (!db) return;

    const container = document.getElementById('appointmentsList');
    if (!container) return;

    try {
        // Get appointments from today onwards
        const today = new Date().toLocaleDateString('en-US');

        const snapshot = await db.collection('appointments')
            .where('status', '==', 'confirmed')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<div class="no-appointments"><p>No upcoming appointments</p></div>';
            return;
        }

        container.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            const appointmentDate = new Date(data.date);
            const isPast = appointmentDate < new Date();

            if (!isPast) {
                const card = createAppointmentCard(doc.id, data);
                container.appendChild(card);
            }
        });

        if (container.children.length === 0) {
            container.innerHTML = '<div class="no-appointments"><p>No upcoming appointments</p></div>';
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Create Appointment Card
function createAppointmentCard(docId, data) {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    card.style.position = 'relative';

    const extrasText = data.extras && data.extras.length > 0
        ? data.extras.map(e => e.name).join(', ')
        : 'None';

    card.innerHTML = `
        <div class="appointment-content">
            <h4>${data.customerName}</h4>
            <p><strong>Service:</strong> ${capitalizeService(data.haircut)}</p>
            <p><strong>Extras:</strong> ${extrasText}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Phone:</strong> ${data.customerPhone}</p>
            <p><strong>Email:</strong> ${data.customerEmail}</p>
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            <p><strong>Total:</strong> $${data.total.toFixed(2)} (Deposit paid: $${data.depositAmount})</p>
        </div>
        <div class="appointment-actions" style="display: none; position: absolute; top: 10px; right: 10px; background: white; padding: 0.5rem; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 10;">
            <button onclick="editAppointment('${docId}')" style="background: var(--primary-color); color: var(--secondary-color); border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; margin-right: 0.5rem; font-weight: 600;">Edit</button>
            <button onclick="deleteAppointment('${docId}')" style="background: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; font-weight: 600;">Delete</button>
        </div>
    `;

    // Show actions on hover
    card.addEventListener('mouseenter', () => {
        card.querySelector('.appointment-actions').style.display = 'block';
    });

    card.addEventListener('mouseleave', () => {
        card.querySelector('.appointment-actions').style.display = 'none';
    });

    return card;
}

// Edit Appointment
async function editAppointment(docId) {
    if (!db) return;

    try {
        const doc = await db.collection('appointments').doc(docId).get();
        const data = doc.data();

        const newDate = prompt('Enter new date (MM/DD/YYYY):', data.date);
        if (!newDate) return;

        const newTime = prompt('Enter new time (e.g., 10:00 AM):', data.time);
        if (!newTime) return;

        await db.collection('appointments').doc(docId).update({
            date: newDate,
            time: newTime,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Appointment updated successfully!');
        loadAppointments();

        // TODO: Send notification email to customer about the change
    } catch (error) {
        console.error('Error editing appointment:', error);
        alert('Error editing appointment. Please try again.');
    }
}

window.editAppointment = editAppointment;

// Delete Appointment
async function deleteAppointment(docId) {
    if (!confirm('Are you sure you want to delete this appointment? This will cancel the customer\'s booking.')) {
        return;
    }

    if (!db) return;

    try {
        await db.collection('appointments').doc(docId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Appointment cancelled successfully!');
        loadAppointments();

        // TODO: Send cancellation notification to customer
    } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Error deleting appointment. Please try again.');
    }
}

window.deleteAppointment = deleteAppointment;

// Helper Functions
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
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

console.log('Admin calendar system loaded');
