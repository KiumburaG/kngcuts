// Firebase Cloud Functions for Email and SMS Notifications
// Deploy this file to Firebase Functions

/*
SETUP INSTRUCTIONS:
1. Install Firebase CLI: npm install -g firebase-tools
2. Login: firebase login
3. Initialize functions: firebase init functions
4. Install dependencies:
   cd functions
   npm install nodemailer @sendgrid/mail twilio
5. Replace this file content in functions/index.js
6. Set environment variables:
   firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
   firebase functions:config:set twilio.sid="YOUR_TWILIO_ACCOUNT_SID"
   firebase functions:config:set twilio.token="YOUR_TWILIO_AUTH_TOKEN"
   firebase functions:config:set admin.email="your-email@gmail.com"
   firebase functions:config:set admin.phone="+1234567890"
7. Deploy: firebase deploy --only functions
*/

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

admin.initializeApp();

// Initialize SendGrid (for email) - Alternative to nodemailer
// Get API key from: https://sendgrid.com/
const SENDGRID_API_KEY = functions.config().sendgrid?.key;
if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

// Initialize Twilio (for SMS)
// Get credentials from: https://www.twilio.com/
const TWILIO_ACCOUNT_SID = functions.config().twilio?.sid;
const TWILIO_AUTH_TOKEN = functions.config().twilio?.token;
const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

// Admin contact info
const ADMIN_EMAIL = functions.config().admin?.email || 'your-email@gmail.com';
const ADMIN_PHONE = functions.config().admin?.phone || '+1234567890';
const TWILIO_PHONE = functions.config().twilio?.phone || '+1234567890'; // Your Twilio number

// Trigger when a new appointment is created
exports.onNewAppointment = functions.firestore
    .document('appointments/{appointmentId}')
    .onCreate(async (snap, context) => {
        const appointment = snap.data();
        const appointmentId = context.params.appointmentId;

        console.log('New appointment created:', appointmentId);

        try {
            // Send confirmation email to customer
            await sendCustomerConfirmationEmail(appointment);

            // Send notification email to admin
            await sendAdminNotificationEmail(appointment, appointmentId);

            // Send SMS notification to admin
            await sendAdminSMSNotification(appointment);

            return { success: true };
        } catch (error) {
            console.error('Error sending notifications:', error);
            return { success: false, error: error.message };
        }
    });

// Send confirmation email to customer
async function sendCustomerConfirmationEmail(appointment) {
    if (!SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping customer email');
        return;
    }

    const serviceNames = {
        fade: 'Fade',
        buzz: 'Buzz Cut',
        trim: 'Trim'
    };

    const serviceName = serviceNames[appointment.haircut] || appointment.haircut;
    const extras = appointment.extras && appointment.extras.length > 0
        ? appointment.extras.map(e => e.name).join(', ')
        : 'None';

    const msg = {
        to: appointment.customerEmail,
        from: ADMIN_EMAIL,
        subject: 'Appointment Confirmed - KNGCuts',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1a1a1a; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 2rem;">KNGCuts</h1>
                </div>

                <div style="padding: 30px; background: #f8f8f8;">
                    <h2 style="color: #1a1a1a;">Appointment Confirmed!</h2>
                    <p>Hi ${appointment.customerName},</p>
                    <p>Your appointment has been successfully booked. Here are the details:</p>

                    <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Service:</strong></td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${serviceName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Extras:</strong></td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${extras}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${appointment.date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Time:</strong></td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${appointment.time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Deposit Paid:</strong></td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">$5.00</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0;"><strong>Total:</strong></td>
                                <td style="padding: 10px 0; color: #D4AF37; font-weight: bold;">$${appointment.total.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background: #fffbf0; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Important Reminders:</h3>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Please arrive 5 minutes early</li>
                            <li>Bring payment for the remaining balance: $${(appointment.total - 5).toFixed(2)}</li>
                            <li>Cancellations must be made 24 hours in advance for deposit refund</li>
                            <li>We'll send you a reminder 24 hours before your appointment</li>
                        </ul>
                    </div>

                    <p>Thank you for choosing KNGCuts!</p>
                    <p style="color: #666; font-size: 0.9rem;">If you need to reschedule or have any questions, please contact us.</p>
                </div>

                <div style="background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 0.85rem;">
                    <p style="margin: 0;">&copy; 2024 KNGCuts. All rights reserved.</p>
                </div>
            </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log('Confirmation email sent to customer:', appointment.customerEmail);
    } catch (error) {
        console.error('Error sending customer email:', error);
        throw error;
    }
}

// Send notification email to admin
async function sendAdminNotificationEmail(appointment, appointmentId) {
    if (!SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping admin email');
        return;
    }

    const serviceNames = {
        fade: 'Fade',
        buzz: 'Buzz Cut',
        trim: 'Trim'
    };

    const serviceName = serviceNames[appointment.haircut] || appointment.haircut;
    const extras = appointment.extras && appointment.extras.length > 0
        ? appointment.extras.map(e => e.name).join(', ')
        : 'None';

    const msg = {
        to: ADMIN_EMAIL,
        from: ADMIN_EMAIL,
        subject: `New Booking - ${appointment.customerName} - ${appointment.date}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #D4AF37; color: #1a1a1a; padding: 20px;">
                    <h1 style="margin: 0;">New Appointment Booked!</h1>
                </div>

                <div style="padding: 30px; background: #f8f8f8;">
                    <h2>Customer Information</h2>
                    <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p><strong>Name:</strong> ${appointment.customerName}</p>
                        <p><strong>Phone:</strong> <a href="tel:${appointment.customerPhone}">${appointment.customerPhone}</a></p>
                        <p><strong>Email:</strong> <a href="mailto:${appointment.customerEmail}">${appointment.customerEmail}</a></p>
                    </div>

                    <h2>Appointment Details</h2>
                    <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p><strong>Service:</strong> ${serviceName}</p>
                        <p><strong>Extras:</strong> ${extras}</p>
                        <p><strong>Date:</strong> ${appointment.date}</p>
                        <p><strong>Time:</strong> ${appointment.time}</p>
                        <p><strong>Total:</strong> $${appointment.total.toFixed(2)}</p>
                        <p><strong>Deposit Paid:</strong> $${appointment.depositAmount}.00</p>
                        <p><strong>Payment Method:</strong> ${appointment.paymentMethod}</p>
                        ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://your-domain.com/admin-calendar.html"
                           style="background: #D4AF37; color: #1a1a1a; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            View in Admin Dashboard
                        </a>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log('Notification email sent to admin');
    } catch (error) {
        console.error('Error sending admin email:', error);
        throw error;
    }
}

// Send SMS notification to admin
async function sendAdminSMSNotification(appointment) {
    if (!twilioClient) {
        console.log('Twilio not configured, skipping SMS notification');
        return;
    }

    const serviceNames = {
        fade: 'Fade',
        buzz: 'Buzz Cut',
        trim: 'Trim'
    };

    const serviceName = serviceNames[appointment.haircut] || appointment.haircut;

    const message = `
New Booking at KNGCuts!

Customer: ${appointment.customerName}
Phone: ${appointment.customerPhone}
Service: ${serviceName}
Date: ${appointment.date}
Time: ${appointment.time}
Total: $${appointment.total.toFixed(2)}
    `.trim();

    try {
        await twilioClient.messages.create({
            body: message,
            from: TWILIO_PHONE,
            to: ADMIN_PHONE
        });
        console.log('SMS notification sent to admin');
    } catch (error) {
        console.error('Error sending SMS:', error);
        // Don't throw - SMS is optional
    }
}

// Trigger 24 hours before appointment
exports.sendAppointmentReminder = functions.pubsub
    .schedule('every 1 hours') // Check every hour
    .onRun(async (context) => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        try {
            const snapshot = await admin.firestore()
                .collection('appointments')
                .where('status', '==', 'confirmed')
                .get();

            for (const doc of snapshot.docs) {
                const appointment = doc.data();
                const appointmentDate = new Date(appointment.date);

                // Check if appointment is ~24 hours away
                const timeDiff = Math.abs(appointmentDate - tomorrow);
                if (timeDiff < 60 * 60 * 1000 && !appointment.reminderSent) { // Within 1 hour of 24 hours before
                    await sendReminderEmail(appointment);

                    // Mark reminder as sent
                    await doc.ref.update({
                        reminderSent: true
                    });
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error sending reminders:', error);
            return { success: false, error: error.message };
        }
    });

async function sendReminderEmail(appointment) {
    if (!SENDGRID_API_KEY) return;

    const serviceNames = {
        fade: 'Fade',
        buzz: 'Buzz Cut',
        trim: 'Trim'
    };

    const serviceName = serviceNames[appointment.haircut] || appointment.haircut;

    const msg = {
        to: appointment.customerEmail,
        from: ADMIN_EMAIL,
        subject: 'Appointment Reminder - Tomorrow at KNGCuts',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #D4AF37; color: #1a1a1a; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Appointment Reminder</h1>
                </div>

                <div style="padding: 30px; background: #f8f8f8;">
                    <p>Hi ${appointment.customerName},</p>
                    <p>This is a friendly reminder about your appointment tomorrow!</p>

                    <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <h2 style="color: #1a1a1a; margin-top: 0;">${appointment.date}</h2>
                        <p style="font-size: 1.5rem; color: #D4AF37; margin: 10px 0;"><strong>${appointment.time}</strong></p>
                        <p style="color: #666;">${serviceName}</p>
                        <p style="font-size: 1.2rem; margin-top: 20px;"><strong>Balance Due: $${(appointment.total - 5).toFixed(2)}</strong></p>
                    </div>

                    <p>Looking forward to seeing you!</p>
                    <p style="color: #666; font-size: 0.9rem;">If you need to cancel or reschedule, please let us know as soon as possible.</p>
                </div>

                <div style="background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 0.85rem;">
                    <p style="margin: 0;">KNGCuts - Professional Barbershop Services</p>
                </div>
            </div>
        `
    };

    try {
        await sgMail.send(msg);
        console.log('Reminder email sent to:', appointment.customerEmail);
    } catch (error) {
        console.error('Error sending reminder email:', error);
    }
}

console.log('Cloud Functions deployed successfully');
