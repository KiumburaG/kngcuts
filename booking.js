// Booking System JavaScript

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

// Firebase initialization
let db;
if (typeof firebase !== 'undefined') {
    db = firebase.firestore();
} else {
    console.warn('Firebase not loaded');
}

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

        if (!email.includes('@')) {
            alert('Please enter a valid email address');
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

// Service Selection & Price Calculator
const haircutRadios = document.querySelectorAll('input[name="haircut"]');
const extrasCheckboxes = document.querySelectorAll('input[name="extras"]');
const subtotalEl = document.getElementById('subtotal');
const totalPriceEl = document.getElementById('totalPrice');

haircutRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const serviceOption = e.target.closest('.service-option');
        bookingData.haircut = serviceOption.dataset.service;
        bookingData.haircutPrice = parseFloat(serviceOption.dataset.price);
        updatePrice();
    });
});

extrasCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const extraPrice = parseFloat(e.target.dataset.price);
        const extraValue = e.target.value;

        if (e.target.checked) {
            bookingData.extras.push({
                name: extraValue,
                price: extraPrice
            });
        } else {
            bookingData.extras = bookingData.extras.filter(extra => extra.name !== extraValue);
        }

        updatePrice();
    });
});

function updatePrice() {
    bookingData.extrasTotal = bookingData.extras.reduce((sum, extra) => sum + extra.price, 0);
    bookingData.total = bookingData.haircutPrice + bookingData.extrasTotal;

    if (subtotalEl) {
        subtotalEl.textContent = `$${bookingData.total.toFixed(2)}`;
    }
    if (totalPriceEl) {
        totalPriceEl.textContent = `$${bookingData.total.toFixed(2)}`;
    }
}

// Calendar Functions
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonthEl = document.getElementById('currentMonth');

    if (!calendar || !currentMonthEl) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    currentMonthEl.textContent = new Date(year, month).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    calendar.innerHTML = '';

    // Add day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day header';
        dayEl.textContent = day;
        calendar.appendChild(dayEl);
    });

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendar.appendChild(emptyDay);
    }

    // Add days of month
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;

        const dateObj = new Date(year, month, day);

        // Disable past dates
        if (dateObj < today) {
            dayEl.classList.add('disabled');
        } else {
            dayEl.classList.add('available');
            dayEl.addEventListener('click', () => selectDate(dateObj, dayEl));
        }

        calendar.appendChild(dayEl);
    }
}

function selectDate(date, element) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Add selection
    element.classList.add('selected');
    selectedDate = date;
    bookingData.date = date.toLocaleDateString('en-US');

    // Load time slots for selected date
    loadTimeSlots(date);

    // Enable next button
    document.getElementById('step2Next').disabled = false;
}

async function loadTimeSlots(date) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (!timeSlotsContainer) return;

    // Get day of week
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    timeSlotsContainer.innerHTML = '<h3>Available Times</h3>';

    // Default hours (you can load from Firestore in production)
    const defaultHours = {
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '18:00' },
        saturday: { start: '10:00', end: '16:00' },
        sunday: null
    };

    const hours = defaultHours[dayName];

    if (!hours) {
        timeSlotsContainer.innerHTML += '<p>No availability on this day</p>';
        return;
    }

    // Generate time slots (40-minute intervals)
    const timeGrid = document.createElement('div');
    timeGrid.className = 'time-grid';

    const [startHourStr, startMinStr] = hours.start.split(':');
    const [endHourStr, endMinStr] = hours.end.split(':');

    const startMinutes = parseInt(startHourStr) * 60 + parseInt(startMinStr);
    const endMinutes = parseInt(endHourStr) * 60 + parseInt(endMinStr);

    // Get existing bookings for this date
    let bookedTimes = [];
    if (db) {
        try {
            const snapshot = await db.collection('appointments')
                .where('date', '==', date.toLocaleDateString('en-US'))
                .get();

            bookedTimes = snapshot.docs.map(doc => doc.data().time);
        } catch (error) {
            console.error('Error loading bookings:', error);
        }
    }

    // Generate slots every 40 minutes
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 40) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;

        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01 ${timeStr}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });

        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = displayTime;

        if (bookedTimes.includes(displayTime)) {
            timeSlot.classList.add('booked');
        } else {
            timeSlot.addEventListener('click', () => selectTime(displayTime, timeSlot));
        }

        timeGrid.appendChild(timeSlot);
    }

    timeSlotsContainer.appendChild(timeGrid);
}

function selectTime(time, element) {
    // Remove previous selection
    document.querySelectorAll('.time-slot.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Add selection
    element.classList.add('selected');
    bookingData.time = time;

    // Enable next button
    document.getElementById('step2Next').disabled = false;
}

// Calendar navigation
document.getElementById('prevMonth')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Initialize calendar
renderCalendar();

// Update Booking Summary
function updateBookingSummary() {
    const haircutNames = {
        fade: 'Fade',
        buzz: 'Buzz Cut',
        trim: 'Trim'
    };

    document.getElementById('summaryService').textContent =
        haircutNames[bookingData.haircut] || '-';

    if (bookingData.extras.length > 0) {
        const extrasContainer = document.getElementById('summaryExtrasContainer');
        const extrasEl = document.getElementById('summaryExtras');
        extrasContainer.style.display = 'flex';

        const extrasNames = {
            beardTrim: 'Beard Trim/Line-up',
            beardFade: 'Beard Fade',
            eyebrows: 'Eyebrows'
        };

        extrasEl.textContent = bookingData.extras
            .map(extra => extrasNames[extra.name])
            .join(', ');
    }

    document.getElementById('summaryDate').textContent = bookingData.date || '-';
    document.getElementById('summaryTime').textContent = bookingData.time || '-';
    document.getElementById('summaryTotal').textContent = `$${bookingData.total.toFixed(2)}`;
}

// Payment Methods
const paymentOptions = document.querySelectorAll('.payment-option');
let selectedPaymentMethod = null;

paymentOptions.forEach(option => {
    option.addEventListener('click', () => {
        paymentOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedPaymentMethod = option.dataset.method;

        // Show payment processor
        const processor = document.getElementById('paymentProcessor');
        processor.style.display = 'block';
        processor.innerHTML = getPaymentProcessorHTML(selectedPaymentMethod);
    });
});

function getPaymentProcessorHTML(method) {
    switch (method) {
        case 'paypal':
            return `
                <h4>PayPal Payment</h4>
                <div id="paypal-button-container"></div>
                <p class="payment-note">You will be redirected to PayPal to complete the $5 deposit</p>
            `;
        case 'venmo':
            return `
                <h4>Venmo Payment</h4>
                <p>Venmo Username: <strong>@KNGCuts</strong></p>
                <p>Amount: <strong>$5.00</strong></p>
                <p>Note: Include your name and appointment date</p>
                <input type="text" placeholder="Enter Venmo transaction ID" id="venmoTransactionId" style="width: 100%; padding: 0.8rem; margin: 1rem 0; border: 2px solid #ddd; border-radius: 5px;">
            `;
        case 'cashapp':
            return `
                <h4>Cash App Payment</h4>
                <p>Cash App: <strong>$KNGCuts</strong></p>
                <p>Amount: <strong>$5.00</strong></p>
                <p>Note: Include your name and appointment date</p>
                <input type="text" placeholder="Enter Cash App transaction ID" id="cashappTransactionId" style="width: 100%; padding: 0.8rem; margin: 1rem 0; border: 2px solid #ddd; border-radius: 5px;">
            `;
        case 'card':
            return `
                <h4>Credit/Debit Card</h4>
                <div class="card-form">
                    <input type="text" placeholder="Card Number" id="cardNumber" style="width: 100%; padding: 0.8rem; margin: 0.5rem 0; border: 2px solid #ddd; border-radius: 5px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <input type="text" placeholder="MM/YY" id="cardExpiry" style="padding: 0.8rem; border: 2px solid #ddd; border-radius: 5px;">
                        <input type="text" placeholder="CVV" id="cardCvv" style="padding: 0.8rem; border: 2px solid #ddd; border-radius: 5px;">
                    </div>
                    <input type="text" placeholder="Cardholder Name" id="cardName" style="width: 100%; padding: 0.8rem; margin: 0.5rem 0; border: 2px solid #ddd; border-radius: 5px;">
                </div>
            `;
        default:
            return '';
    }
}

// Terms Agreement
document.getElementById('agreeTerms')?.addEventListener('change', (e) => {
    const payBtn = document.getElementById('payDepositBtn');
    if (e.target.checked && selectedPaymentMethod) {
        payBtn.disabled = false;
    } else {
        payBtn.disabled = true;
    }
});

// Payment & Booking Submission
document.getElementById('payDepositBtn')?.addEventListener('click', async () => {
    if (!selectedPaymentMethod) {
        alert('Please select a payment method');
        return;
    }

    if (!document.getElementById('agreeTerms').checked) {
        alert('Please agree to the booking terms');
        return;
    }

    // Confirm booking
    const confirmMsg = `
Please confirm your booking:

Service: ${bookingData.haircut}
Extras: ${bookingData.extras.map(e => e.name).join(', ') || 'None'}
Date: ${bookingData.date}
Time: ${bookingData.time}
Total: $${bookingData.total.toFixed(2)}

A $5 deposit will be charged now.
    `.trim();

    if (!confirm(confirmMsg)) {
        return;
    }

    // Process payment and create booking
    const payBtn = document.getElementById('payDepositBtn');
    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';

    try {
        // In production, process payment here
        // For now, simulate payment
        await simulatePayment();

        // Save booking to Firestore
        if (db) {
            const bookingRef = await db.collection('appointments').add({
                ...bookingData,
                paymentMethod: selectedPaymentMethod,
                depositPaid: true,
                depositAmount: 5,
                status: 'confirmed',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Send notification email (you'll need to set up Cloud Functions for this)
            await sendNotification(bookingRef.id);
        }

        // Show success and redirect
        showSuccessPage();
    } catch (error) {
        console.error('Error processing booking:', error);
        alert('Error processing booking. Please try again.');
        payBtn.disabled = false;
        payBtn.textContent = 'Pay $5 Deposit & Confirm Booking';
    }
});

async function simulatePayment() {
    // Simulate payment processing delay
    return new Promise(resolve => setTimeout(resolve, 2000));
}

async function sendNotification(bookingId) {
    // This would trigger a Cloud Function to send emails/SMS
    // For now, we'll just log it
    console.log('Notification sent for booking:', bookingId);

    // In production, you would call a Cloud Function:
    /*
    await fetch('YOUR_CLOUD_FUNCTION_URL', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bookingId,
            adminEmail: 'your-email@gmail.com',
            adminPhone: 'your-phone-number',
            bookingData
        })
    });
    */
}

function showSuccessPage() {
    // Redirect to success page
    const successData = encodeURIComponent(JSON.stringify({
        service: bookingData.haircut,
        date: bookingData.date,
        time: bookingData.time,
        total: bookingData.total,
        name: bookingData.customerName
    }));

    window.location.href = `booking-success.html?data=${successData}`;
}

// Initialize
console.log('Booking system loaded');
