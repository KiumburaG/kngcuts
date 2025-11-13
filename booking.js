// Booking System JavaScript - Static Version

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

// Step Navigation
function nextStep() {
    // Validate current step
    if (!validateStep(currentStep)) {
        return;
    }

    // Hide current step
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('completed');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');

    // Show next step
    currentStep++;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');

    // Update summary if on step 3
    if (currentStep === 3) {
        updateBookingSummary();
    }

    // Update confirmation details if on step 4
    if (currentStep === 4) {
        updateConfirmationDetails();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep() {
    // Hide current step
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');

    // Show previous step
    currentStep--;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('completed');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.nextStep = nextStep;
window.prevStep = prevStep;

// Validation
function validateStep(step) {
    if (step === 1) {
        const haircutSelected = document.querySelector('input[name="haircut"]:checked');
        if (!haircutSelected) {
            alert('Please select a haircut service');
            return false;
        }
        return true;
    }

    if (step === 2) {
        if (!bookingData.date || !bookingData.time) {
            alert('Please select a date and time');
            return false;
        }
        return true;
    }

    if (step === 3) {
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();

        if (!name || !email || !phone) {
            alert('Please fill in all required fields');
            return false;
        }

        // Save customer data
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
    // Service selection handlers
    const haircutRadios = document.querySelectorAll('input[name="haircut"]');
    const extrasCheckboxes = document.querySelectorAll('input[name="extras"]');

    haircutRadios.forEach(radio => {
        radio.addEventListener('change', updatePricing);
    });

    extrasCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updatePricing);
    });

    // Initialize calendar
    renderCalendar();

    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
});

function updatePricing() {
    let total = 0;

    // Get selected haircut
    const selectedHaircut = document.querySelector('input[name="haircut"]:checked');
    if (selectedHaircut) {
        const price = parseInt(selectedHaircut.closest('.service-option').dataset.price);
        bookingData.haircut = selectedHaircut.value;
        bookingData.haircutPrice = price;
        total += price;
    }

    // Get selected extras
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

    // Update display
    document.getElementById('subtotal').textContent = `$${total.toFixed(2)}`;
    document.getElementById('totalPrice').textContent = `$${total.toFixed(2)}`;
}

// Calendar Rendering
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    // Get first day and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Build calendar HTML
    let calendarHTML = '<div class="calendar-days">';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Add day names
    dayNames.forEach(day => {
        calendarHTML += `<div class="calendar-day-name">${day}</div>`;
    });

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isPast = date < today.setHours(0, 0, 0, 0);
        const isSelected = selectedDate &&
                          selectedDate.getDate() === day &&
                          selectedDate.getMonth() === month &&
                          selectedDate.getFullYear() === year;

        let classes = 'calendar-day';
        if (isPast) classes += ' disabled';
        if (isSelected) classes += ' selected';

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        calendarHTML += `<div class="${classes}" data-date="${dateStr}" onclick="selectDate('${dateStr}')">${day}</div>`;
    }

    calendarHTML += '</div>';
    document.getElementById('calendar').innerHTML = calendarHTML;
}

function selectDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return;

    selectedDate = date;
    bookingData.date = dateStr;

    // Update calendar display
    renderCalendar();

    // Show time slots
    renderTimeSlots();

    // Enable next button
    if (bookingData.time) {
        document.getElementById('step2Next').disabled = false;
    }
}

window.selectDate = selectDate;

function renderTimeSlots() {
    const timeSlotsContainer = document.getElementById('timeSlots');

    const times = [
        '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
    ];

    let html = '<h3>Select Time</h3><div class="time-slots-grid">';

    times.forEach(time => {
        const isSelected = bookingData.time === time;
        const selectedClass = isSelected ? 'selected' : '';

        html += `<button type="button" class="time-slot ${selectedClass}" onclick="selectTime('${time}')">${time}</button>`;
    });

    html += '</div>';
    timeSlotsContainer.innerHTML = html;
}

function selectTime(time) {
    bookingData.time = time;

    // Update display
    renderTimeSlots();

    // Enable next button
    document.getElementById('step2Next').disabled = false;
}

window.selectTime = selectTime;

function updateBookingSummary() {
    // Update service
    const haircutLabels = {
        'fade': 'Fade',
        'buzz': 'Buzz Cut',
        'trim': 'Trim'
    };
    document.getElementById('summaryService').textContent = haircutLabels[bookingData.haircut] || '-';

    // Update extras
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

    // Update date and time
    const dateObj = new Date(bookingData.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('summaryDate').textContent = dateStr;
    document.getElementById('summaryTime').textContent = bookingData.time;

    // Update total
    document.getElementById('summaryTotal').textContent = `$${bookingData.total.toFixed(2)}`;
}

function updateConfirmationDetails() {
    // Update confirmation details on payment page
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

    const dateObj = new Date(bookingData.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('confirmDateTime').textContent = `${dateStr} at ${bookingData.time}`;

    document.getElementById('confirmTotal').textContent = `$${bookingData.total.toFixed(2)}`;
}

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

    // Copy to clipboard
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
        alert('Could not copy details. Please copy manually.');
        console.error('Copy failed:', err);
    });
}

window.copyBookingDetails = copyBookingDetails;
