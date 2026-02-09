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

// Helper: Supabase fetch wrapper that bypasses the client's internal AbortController
async function supabaseFetch(path, method, body) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    };
    if (method === 'POST') headers['Prefer'] = 'resolution=merge-duplicates';

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `Request failed: ${res.status}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

// ==================== STATE ====================
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let adminCurrentMonth = new Date();
let previewCurrentMonth = new Date();
let weeklySchedule = null;
let blockedDatesData = [];
let previewSelectedDate = null;

// ==================== AUTH CHECK ====================
let adminPageLoaded = false;

(async function checkAuth() {
    if (!supabase) {
        showToast('Supabase not configured', 'error');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    function onReady() {
        if (adminPageLoaded) return;
        adminPageLoaded = true;

        if (typeof window.kngAuth !== 'undefined' && window.kngAuth.isLoggedIn()) {
            loadSchedule();
            loadBlockedDates();
            loadAppointments();
        } else {
            showToast('Please login as admin to access this page', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        }
    }

    if (typeof window.kngAuth !== 'undefined' && window.kngAuth.isReady()) {
        onReady();
    } else {
        window.addEventListener('kng-auth-ready', onReady, { once: true });
        setTimeout(onReady, 3000);
    }
})();

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// ==================== WEEKLY SCHEDULE ====================
const dayToggles = document.querySelectorAll('.day-toggle');
const startTimeInputs = document.querySelectorAll('.start-time');
const endTimeInputs = document.querySelectorAll('.end-time');
const breakToggles = document.querySelectorAll('.break-toggle');

// Day toggle listeners — enable/disable time + break inputs
dayToggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
        const day = e.target.dataset.day;
        const startTime = document.querySelector(`.start-time[data-day="${day}"]`);
        const endTime = document.querySelector(`.end-time[data-day="${day}"]`);
        const breakToggle = document.querySelector(`.break-toggle[data-day="${day}"]`);
        const breakStart = document.querySelector(`.break-start[data-day="${day}"]`);
        const breakEnd = document.querySelector(`.break-end[data-day="${day}"]`);

        if (e.target.checked) {
            startTime.disabled = false;
            endTime.disabled = false;
            breakToggle.disabled = false;
        } else {
            startTime.disabled = true;
            endTime.disabled = true;
            breakToggle.disabled = true;
            breakToggle.checked = false;
            breakStart.disabled = true;
            breakEnd.disabled = true;
        }
    });
});

// Break toggle listeners — enable/disable break time inputs
breakToggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
        const day = e.target.dataset.day;
        const breakStart = document.querySelector(`.break-start[data-day="${day}"]`);
        const breakEnd = document.querySelector(`.break-end[data-day="${day}"]`);

        breakStart.disabled = !e.target.checked;
        breakEnd.disabled = !e.target.checked;
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
        const breakToggle = document.querySelector(`.break-toggle[data-day="${day}"]`);
        const breakStart = document.querySelector(`.break-start[data-day="${day}"]`);
        const breakEnd = document.querySelector(`.break-end[data-day="${day}"]`);

        if (toggle.checked) {
            const dayConfig = {
                enabled: true,
                start: startTime.value,
                end: endTime.value
            };

            if (breakToggle.checked && breakStart.value && breakEnd.value) {
                // Validate break is within operating hours
                const opStart = parseInt(startTime.value.split(':')[0], 10);
                const opEnd = parseInt(endTime.value.split(':')[0], 10);
                const bStart = parseInt(breakStart.value.split(':')[0], 10);
                const bEnd = parseInt(breakEnd.value.split(':')[0], 10);

                if (bStart < opStart || bEnd > opEnd || bStart >= bEnd) {
                    showToast(`Invalid break time for ${day}: must be within operating hours`, 'error');
                    btn.disabled = false;
                    btn.textContent = originalText;
                    return;
                }

                dayConfig.breakEnabled = true;
                dayConfig.breakStart = breakStart.value;
                dayConfig.breakEnd = breakEnd.value;
            } else {
                dayConfig.breakEnabled = false;
                dayConfig.breakStart = null;
                dayConfig.breakEnd = null;
            }

            schedule[day] = dayConfig;
        } else {
            schedule[day] = {
                enabled: false,
                start: null,
                end: null,
                breakEnabled: false,
                breakStart: null,
                breakEnd: null
            };
        }
    });

    try {
        await supabaseFetch('settings', 'POST', {
            key: 'schedule',
            value: schedule
        });

        weeklySchedule = schedule;
        renderAdminCalendar();
        renderClientPreview();

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
            weeklySchedule = data.value;

            Object.keys(weeklySchedule).forEach(day => {
                const config = weeklySchedule[day];
                const toggle = document.querySelector(`.day-toggle[data-day="${day}"]`);
                const startTime = document.querySelector(`.start-time[data-day="${day}"]`);
                const endTime = document.querySelector(`.end-time[data-day="${day}"]`);
                const breakToggle = document.querySelector(`.break-toggle[data-day="${day}"]`);
                const breakStart = document.querySelector(`.break-start[data-day="${day}"]`);
                const breakEnd = document.querySelector(`.break-end[data-day="${day}"]`);

                if (!toggle || !startTime || !endTime) return;

                if (config.enabled) {
                    toggle.checked = true;
                    startTime.disabled = false;
                    endTime.disabled = false;
                    startTime.value = config.start;
                    endTime.value = config.end;

                    // Break time
                    if (breakToggle) {
                        breakToggle.disabled = false;
                        if (config.breakEnabled) {
                            breakToggle.checked = true;
                            if (breakStart) { breakStart.disabled = false; breakStart.value = config.breakStart; }
                            if (breakEnd) { breakEnd.disabled = false; breakEnd.value = config.breakEnd; }
                        } else {
                            breakToggle.checked = false;
                            if (breakStart) breakStart.disabled = true;
                            if (breakEnd) breakEnd.disabled = true;
                        }
                    }
                } else {
                    toggle.checked = false;
                    startTime.disabled = true;
                    endTime.disabled = true;
                    if (breakToggle) { breakToggle.disabled = true; breakToggle.checked = false; }
                    if (breakStart) breakStart.disabled = true;
                    if (breakEnd) breakEnd.disabled = true;
                }
            });
        }

        renderAdminCalendar();
        renderClientPreview();
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

// ==================== BLOCKED DATES ====================
const blockDateInput = document.getElementById('blockDate');
const blockReasonInput = document.getElementById('blockReason');
const addBlockBtn = document.getElementById('addBlockBtn');

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

async function loadBlockedDates() {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('blocked_dates')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;

        blockedDatesData = data || [];

        // Render blocked dates list
        const container = document.getElementById('blockedDatesList');
        if (container) {
            if (blockedDatesData.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #999;">No blocked dates</p>';
            } else {
                container.innerHTML = '';
                blockedDatesData.forEach(row => {
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
            }
        }

        renderAdminCalendar();
        renderClientPreview();
    } catch (error) {
        console.error('Error loading blocked dates:', error);
    }
}

// ==================== HELPER FUNCTIONS ====================
function formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isDayClosedForDate(date) {
    if (!weeklySchedule) return false;
    const dayName = DAY_NAMES[date.getDay()];
    const dayConfig = weeklySchedule[dayName];
    if (!dayConfig) return false;
    return !dayConfig.enabled;
}

function isDateBlockedCheck(dateStr) {
    return blockedDatesData.some(d => d.date === dateStr);
}

function getBlockedDateEntry(dateStr) {
    return blockedDatesData.find(d => d.date === dateStr);
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateShort(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// ==================== ADMIN VISUAL CALENDAR ====================
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

// Admin calendar navigation
document.getElementById('adminPrevMonth')?.addEventListener('click', () => {
    adminCurrentMonth.setMonth(adminCurrentMonth.getMonth() - 1);
    renderAdminCalendar();
});

document.getElementById('adminNextMonth')?.addEventListener('click', () => {
    adminCurrentMonth.setMonth(adminCurrentMonth.getMonth() + 1);
    renderAdminCalendar();
});

function renderAdminCalendar() {
    const container = document.getElementById('adminCalendar');
    const monthLabel = document.getElementById('adminCalendarMonth');
    if (!container || !monthLabel) return;

    const year = adminCurrentMonth.getFullYear();
    const month = adminCurrentMonth.getMonth();
    monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayLabels.forEach(d => {
        html += `<div class="admin-cal-header">${d}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
        html += '<div class="admin-cal-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateStr(date);
        const isPast = date < today;
        const isClosed = isDayClosedForDate(date);
        const isBlocked = isDateBlockedCheck(dateStr);

        let status = 'open';
        let classes = 'admin-cal-day';

        if (isPast) {
            status = 'past';
            classes += ' past';
        } else if (isBlocked) {
            status = 'blocked';
            classes += ' blocked';
        } else if (isClosed) {
            status = 'closed';
            classes += ' closed';
        } else {
            classes += ' open';
        }

        const isToday = date.getTime() === today.getTime();
        if (isToday) classes += ' today';

        // Clickable: open days can be blocked, blocked days can be unblocked
        const clickable = !isPast && (status === 'open' || status === 'blocked');
        if (clickable) classes += ' clickable';

        const blockedEntry = isBlocked ? getBlockedDateEntry(dateStr) : null;
        const tooltip = blockedEntry ? `title="${blockedEntry.reason}"` : (isClosed && !isPast ? 'title="Closed"' : '');

        html += `<div class="${classes}" data-date="${dateStr}" data-status="${status}" ${tooltip} ${clickable ? `onclick="handleAdminDayClick('${dateStr}','${status}')"` : ''}>${day}</div>`;
    }

    container.innerHTML = html;
}

// Handle clicking a day on the admin calendar
function handleAdminDayClick(dateStr, status) {
    if (status === 'open') {
        // Show block popup
        showBlockReasonPopup(dateStr);
    } else if (status === 'blocked') {
        // Confirm unblock
        const entry = getBlockedDateEntry(dateStr);
        showConfirmModal(
            'Unblock Date',
            `Are you sure you want to unblock ${formatDateShort(dateStr)}? Customers will be able to book this date again.`,
            () => unblockDateFromCalendar(entry.id, dateStr)
        );
    }
}
window.handleAdminDayClick = handleAdminDayClick;

function showBlockReasonPopup(dateStr) {
    const popup = document.getElementById('blockReasonPopup');
    const dateLabel = document.getElementById('blockReasonDate');
    const reasonInput = document.getElementById('blockReasonInput');

    dateLabel.textContent = formatDateShort(dateStr);
    reasonInput.value = '';
    popup.style.display = 'flex';
    popup.dataset.dateStr = dateStr;
    reasonInput.focus();
}

document.getElementById('blockReasonCancel')?.addEventListener('click', () => {
    document.getElementById('blockReasonPopup').style.display = 'none';
});

document.getElementById('blockReasonConfirm')?.addEventListener('click', async () => {
    const popup = document.getElementById('blockReasonPopup');
    const dateStr = popup.dataset.dateStr;
    const reason = document.getElementById('blockReasonInput').value || 'Unavailable';

    popup.style.display = 'none';
    await blockDateFromCalendar(dateStr, reason);
});

// Close popup on overlay click
document.getElementById('blockReasonPopup')?.addEventListener('click', (e) => {
    if (e.target.id === 'blockReasonPopup') {
        e.target.style.display = 'none';
    }
});

async function blockDateFromCalendar(dateStr, reason) {
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('blocked_dates')
            .insert([{ date: dateStr, reason }]);

        if (error) throw error;

        showToast(`${formatDateShort(dateStr)} blocked`, 'success');
        await loadBlockedDates();
    } catch (error) {
        console.error('Error blocking date:', error);
        showToast('Error blocking date. Please try again.', 'error');
    }
}

async function unblockDateFromCalendar(id, dateStr) {
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('blocked_dates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showToast(`${formatDateShort(dateStr)} unblocked`, 'success');
        await loadBlockedDates();
    } catch (error) {
        console.error('Error unblocking date:', error);
        showToast('Error unblocking date. Please try again.', 'error');
    }
}

// ==================== CLIENT PREVIEW ====================

// Preview calendar navigation
document.getElementById('previewPrevMonth')?.addEventListener('click', () => {
    const now = new Date();
    const minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prev = new Date(previewCurrentMonth.getFullYear(), previewCurrentMonth.getMonth() - 1, 1);
    if (prev >= minMonth) {
        previewCurrentMonth.setMonth(previewCurrentMonth.getMonth() - 1);
        renderClientPreview();
    }
});

document.getElementById('previewNextMonth')?.addEventListener('click', () => {
    const now = new Date();
    const maxMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const next = new Date(previewCurrentMonth.getFullYear(), previewCurrentMonth.getMonth() + 1, 1);
    if (next <= maxMonth) {
        previewCurrentMonth.setMonth(previewCurrentMonth.getMonth() + 1);
        renderClientPreview();
    }
});

function renderClientPreview() {
    const container = document.getElementById('previewCalendar');
    const monthLabel = document.getElementById('previewCalendarMonth');
    if (!container || !monthLabel) return;

    const year = previewCurrentMonth.getFullYear();
    const month = previewCurrentMonth.getMonth();
    monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

    const now = new Date();
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Nav arrow states
    const minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const maxMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const currentMonth1st = new Date(year, month, 1);
    const nextMonth1st = new Date(year, month + 1, 1);

    const prevBtn = document.getElementById('previewPrevMonth');
    const nextBtn = document.getElementById('previewNextMonth');
    if (prevBtn) {
        prevBtn.disabled = currentMonth1st <= minMonth;
        prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '1';
    }
    if (nextBtn) {
        nextBtn.disabled = nextMonth1st > maxMonth;
        nextBtn.style.opacity = nextBtn.disabled ? '0.3' : '1';
    }

    let html = '';
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayLabels.forEach(d => {
        html += `<div class="preview-cal-header">${d}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
        html += '<div class="preview-cal-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateStr(date);
        const isPast = date < today;
        const isToday = date.getTime() === today.getTime();
        const isBeyondMax = date > maxDate;
        const isBlocked = isDateBlockedCheck(dateStr);
        const isClosed = isDayClosedForDate(date);
        const isUnavailable = isPast || isToday || isBlocked || isBeyondMax || isClosed;

        let classes = 'preview-cal-day';
        if (isPast || isBeyondMax) classes += ' past';
        if (isToday) classes += ' today';
        if (isUnavailable) classes += ' disabled';
        if (isBlocked) classes += ' blocked';
        if (isClosed && !isPast && !isBeyondMax) classes += ' closed';
        if (!isUnavailable) classes += ' available';

        const isSelected = previewSelectedDate && formatDateStr(previewSelectedDate) === dateStr;
        if (isSelected) classes += ' selected';

        const onclick = isUnavailable ? '' : `onclick="selectPreviewDate(${year}, ${month + 1}, ${day})"`;

        html += `<div class="${classes}" data-date="${dateStr}" ${onclick}>${day}</div>`;
    }

    container.innerHTML = html;
}

async function selectPreviewDate(year, month, day) {
    previewSelectedDate = new Date(year, month - 1, day);
    renderClientPreview();

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const slotsContainer = document.getElementById('previewTimeSlots');
    slotsContainer.innerHTML = '<div class="preview-loading"><div class="spinner"></div><p>Loading time slots...</p></div>';

    await renderPreviewTimeSlots(dateStr);
}
window.selectPreviewDate = selectPreviewDate;

async function renderPreviewTimeSlots(dateStr) {
    const container = document.getElementById('previewTimeSlots');
    if (!container) return;

    // Get day config
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dayName = DAY_NAMES[date.getDay()];
    const dayConfig = weeklySchedule ? weeklySchedule[dayName] : null;

    if (!dayConfig || !dayConfig.enabled) {
        container.innerHTML = '<p class="preview-hint">This day is closed.</p>';
        return;
    }

    // Generate time slots (with break support)
    const slots = generatePreviewTimeSlots(dayConfig);

    // Fetch booked slots
    let booked = [];
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('time')
            .eq('date', dateStr)
            .eq('status', 'confirmed');

        if (!error && data) {
            booked = data.map(a => a.time);
        }
    } catch (err) {
        console.error('Error loading booked slots for preview:', err);
    }

    let html = `<h4>${formatDateShort(dateStr)}</h4>`;

    if (slots.morning.length > 0) {
        html += '<div class="preview-slot-group"><span class="preview-slot-label">Morning</span><div class="preview-slots-row">';
        slots.morning.forEach(time => {
            const isBooked = booked.includes(time);
            html += `<span class="preview-time-slot ${isBooked ? 'booked' : ''}">${time}${isBooked ? ' <small>(Booked)</small>' : ''}</span>`;
        });
        html += '</div></div>';
    }

    if (slots.afternoon.length > 0) {
        html += '<div class="preview-slot-group"><span class="preview-slot-label">Afternoon</span><div class="preview-slots-row">';
        slots.afternoon.forEach(time => {
            const isBooked = booked.includes(time);
            html += `<span class="preview-time-slot ${isBooked ? 'booked' : ''}">${time}${isBooked ? ' <small>(Booked)</small>' : ''}</span>`;
        });
        html += '</div></div>';
    }

    if (slots.morning.length === 0 && slots.afternoon.length === 0) {
        html += '<p class="preview-hint">No available time slots.</p>';
    }

    container.innerHTML = html;
}

function generatePreviewTimeSlots(dayConfig) {
    if (!dayConfig || !dayConfig.enabled) return { morning: [], afternoon: [] };

    const startHour = parseInt(dayConfig.start.split(':')[0], 10);
    const endHour = parseInt(dayConfig.end.split(':')[0], 10);

    let breakStartHour = null;
    let breakEndHour = null;
    if (dayConfig.breakEnabled && dayConfig.breakStart && dayConfig.breakEnd) {
        breakStartHour = parseInt(dayConfig.breakStart.split(':')[0], 10);
        breakEndHour = parseInt(dayConfig.breakEnd.split(':')[0], 10);
    }

    const morning = [];
    const afternoon = [];

    for (let h = startHour; h < endHour; h++) {
        if (breakStartHour !== null && h >= breakStartHour && h < breakEndHour) continue;

        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const label = `${hour12}:00 ${ampm}`;

        if (h < 12) {
            morning.push(label);
        } else {
            afternoon.push(label);
        }
    }

    return { morning, afternoon };
}

// ==================== MODALS ====================

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
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    document.body.appendChild(overlay);
}

// ==================== BLOCKED DATE REMOVAL ====================

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

// ==================== APPOINTMENTS ====================

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
            .update({ date: newDate, time: newTime })
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

function capitalizeService(service) {
    const serviceNames = {
        fade: 'Fade',
        buzz: 'Buzz Cut',
        trim: 'Trim'
    };
    return serviceNames[service] || service;
}

console.log('Admin calendar system loaded (Supabase)');
