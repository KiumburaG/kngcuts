// Booking System JavaScript - Supabase Version

// Toast Notification System (shared with admin)
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

// State Management
let bookingData = {
    haircut: null,
    haircutPrice: 0,
    extras: [],
    extrasTotal: 0,
    date: null,
    time: null,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
    total: 0
};

let currentStep = 1;
let currentDate = new Date();
let selectedDate = null;
let blockedDates = []; // Array of { date, reason }
let bookedSlots = {};

const PROGRESS_KEY = 'kngcuts-booking-progress';
const PROGRESS_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Step Navigation
function nextStep() {
    if (!validateStep(currentStep)) {
        return;
    }

    // Intercept step 3 -> 4: show non-refundable disclaimer
    if (currentStep === 3) {
        showDisclaimerPopup();
        return;
    }

    advanceToStep(currentStep + 1);
}

function advanceToStep(targetStep) {
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('completed');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');

    currentStep = targetStep;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');

    if (currentStep === 3) {
        updateBookingSummary();
        // Pre-fill from auth profile if logged in and fields are empty
        prefillFromAuth();
    }

    if (currentStep === 4) {
        updateConfirmationDetails();
        initializeStripePayment();
    }

    saveProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Non-refundable disclaimer popup
function showDisclaimerPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal disclaimer-modal">
            <div class="confirm-modal-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </div>
            <h3>Non-Refundable Booking Fee</h3>
            <p>The <strong>$5.00 booking fee is non-refundable</strong>. This fee secures your appointment slot and is included in your total service cost.</p>
            <div class="confirm-modal-actions">
                <button class="confirm-btn-cancel" id="disclaimerDecline">Decline</button>
                <button class="confirm-btn-save" id="disclaimerAgree">I Agree &mdash; Continue</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('disclaimerAgree').addEventListener('click', () => {
        overlay.remove();
        advanceToStep(4);
    });

    document.getElementById('disclaimerDecline').addEventListener('click', () => {
        overlay.remove();
        clearProgress();
        window.location.href = 'index.html?declined=true';
    });
}

function prevStep() {
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');

    currentStep--;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('completed');

    saveProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.nextStep = nextStep;
window.prevStep = prevStep;

// Validation
function validateStep(step) {
    if (step === 1) {
        const haircutSelected = document.querySelector('input[name="haircut"]:checked');
        if (!haircutSelected) {
            showToast('Please select a haircut service', 'warning');
            return false;
        }
        return true;
    }

    if (step === 2) {
        if (!bookingData.date || !bookingData.time) {
            showToast('Please select a date and time', 'warning');
            return false;
        }
        return true;
    }

    if (step === 3) {
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();

        if (!name || !email || !phone) {
            showToast('Please fill in all required fields', 'warning');
            return false;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address', 'warning');
            return false;
        }

        // Validate phone: strip formatting, must be 10+ digits
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length < 10) {
            showToast('Please enter a valid phone number (at least 10 digits)', 'warning');
            return false;
        }

        bookingData.customerName = name;
        bookingData.customerEmail = email;
        bookingData.customerPhone = phone;
        bookingData.notes = document.getElementById('notes').value.trim();

        return true;
    }

    return true;
}

// Service Selection
document.addEventListener('DOMContentLoaded', function() {
    // Prevent outer form from submitting on Enter key
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    }

    const haircutRadios = document.querySelectorAll('input[name="haircut"]');
    const extrasCheckboxes = document.querySelectorAll('input[name="extras"]');

    haircutRadios.forEach(radio => {
        radio.addEventListener('change', updatePricing);
    });

    extrasCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updatePricing);
    });

    // Load blocked dates from Supabase
    loadBlockedDates();

    // Initialize calendar
    renderCalendar();

    // Restore saved progress
    restoreProgress();

    document.getElementById('prevMonth').addEventListener('click', () => {
        const now = new Date();
        const minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        if (prev >= minMonth) {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        }
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        const now = new Date();
        const maxMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
        const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        if (next <= maxMonth) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        }
    });
});

// ==================== BOOKING PROGRESS PERSISTENCE ====================

function saveProgress() {
    try {
        const progress = {
            bookingData: bookingData,
            currentStep: currentStep,
            selectedDate: selectedDate ? selectedDate.toISOString() : null,
            timestamp: Date.now()
        };
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
        console.log('Could not save booking progress');
    }
}

function restoreProgress() {
    try {
        const stored = localStorage.getItem(PROGRESS_KEY);
        if (!stored) {
            prefillFromAuth();
            return;
        }

        const progress = JSON.parse(stored);

        // Check expiry (24 hours)
        if (Date.now() - progress.timestamp > PROGRESS_EXPIRY_MS) {
            clearProgress();
            prefillFromAuth();
            return;
        }

        // Restore bookingData
        if (progress.bookingData) {
            Object.assign(bookingData, progress.bookingData);
        }

        // Restore selected date
        if (progress.selectedDate) {
            selectedDate = new Date(progress.selectedDate);
            currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        }

        // Restore UI state
        // Step 1: Select haircut radio
        if (bookingData.haircut) {
            const radio = document.getElementById(bookingData.haircut);
            if (radio) radio.checked = true;
        }

        // Step 1: Select extras checkboxes
        if (bookingData.extras && bookingData.extras.length > 0) {
            bookingData.extras.forEach(extra => {
                const cb = document.getElementById(extra.name);
                if (cb) cb.checked = true;
            });
        }

        // Update pricing display
        if (bookingData.haircut) {
            updatePricing();
        }

        // Step 3: Fill form fields
        if (bookingData.customerName) {
            const nameEl = document.getElementById('customerName');
            if (nameEl) nameEl.value = bookingData.customerName;
        }
        if (bookingData.customerEmail) {
            const emailEl = document.getElementById('customerEmail');
            if (emailEl) emailEl.value = bookingData.customerEmail;
        }
        if (bookingData.customerPhone) {
            const phoneEl = document.getElementById('customerPhone');
            if (phoneEl) phoneEl.value = bookingData.customerPhone;
        }
        if (bookingData.notes) {
            const notesEl = document.getElementById('notes');
            if (notesEl) notesEl.value = bookingData.notes;
        }

        // Navigate to saved step (but not step 4 - require re-confirmation)
        const targetStep = Math.min(progress.currentStep || 1, 3);
        if (targetStep > 1) {
            // Mark previous steps completed and navigate
            for (let s = 1; s < targetStep; s++) {
                document.querySelector(`.form-step[data-step="${s}"]`).classList.remove('active');
                document.querySelector(`.step[data-step="${s}"]`).classList.add('completed');
                document.querySelector(`.step[data-step="${s}"]`).classList.remove('active');
            }
            currentStep = targetStep;
            document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
            document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');

            if (currentStep === 3) {
                updateBookingSummary();
            }

            // Re-render calendar with selected date
            renderCalendar();

            // If on step 2 and date was selected, load time slots
            if (currentStep === 2 && bookingData.date) {
                loadBookedSlots(bookingData.date).then(booked => {
                    bookedSlots[bookingData.date] = booked;
                    renderTimeSlots(booked);
                    if (bookingData.time) {
                        document.getElementById('step2Next').disabled = false;
                    }
                });
            }

            showToast('Your booking progress has been restored', 'info');
        }
    } catch (e) {
        console.log('Could not restore booking progress');
        clearProgress();
    }
}

function clearProgress() {
    localStorage.removeItem(PROGRESS_KEY);
}

function prefillFromAuth() {
    if (typeof window.kngAuth === 'undefined' || !window.kngAuth.isLoggedIn()) return;

    const profile = window.kngAuth.getProfile();
    const user = window.kngAuth.getUser();
    if (!profile && !user) return;

    const nameEl = document.getElementById('customerName');
    const emailEl = document.getElementById('customerEmail');
    const phoneEl = document.getElementById('customerPhone');

    if (nameEl && !nameEl.value && profile?.full_name) {
        nameEl.value = profile.full_name;
        bookingData.customerName = profile.full_name;
    }
    if (emailEl && !emailEl.value && user?.email) {
        emailEl.value = user.email;
        bookingData.customerEmail = user.email;
    }
    if (phoneEl && !phoneEl.value && profile?.phone) {
        phoneEl.value = profile.phone;
        bookingData.customerPhone = profile.phone;
    }
}

// ==================== BLOCKED DATES ====================

// Load blocked dates from Supabase (with reason)
async function loadBlockedDates() {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('blocked_dates')
            .select('date, reason');

        if (error) throw error;

        blockedDates = data ? data.map(d => ({ date: d.date, reason: d.reason || 'Unavailable' })) : [];
        renderCalendar();
    } catch (err) {
        console.error('Error loading blocked dates:', err);
    }
}

// Helper to check if a date string is blocked
function isDateBlocked(dateStr) {
    return blockedDates.some(d => d.date === dateStr);
}

// Helper to get blocked reason for a date
function getBlockedReason(dateStr) {
    const found = blockedDates.find(d => d.date === dateStr);
    return found ? found.reason : '';
}

// Fetch booked time slots for a specific date
async function loadBookedSlots(dateStr) {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('time')
            .eq('date', dateStr)
            .eq('status', 'confirmed');

        if (error) throw error;

        return data ? data.map(a => a.time) : [];
    } catch (err) {
        console.error('Error loading booked slots:', err);
        return [];
    }
}

function updatePricing() {
    let total = 0;

    const selectedHaircut = document.querySelector('input[name="haircut"]:checked');
    if (selectedHaircut) {
        const price = parseInt(selectedHaircut.closest('.service-option').dataset.price);
        bookingData.haircut = selectedHaircut.value;
        bookingData.haircutPrice = price;
        total += price;
    }

    const selectedExtras = document.querySelectorAll('input[name="extras"]:checked');
    bookingData.extras = [];
    bookingData.extrasTotal = 0;

    selectedExtras.forEach(extra => {
        const price = parseInt(extra.dataset.price);
        bookingData.extras.push({
            name: extra.value,
            price: price
        });
        bookingData.extrasTotal += price;
        total += price;
    });

    bookingData.total = total;

    document.getElementById('subtotal').textContent = `$${total.toFixed(2)}`;
    document.getElementById('totalPrice').textContent = `$${total.toFixed(2)}`;

    saveProgress();
}

// Calendar Rendering — no inner wrapper div, outputs directly into #calendar grid
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    // 2-month booking window from today
    const now = new Date();
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
    const minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const maxMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);

    // Disable/enable nav arrows at boundaries
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const currentMonth1st = new Date(year, month, 1);
    const nextMonth1st = new Date(year, month + 1, 1);

    prevBtn.disabled = currentMonth1st <= minMonth;
    prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '1';
    prevBtn.style.cursor = prevBtn.disabled ? 'default' : 'pointer';

    nextBtn.disabled = nextMonth1st > maxMonth;
    nextBtn.style.opacity = nextBtn.disabled ? '0.3' : '1';
    nextBtn.style.cursor = nextBtn.disabled ? 'default' : 'pointer';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    let calendarHTML = '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    dayNames.forEach(day => {
        calendarHTML += `<div class="calendar-day-name">${day}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isPast = date < new Date(todayYear, todayMonth, todayDate);
        const isBeyondMax = date > maxDate;
        const isToday = (day === todayDate && month === todayMonth && year === todayYear);
        const isSelected = selectedDate &&
                          selectedDate.getDate() === day &&
                          selectedDate.getMonth() === month &&
                          selectedDate.getFullYear() === year;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isBlocked = isDateBlocked(dateStr);
        const blockedReason = isBlocked ? getBlockedReason(dateStr) : '';
        const isUnavailable = isPast || isToday || isBlocked || isBeyondMax;

        let classes = 'calendar-day';
        if (isPast || isBeyondMax) classes += ' past';
        if (isToday) classes += ' today';
        if (isUnavailable) classes += ' disabled';
        if (isSelected) classes += ' selected';
        if (isBlocked) classes += ' blocked';
        if (!isUnavailable) classes += ' available';

        const onclick = isUnavailable ? '' : `onclick="selectDate(${year}, ${month + 1}, ${day})"`;
        const tooltip = isBlocked ? `title="${blockedReason}"` : '';

        calendarHTML += `<div class="${classes}" data-date="${dateStr}" ${onclick} ${tooltip}>${day}</div>`;
    }

    document.getElementById('calendar').innerHTML = calendarHTML;
}

// Fixed: use year/month/day integers to avoid UTC offset issues
async function selectDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (date < today) return;
    if (isDateBlocked(dateStr)) return;

    selectedDate = date;
    bookingData.date = dateStr;

    renderCalendar();

    // Show loading spinner
    const timeSlotsContainer = document.getElementById('timeSlots');
    timeSlotsContainer.innerHTML = '<div class="calendar-loading"><div class="spinner"></div><p>Loading available times...</p></div>';

    // Fetch booked slots for this date and render time slots
    const booked = await loadBookedSlots(dateStr);
    bookedSlots[dateStr] = booked;
    renderTimeSlots(booked);

    if (bookingData.time) {
        document.getElementById('step2Next').disabled = false;
    }
}

window.selectDate = selectDate;

function renderTimeSlots(booked) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    booked = booked || [];

    const morningTimes = ['9:00 AM', '10:00 AM', '11:00 AM'];
    const afternoonTimes = ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

    function buildSlots(times) {
        let html = '';
        times.forEach(time => {
            const isBooked = booked.includes(time);
            const isSelected = bookingData.time === time;

            if (isBooked) {
                html += `<button type="button" class="time-slot booked" disabled>
                    ${time} <span style="font-size:0.75em;display:block;">Booked</span>
                </button>`;
            } else {
                const selectedClass = isSelected ? 'selected' : '';
                html += `<button type="button" class="time-slot ${selectedClass}" onclick="selectTime('${time}')">${time}</button>`;
            }
        });
        return html;
    }

    let html = '<h3>Select Time</h3>';
    html += '<div class="time-slot-group"><h4>Morning</h4><div class="time-slots-grid">';
    html += buildSlots(morningTimes);
    html += '</div></div>';
    html += '<div class="time-slot-group"><h4>Afternoon</h4><div class="time-slots-grid">';
    html += buildSlots(afternoonTimes);
    html += '</div></div>';

    timeSlotsContainer.innerHTML = html;
}

function selectTime(time) {
    bookingData.time = time;
    const booked = bookedSlots[bookingData.date] || [];
    renderTimeSlots(booked);
    document.getElementById('step2Next').disabled = false;
    saveProgress();
}

window.selectTime = selectTime;

// Fixed: parse date with split to avoid UTC offset
function parseDateStr(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function updateBookingSummary() {
    const haircutLabels = {
        'fade': 'Fade',
        'buzz': 'Buzz Cut',
        'trim': 'Trim'
    };
    document.getElementById('summaryService').textContent = haircutLabels[bookingData.haircut] || '-';

    if (bookingData.extras.length > 0) {
        const extrasText = bookingData.extras.map(e => {
            const labels = {
                'beardTrim': 'Beard Trim/Line-up',
                'beardFade': 'Beard Fade',
                'eyebrows': 'Eyebrows'
            };
            return labels[e.name];
        }).join(', ');
        document.getElementById('summaryExtras').textContent = extrasText;
        document.getElementById('summaryExtrasContainer').style.display = 'flex';
    } else {
        document.getElementById('summaryExtrasContainer').style.display = 'none';
    }

    const dateObj = parseDateStr(bookingData.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('summaryDate').textContent = dateStr;
    document.getElementById('summaryTime').textContent = bookingData.time;

    document.getElementById('summaryTotal').textContent = `$${bookingData.total.toFixed(2)}`;
}

function updateConfirmationDetails() {
    document.getElementById('confirmName').textContent = bookingData.customerName || '-';

    const haircutLabels = {
        'fade': 'Fade',
        'buzz': 'Buzz Cut',
        'trim': 'Trim'
    };

    let serviceText = haircutLabels[bookingData.haircut] || '';
    if (bookingData.extras.length > 0) {
        const extrasLabels = {
            'beardTrim': 'Beard Trim/Line-up',
            'beardFade': 'Beard Fade',
            'eyebrows': 'Eyebrows'
        };
        const extrasText = bookingData.extras.map(e => extrasLabels[e.name]).join(', ');
        serviceText += ' + ' + extrasText;
    }
    document.getElementById('confirmService').textContent = serviceText;

    const dateObj = parseDateStr(bookingData.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('confirmDateTime').textContent = `${dateStr} at ${bookingData.time}`;

    document.getElementById('confirmTotal').textContent = `$${bookingData.total.toFixed(2)}`;
}

// Stripe Payment Integration
let stripeElements = null;
let paymentIntentClientSecret = null;
let paymentHandlerAttached = false;

function getReturnUrl() {
    // Stripe requires a valid https:// or http:// URL
    try {
        const origin = window.location.origin;
        const proto = window.location.protocol;
        // Only use actual origin if it's http/https (not file://, not "null")
        if (origin && origin !== 'null' && (proto === 'https:' || proto === 'http:')) {
            return origin + '/booking-success.html';
        }
    } catch (e) {}
    // Fallback: use the production domain so Stripe always gets a valid URL
    // Card payments use redirect:'if_required' so this URL is only hit for
    // redirect-based methods (Cash App, etc.) which need a real domain anyway
    return 'https://kngcuts.com/booking-success.html';
}

async function initializeStripePayment() {
    if (!stripe) {
        showToast('Payment system not configured. Please contact us to complete your booking.', 'error');
        return;
    }

    try {
        // Clear previous Stripe elements if re-entering step 4
        const cardContainer = document.getElementById('card-element');
        if (cardContainer) cardContainer.innerHTML = '';
        stripeElements = null;

        // Hide the old payment request button / divider (now built into Payment Element)
        const prBtn = document.getElementById('payment-request-button');
        const divider = document.getElementById('payment-divider');
        if (prBtn) prBtn.style.display = 'none';
        if (divider) divider.style.display = 'none';

        // Create payment intent on server via Supabase client
        const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
            body: {
                amount: 5.00, // $5 deposit
                currency: 'usd',
                description: `KNGCuts Booking - ${bookingData.customerName}`,
                metadata: {
                    customer_name: bookingData.customerName,
                    customer_email: bookingData.customerEmail,
                    date: bookingData.date,
                    time: bookingData.time,
                    service: bookingData.haircut
                }
            }
        });

        if (fnError) {
            throw new Error(fnError.message || 'Failed to initialize payment');
        }

        paymentIntentClientSecret = data.clientSecret;

        // Create Payment Element (shows Card, Apple Pay, Cash App, etc.)
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const appearance = {
            theme: isDark ? 'night' : 'stripe',
            variables: {
                colorPrimary: '#D4AF37',
                colorBackground: isDark ? '#1e1e1e' : '#f8f8f8',
                colorText: isDark ? '#e0e0e0' : '#333',
                colorDanger: '#e74c3c',
                fontFamily: 'Poppins, sans-serif',
                borderRadius: '8px'
            }
        };

        stripeElements = stripe.elements({ appearance, clientSecret: paymentIntentClientSecret });

        const paymentElement = stripeElements.create('payment', {
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' }
        });
        paymentElement.mount('#card-element');

        // Handle real-time validation errors
        paymentElement.on('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });

        // Attach click handler to pay button (only once)
        if (!paymentHandlerAttached) {
            const submitBtn = document.getElementById('submit-payment');
            submitBtn.addEventListener('click', handlePaymentSubmit);
            paymentHandlerAttached = true;
        }

        // Re-enable button in case it was disabled from a previous attempt
        const submitBtn = document.getElementById('submit-payment');
        submitBtn.disabled = false;
        document.getElementById('button-text').style.display = 'inline';
        document.getElementById('spinner').style.display = 'none';

    } catch (error) {
        console.error('Error initializing payment:', error);
        showToast('Failed to initialize payment. Please try again or contact us.', 'error');
    }
}

async function handlePaymentSubmit() {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');

    if (!stripeElements || !paymentIntentClientSecret) {
        showToast('Payment not ready. Please wait a moment and try again.', 'warning');
        return;
    }

    // Disable button and show loading
    submitButton.disabled = true;
    buttonText.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements: stripeElements,
            confirmParams: {
                return_url: getReturnUrl(),
                payment_method_data: {
                    billing_details: {
                        name: bookingData.customerName,
                        email: bookingData.customerEmail,
                        phone: bookingData.customerPhone
                    }
                }
            },
            redirect: 'if_required'
        });

        if (error) {
            showToast(error.message, 'error');
            resetPayButton();
        } else if (paymentIntent) {
            console.log('Payment intent status:', paymentIntent.status);
            if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
                showToast('Payment successful! Saving your booking...', 'success');
                await confirmBooking('stripe', paymentIntent.id);
            } else if (paymentIntent.status === 'requires_action') {
                showToast('Additional authentication required...', 'info');
                resetPayButton();
            } else {
                showToast('Payment status: ' + paymentIntent.status + '. Please try again.', 'warning');
                resetPayButton();
            }
        } else {
            // No error and no paymentIntent — Stripe may have redirected
            // If we're still here, something went wrong
            showToast('Payment could not be confirmed. Please try again.', 'error');
            resetPayButton();
        }
    } catch (error) {
        console.error('Payment error:', error);
        showToast('Payment failed. Please try again.', 'error');
        resetPayButton();
    }
}

function resetPayButton() {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');
    if (submitButton) submitButton.disabled = false;
    if (buttonText) buttonText.style.display = 'inline';
    if (spinner) spinner.style.display = 'none';
}

// Confirm Booking - Save to Supabase (only called after successful payment)
async function confirmBooking(paymentMethod, paymentIntentId) {
    if (!supabase) {
        showToast('Booking system is not configured. Please contact us directly.', 'error');
        return;
    }

    try {
        // Double-booking check: verify the slot is still available
        const { data: existing } = await supabase
            .from('appointments')
            .select('id')
            .eq('date', bookingData.date)
            .eq('time', bookingData.time)
            .eq('status', 'confirmed')
            .limit(1);

        if (existing && existing.length > 0) {
            showToast('Sorry, this time slot was just booked by someone else. Please choose a different time.', 'error');
            resetPayButton();
            // Go back to step 2 to pick a new time
            currentStep = 4;
            prevStep(); prevStep();
            return;
        }

        const insertPayload = {
            customer_name: bookingData.customerName,
            customer_email: bookingData.customerEmail,
            customer_phone: bookingData.customerPhone,
            haircut: bookingData.haircut,
            haircut_price: bookingData.haircutPrice,
            extras: bookingData.extras,
            extras_total: bookingData.extrasTotal,
            date: bookingData.date,
            time: bookingData.time,
            total: bookingData.total,
            deposit_amount: 5.00,
            payment_method: paymentMethod || 'stripe',
            payment_intent_id: paymentIntentId || null,
            notes: bookingData.notes,
            status: 'confirmed',
            deposit_paid: true
        };

        // Add user_id if logged in
        if (typeof window.kngAuth !== 'undefined' && window.kngAuth.isLoggedIn()) {
            insertPayload.user_id = window.kngAuth.getUser().id;
        }

        const { data, error } = await supabase
            .from('appointments')
            .insert([insertPayload])
            .select();

        if (error) throw error;

        // Clear booking progress
        clearProgress();

        // Send confirmation email (non-blocking)
        const haircutLabels = { 'fade': 'Fade', 'buzz': 'Buzz Cut', 'trim': 'Trim' };
        const serviceName = haircutLabels[bookingData.haircut] || bookingData.haircut;
        sendBookingEmail({
            customerName: bookingData.customerName,
            customerEmail: bookingData.customerEmail,
            service: serviceName,
            date: bookingData.date,
            time: bookingData.time,
            total: bookingData.total,
            depositPaid: true,
            extras: bookingData.extras
        });

        // Send SMS confirmation (non-blocking)
        sendBookingSms({
            customerName: bookingData.customerName,
            customerPhone: bookingData.customerPhone,
            service: serviceName,
            date: bookingData.date,
            time: bookingData.time
        });

        // Redirect to success page with booking data
        redirectToSuccess();
    } catch (err) {
        console.error('Error saving booking:', err);
        showToast('Payment went through! Redirecting...', 'info');
        // Still redirect to success — payment was already taken
        redirectToSuccess();
    }
}

function redirectToSuccess() {
    clearProgress();
    const successData = encodeURIComponent(JSON.stringify({
        name: bookingData.customerName,
        service: bookingData.haircut,
        date: bookingData.date,
        time: bookingData.time,
        total: bookingData.total,
        depositPaid: true
    }));
    window.location.href = `booking-success.html?data=${successData}`;
}

window.confirmBooking = confirmBooking;

function copyBookingDetails() {
    const details = `
KNGCuts Booking Details:

Name: ${bookingData.customerName}
Phone: ${bookingData.customerPhone}
Email: ${bookingData.customerEmail}

Service: ${document.getElementById('confirmService').textContent}
Date & Time: ${document.getElementById('confirmDateTime').textContent}
Total: ${document.getElementById('confirmTotal').textContent}

${bookingData.notes ? 'Notes: ' + bookingData.notes : ''}
    `.trim();

    navigator.clipboard.writeText(details).then(() => {
        const btn = document.querySelector('.copy-details-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#27ae60';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        showToast('Could not copy details. Please copy manually.', 'warning');
        console.error('Copy failed:', err);
    });
}

window.copyBookingDetails = copyBookingDetails;

// Send booking confirmation email (non-blocking)
async function sendBookingEmail(emailData) {
    if (!supabase) return;

    try {
        await supabase.functions.invoke('send-booking-email', {
            body: emailData
        });
    } catch (err) {
        console.log('Email sending failed (non-blocking):', err);
    }
}

// Send SMS confirmation (non-blocking)
async function sendBookingSms(smsData) {
    if (!supabase) return;

    try {
        await supabase.functions.invoke('send-sms-reminder', {
            body: smsData
        });
    } catch (err) {
        console.log('SMS sending failed (non-blocking):', err);
    }
}
