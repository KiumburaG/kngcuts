// KNGCuts Booking Success Page

const urlParams = new URLSearchParams(window.location.search);

// ===== Detect how we got here =====
const bookingDataStr = urlParams.get('data');                    // Non-redirect payment (card)
const stripePaymentIntent = urlParams.get('payment_intent');     // Redirect payment (CashApp, etc.)
const stripeClientSecret = urlParams.get('payment_intent_client_secret');
const stripeRedirectStatus = urlParams.get('redirect_status');

// Elements
const successIcon = document.querySelector('.success-icon');
const successTitle = document.querySelector('.success-title');
const successMessage = document.querySelector('.success-message');

// ===== PATH 1: Non-redirect payment (card) — booking already saved =====
if (bookingDataStr) {
    try {
        const bookingData = JSON.parse(decodeURIComponent(bookingDataStr));
        populateDetails(bookingData);
        localStorage.removeItem('kngcuts-pending-booking');
        localStorage.removeItem('kngcuts-booking-progress');
    } catch (error) {
        console.error('Error parsing booking data:', error);
    }
}

// ===== PATH 2: Redirect-based payment — need to verify and save booking =====
else if (stripePaymentIntent && stripeClientSecret) {
    handleRedirectPayment();
}

async function handleRedirectPayment() {
    // Show loading state
    successTitle.textContent = 'Verifying Payment...';
    successMessage.textContent = 'Please wait while we confirm your payment.';

    try {
        // Wait for Stripe to be ready
        let attempts = 0;
        while (!stripe && attempts < 20) {
            await new Promise(r => setTimeout(r, 200));
            attempts++;
        }

        if (!stripe) {
            throw new Error('Payment system not available');
        }

        // Verify payment status with Stripe
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(stripeClientSecret);

        if (error) {
            throw new Error(error.message);
        }

        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
            // Payment confirmed! Now save the booking
            const pendingData = localStorage.getItem('kngcuts-pending-booking');
            if (pendingData) {
                const bookingData = JSON.parse(pendingData);
                await saveBookingToSupabase(bookingData, paymentIntent.id);
                populateDetails(bookingData);
                localStorage.removeItem('kngcuts-pending-booking');
                localStorage.removeItem('kngcuts-booking-progress');

                successTitle.textContent = 'Booking Confirmed!';
                successMessage.innerHTML = `Thank you, <span id="customerName">${bookingData.customerName}</span>! Your appointment has been successfully booked. We've sent a confirmation email to your inbox.`;

                // Trigger confetti
                setTimeout(createConfetti, 300);
            } else {
                // No pending data but payment succeeded — may have already been processed
                successTitle.textContent = 'Payment Confirmed!';
                successMessage.textContent = 'Your payment was successful. If your booking details don\'t appear, please contact us.';
            }
        } else if (paymentIntent.status === 'requires_payment_method') {
            // Payment failed
            showPaymentFailed('Payment was not completed. Please try booking again.');
        } else {
            showPaymentFailed('Payment status: ' + paymentIntent.status + '. Please contact us if you were charged.');
        }
    } catch (err) {
        console.error('Error verifying payment:', err);
        showPaymentFailed('Could not verify payment. If you were charged, please contact us at kngcutsbarbershop@gmail.com');
    }
}

function showPaymentFailed(message) {
    successIcon.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    successIcon.style.color = '#e74c3c';
    successTitle.textContent = 'Payment Not Completed';
    successTitle.style.color = '#e74c3c';
    successMessage.textContent = message;

    // Hide booking details, calendar exports, and next steps
    const details = document.querySelector('.booking-details');
    const calendar = document.querySelector('.calendar-exports');
    const nextSteps = document.querySelector('.next-steps');
    if (details) details.style.display = 'none';
    if (calendar) calendar.style.display = 'none';
    if (nextSteps) nextSteps.style.display = 'none';
}

async function saveBookingToSupabase(bookingData, paymentIntentId) {
    if (!supabase) return;

    try {
        // Double-booking check
        const { data: existing } = await supabase
            .from('appointments')
            .select('id')
            .eq('date', bookingData.date)
            .eq('time', bookingData.time)
            .eq('status', 'confirmed')
            .limit(1);

        if (existing && existing.length > 0) {
            console.warn('Time slot already booked');
            successMessage.textContent += ' Note: This time slot may have been double-booked. We\'ll contact you to confirm.';
        }

        const haircutLabels = { 'fade': 'Fade', 'buzz': 'Buzz Cut', 'trim': 'Trim' };

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
            payment_method: 'stripe',
            payment_intent_id: paymentIntentId,
            notes: bookingData.notes,
            status: 'confirmed',
            deposit_paid: true
        };

        // Add user_id if logged in
        if (typeof window.kngAuth !== 'undefined' && window.kngAuth.isLoggedIn()) {
            insertPayload.user_id = window.kngAuth.getUser().id;
        }

        const { error } = await supabase
            .from('appointments')
            .insert([insertPayload]);

        if (error) throw error;

        // Send confirmation email (non-blocking)
        const serviceName = haircutLabels[bookingData.haircut] || bookingData.haircut;
        try {
            await supabase.functions.invoke('send-booking-email', {
                body: {
                    customerName: bookingData.customerName,
                    customerEmail: bookingData.customerEmail,
                    service: serviceName,
                    date: bookingData.date,
                    time: bookingData.time,
                    total: bookingData.total,
                    depositPaid: true,
                    extras: bookingData.extras
                }
            });
        } catch (e) {
            console.log('Email failed (non-blocking):', e);
        }

        // Send SMS (non-blocking)
        try {
            await supabase.functions.invoke('send-sms-reminder', {
                body: {
                    customerName: bookingData.customerName,
                    customerPhone: bookingData.customerPhone,
                    service: serviceName,
                    date: bookingData.date,
                    time: bookingData.time
                }
            });
        } catch (e) {
            console.log('SMS failed (non-blocking):', e);
        }
    } catch (err) {
        console.error('Error saving booking:', err);
    }
}

// ===== Shared UI functions =====

function populateDetails(bookingData) {
    const nameEl = document.getElementById('customerName');
    if (nameEl) nameEl.textContent = bookingData.name || bookingData.customerName || '';

    const serviceEl = document.getElementById('detailService');
    if (serviceEl) serviceEl.textContent = capitalizeService(bookingData.service || bookingData.haircut);

    const dateEl = document.getElementById('detailDate');
    if (dateEl) dateEl.textContent = bookingData.date;

    const timeEl = document.getElementById('detailTime');
    if (timeEl) timeEl.textContent = bookingData.time;

    const total = parseFloat(bookingData.total) || 0;
    const totalEl = document.getElementById('detailTotal');
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    const balanceEl = document.getElementById('balanceDue');
    if (balanceEl) balanceEl.textContent = `$${(total - 5).toFixed(2)}`;

    setupCalendarExports(bookingData);
}

function capitalizeService(service) {
    const serviceNames = {
        fade: 'Fade',
        buzz: 'Buzz Cut',
        trim: 'Trim'
    };
    return serviceNames[service] || service;
}

function setupCalendarExports(bookingData) {
    const eventDetails = {
        title: `KNGCuts - ${capitalizeService(bookingData.service || bookingData.haircut)}`,
        description: `Haircut appointment at KNGCuts. Service: ${capitalizeService(bookingData.service || bookingData.haircut)}. Total: $${(parseFloat(bookingData.total) || 0).toFixed(2)}`,
        location: 'KNGCuts Barbershop',
        startDate: bookingData.date,
        startTime: bookingData.time
    };

    document.getElementById('addToGoogle').addEventListener('click', () => {
        window.open(createGoogleCalendarLink(eventDetails), '_blank');
    });

    document.getElementById('addToApple').addEventListener('click', () => {
        downloadICS(createICalFile(eventDetails), 'kngcuts-appointment.ics');
    });

    document.getElementById('addToOutlook').addEventListener('click', () => {
        window.open(createOutlookCalendarLink(eventDetails), '_blank');
    });
}

function createGoogleCalendarLink(event) {
    const startDateTime = formatDateTime(event.startDate, event.startTime, 0, 'google');
    const endDateTime = formatDateTime(event.startDate, event.startTime, 40, 'google');

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', event.title);
    url.searchParams.append('details', event.description);
    url.searchParams.append('location', event.location);
    url.searchParams.append('dates', `${startDateTime}/${endDateTime}`);

    return url.toString();
}

function createOutlookCalendarLink(event) {
    const startDateTime = formatDateTime(event.startDate, event.startTime, 0, 'outlook');
    const endDateTime = formatDateTime(event.startDate, event.startTime, 40, 'outlook');

    const url = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
    url.searchParams.append('subject', event.title);
    url.searchParams.append('body', event.description);
    url.searchParams.append('location', event.location);
    url.searchParams.append('startdt', startDateTime);
    url.searchParams.append('enddt', endDateTime);
    url.searchParams.append('path', '/calendar/action/compose');

    return url.toString();
}

function createICalFile(event) {
    const startDateTime = formatDateTime(event.startDate, event.startTime, 0, 'ical');
    const endDateTime = formatDateTime(event.startDate, event.startTime, 40, 'ical');
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//KNGCuts//Booking//EN
BEGIN:VEVENT
UID:${now}@kngcuts.com
DTSTAMP:${now}
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

function formatDateTime(dateStr, timeStr, addMinutes, format) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    date.setHours(hours, minutes + addMinutes, 0, 0);

    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const dy = String(date.getDate()).padStart(2, '0');
    const hr = String(date.getHours()).padStart(2, '0');
    const mn = String(date.getMinutes()).padStart(2, '0');

    if (format === 'google') return `${yr}${mo}${dy}T${hr}${mn}00`;
    if (format === 'ical') return `${yr}${mo}${dy}T${hr}${mn}00Z`;
    if (format === 'outlook') return date.toISOString();
    return `${yr}${mo}${dy}T${hr}${mn}00`;
}

function downloadICS(content, filename) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== Confetti =====
function createConfetti() {
    const colors = ['#D4AF37', '#8B4513', '#FFD700', '#FFA500'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.opacity = '1';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            confetti.style.zIndex = '9999';
            confetti.style.pointerEvents = 'none';

            document.body.appendChild(confetti);

            const duration = 3000 + Math.random() * 2000;
            const distance = 100 + Math.random() * 500;

            confetti.animate([
                { transform: `translateY(0px) rotate(0deg)`, opacity: 1 },
                { transform: `translateY(${distance}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });

            setTimeout(() => confetti.remove(), duration);
        }, i * 30);
    }
}

// Only trigger confetti for successful non-redirect payments (PATH 1)
// PATH 2 triggers confetti after verification
if (bookingDataStr) {
    window.addEventListener('load', () => {
        setTimeout(createConfetti, 500);
    });
}
