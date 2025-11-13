// Get booking data from URL
const urlParams = new URLSearchParams(window.location.search);
const bookingDataStr = urlParams.get('data');

if (bookingDataStr) {
    try {
        const bookingData = JSON.parse(decodeURIComponent(bookingDataStr));

        // Populate page with booking details
        document.getElementById('customerName').textContent = bookingData.name;
        document.getElementById('detailService').textContent = capitalizeService(bookingData.service);
        document.getElementById('detailDate').textContent = bookingData.date;
        document.getElementById('detailTime').textContent = bookingData.time;
        document.getElementById('detailTotal').textContent = `$${bookingData.total.toFixed(2)}`;

        const balanceDue = bookingData.total - 5;
        document.getElementById('balanceDue').textContent = `$${balanceDue.toFixed(2)}`;

        // Set up calendar export buttons
        setupCalendarExports(bookingData);
    } catch (error) {
        console.error('Error parsing booking data:', error);
    }
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
        title: `KNGCuts - ${capitalizeService(bookingData.service)}`,
        description: `Haircut appointment at KNGCuts. Service: ${capitalizeService(bookingData.service)}. Total: $${bookingData.total.toFixed(2)}`,
        location: 'KNGCuts Barbershop',
        startDate: bookingData.date,
        startTime: bookingData.time
    };

    // Google Calendar
    document.getElementById('addToGoogle').addEventListener('click', () => {
        const googleUrl = createGoogleCalendarLink(eventDetails);
        window.open(googleUrl, '_blank');
    });

    // Apple Calendar (iCal format)
    document.getElementById('addToApple').addEventListener('click', () => {
        const icsContent = createICalFile(eventDetails);
        downloadICS(icsContent, 'kngcuts-appointment.ics');
    });

    // Outlook
    document.getElementById('addToOutlook').addEventListener('click', () => {
        const outlookUrl = createOutlookCalendarLink(eventDetails);
        window.open(outlookUrl, '_blank');
    });
}

function createGoogleCalendarLink(event) {
    const startDateTime = formatDateTimeForGoogle(event.startDate, event.startTime);
    const endDateTime = formatDateTimeForGoogle(event.startDate, event.startTime, 40); // 40-minute appointment

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', event.title);
    url.searchParams.append('details', event.description);
    url.searchParams.append('location', event.location);
    url.searchParams.append('dates', `${startDateTime}/${endDateTime}`);

    return url.toString();
}

function createOutlookCalendarLink(event) {
    const startDateTime = formatDateTimeForOutlook(event.startDate, event.startTime);
    const endDateTime = formatDateTimeForOutlook(event.startDate, event.startTime, 40);

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
    const startDateTime = formatDateTimeForICal(event.startDate, event.startTime);
    const endDateTime = formatDateTimeForICal(event.startDate, event.startTime, 40);
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

function formatDateTimeForGoogle(dateStr, timeStr, addMinutes = 0) {
    const date = new Date(dateStr);
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    date.setHours(hours, minutes + addMinutes, 0, 0);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}T${hour}${minute}00`;
}

function formatDateTimeForOutlook(dateStr, timeStr, addMinutes = 0) {
    const date = new Date(dateStr);
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    date.setHours(hours, minutes + addMinutes, 0, 0);

    return date.toISOString();
}

function formatDateTimeForICal(dateStr, timeStr, addMinutes = 0) {
    const date = new Date(dateStr);
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    date.setHours(hours, minutes + addMinutes, 0, 0);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}T${hour}${minute}00Z`;
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

// Confetti animation
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

            setTimeout(() => {
                confetti.remove();
            }, duration);
        }, i * 30);
    }
}

// Trigger confetti on page load
window.addEventListener('load', () => {
    setTimeout(createConfetti, 500);
});
