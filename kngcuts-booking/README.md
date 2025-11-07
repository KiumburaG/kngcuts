# KNGCuts - Professional Barbershop Booking Website

A modern, fully-functional booking website for KNGCuts barbershop featuring real-time availability, online payments, and automated notifications.

## Features

### Customer Features
- 🏠 **Beautiful Homepage** with dynamic branding and image gallery
- 📅 **Real-time Calendar Booking** with 40-minute appointment slots
- 💰 **Dynamic Price Calculator** for services and add-ons
- 💳 **Multiple Payment Options** (PayPal, Venmo, Cash App, Credit/Debit Card)
- 📧 **Email Confirmations** with appointment details
- 📱 **Calendar Export** (Google, Apple, Outlook)
- ⏰ **Automated Reminders** 24 hours before appointment

### Admin Features
- 🔐 **Google OAuth Authentication** for secure admin access
- 📸 **Image Gallery Management** - Upload and manage haircut photos
- 📆 **Calendar Management** - Set weekly availability hours
- 🚫 **Date Blocking** - Block specific dates for vacation/holidays
- 📋 **Appointment Dashboard** - View, edit, and delete bookings
- 📧 **Email & SMS Notifications** when new appointments are booked
- ⏱️ **40-minute Time Slots** with automatic blocking

### Services Offered
1. **Fade** - $25 (includes line-up)
2. **Buzz Cut** - $15 (includes line-up)
3. **Trim** - $25 (includes line-up)

### Extra Services
- Beard Trim/Line-up - +$5
- Beard Fade - +$10
- Eyebrows (Slits/Shape-up) - +$5

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Firestore, Authentication, Storage, Cloud Functions)
- **Payments**: PayPal, Venmo, Cash App, Stripe
- **Notifications**: SendGrid (Email), Twilio (SMS)
- **Calendar Export**: iCal format, Google Calendar API

## Setup Instructions

### Prerequisites
- Google account (for Firebase)
- Node.js and npm installed (for Firebase Functions)
- Text editor (VS Code recommended)

### Step 1: Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Name it "kngcuts-booking" (or your preferred name)
   - Disable Google Analytics (optional)

2. **Enable Firebase Services**

   **Authentication:**
   - Go to Authentication > Sign-in method
   - Enable "Google" sign-in provider
   - Add your domain to authorized domains

   **Firestore Database:**
   - Go to Firestore Database
   - Click "Create Database"
   - Choose "Start in test mode" (we'll set rules later)
   - Select your region

   **Storage:**
   - Go to Storage
   - Click "Get Started"
   - Choose "Start in test mode"

3. **Get Firebase Configuration**
   - Go to Project Settings > General
   - Scroll to "Your apps"
   - Click the web icon (</>) to add a web app
   - Name it "KNGCuts Web"
   - Copy the firebaseConfig object

4. **Update config.js**
   - Open `config.js`
   - Replace the firebaseConfig values with your actual Firebase credentials
   - Update `ADMIN_EMAILS` with your Gmail address
   - Update `BUSINESS_CONFIG` with your business details

### Step 2: Payment Setup

#### PayPal
1. Go to [PayPal Developer](https://developer.paypal.com/)
2. Create a Business account or login
3. Go to My Apps & Credentials
4. Create a new app
5. Copy the Client ID
6. Update `config.js` with your PayPal Client ID
7. Update `bookings.html` - replace `YOUR_PAYPAL_CLIENT_ID` in the PayPal script tag

#### Venmo & Cash App
1. Update `config.js` with your Venmo username (e.g., @YourUsername)
2. Update `config.js` with your Cash App tag (e.g., $YourTag)
3. These are displayed for manual payments - no API integration needed

### Step 3: Email & SMS Notifications (Optional but Recommended)

#### SendGrid (Email)
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Verify your sender email address
3. Create an API key (Settings > API Keys)
4. Save the API key for Cloud Functions setup

#### Twilio (SMS)
1. Sign up at [Twilio](https://www.twilio.com/)
2. Get a phone number
3. Find your Account SID and Auth Token in the dashboard
4. Save these for Cloud Functions setup

### Step 4: Deploy Firebase Cloud Functions

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project**
   ```bash
   cd kngcuts-booking
   firebase init
   ```
   - Select: Firestore, Functions, Hosting, Storage
   - Use existing project: kngcuts-booking
   - Accept defaults for Firestore rules
   - Choose JavaScript for Functions
   - Install dependencies: Yes
   - Public directory: . (current directory)
   - Single-page app: No

4. **Set up Cloud Functions**
   ```bash
   cd functions
   npm install nodemailer @sendgrid/mail twilio
   ```

5. **Copy the functions template**
   - Copy the content from `functions-template.js`
   - Paste into `functions/index.js`

6. **Set environment variables**
   ```bash
   firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
   firebase functions:config:set twilio.sid="YOUR_TWILIO_ACCOUNT_SID"
   firebase functions:config:set twilio.token="YOUR_TWILIO_AUTH_TOKEN"
   firebase functions:config:set twilio.phone="+1234567890"
   firebase functions:config:set admin.email="your-email@gmail.com"
   firebase functions:config:set admin.phone="+1234567890"
   ```

7. **Deploy Functions**
   ```bash
   cd ..
   firebase deploy --only functions
   ```

### Step 5: Firestore Security Rules

Update your Firestore rules for security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Gallery - Read public, Write admin only
    match /gallery/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email in ['your-email@gmail.com'];
    }

    // Appointments - Customers can create, Admin can read/update/delete
    match /appointments/{document=**} {
      allow create: if true; // Allow public booking
      allow read, update, delete: if request.auth != null && request.auth.token.email in ['your-email@gmail.com'];
    }

    // Settings - Admin only
    match /settings/{document=**} {
      allow read: if true; // Public can read schedule
      allow write: if request.auth != null && request.auth.token.email in ['your-email@gmail.com'];
    }

    // Blocked Dates - Read public, Write admin only
    match /blockedDates/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email in ['your-email@gmail.com'];
    }
  }
}
```

### Step 6: Storage Security Rules

Update your Storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /gallery/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email in ['your-email@gmail.com'];
    }
  }
}
```

### Step 7: Deploy to Firebase Hosting

1. **Deploy your site**
   ```bash
   firebase deploy
   ```

2. **Your site will be live at:**
   ```
   https://your-project-id.web.app
   ```

### Step 8: Custom Domain (Optional)

1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Follow the instructions to connect your domain
4. Update DNS records as instructed

## Project Structure

```
kngcuts-booking/
├── index.html                  # Homepage
├── bookings.html              # Booking page
├── booking-success.html       # Success page after booking
├── admin-calendar.html        # Admin calendar management
├── styles.css                 # All styles
├── script.js                  # Homepage JavaScript
├── booking.js                 # Booking system logic
├── booking-success.js         # Success page logic
├── admin-calendar.js          # Admin calendar logic
├── config.js                  # Firebase configuration
├── functions-template.js      # Cloud Functions template
└── README.md                  # This file
```

## Usage Guide

### For Customers

1. **Browse the Homepage**
   - View services and pricing
   - Check out the gallery of haircuts

2. **Book an Appointment**
   - Click "Book Now"
   - Select your haircut type
   - Add extra services (optional)
   - See real-time price calculation
   - Choose date and time (40-minute slots)
   - Enter your contact information
   - Review and confirm booking
   - Pay $5 deposit online
   - Receive confirmation email
   - Export to calendar

### For Admin (You)

1. **Login**
   - Click "Admin Login" in navigation
   - Sign in with your Google account

2. **Upload Haircut Photos**
   - Access Admin Dashboard
   - Select images from your device
   - Upload to gallery
   - Delete photos as needed

3. **Manage Calendar**
   - Click "Manage Calendar & Availability"
   - Set weekly business hours
   - Enable/disable specific days
   - Block dates for vacation/holidays

4. **View Appointments**
   - See all upcoming bookings
   - Hover over appointments to edit or delete
   - View customer contact information
   - Check payment status

5. **Receive Notifications**
   - Email notifications for new bookings
   - SMS notifications (if Twilio configured)
   - Automatic 24-hour reminders sent to customers

## Customization

### Change Colors
Edit `styles.css` and update the CSS variables:
```css
:root {
    --primary-color: #D4AF37;  /* Gold */
    --secondary-color: #1a1a1a; /* Black */
    --accent-color: #8B4513;   /* Brown */
}
```

### Change Services/Prices
Edit `index.html` and `bookings.html` to update service names and prices.

### Change Business Hours
Default hours are set in `booking.js` and can be managed through the admin dashboard.

## Troubleshooting

### Firebase not connecting
- Check if `config.js` has correct credentials
- Verify Firebase project is active
- Check browser console for errors

### Images not uploading
- Verify Storage is enabled in Firebase
- Check Storage rules allow admin write access
- Ensure files are images (jpg, png, etc.)

### Payments not working
- Verify PayPal Client ID is correct
- Check if PayPal SDK is loading
- For Venmo/Cash App, verify usernames are correct

### Emails not sending
- Verify SendGrid API key is set in Cloud Functions
- Check sender email is verified in SendGrid
- Review Cloud Functions logs in Firebase Console

### SMS not sending
- Verify Twilio credentials are correct
- Check Twilio phone number is active
- Ensure admin phone is in correct format (+1234567890)

## Support

For issues or questions:
- Check Firebase Console logs
- Review browser console errors
- Verify all configuration steps completed

## Security Notes

- Never commit `config.js` with real credentials to public repositories
- Update Firestore and Storage rules before going live
- Regularly review appointment data
- Keep Firebase SDK updated

## Future Enhancements

- Customer accounts and booking history
- Reviews and ratings system
- Before/after photo comparisons
- Loyalty points program
- Staff management for multiple barbers
- Automated refunds for cancellations
- Integration with Google Maps
- Social media sharing

## License

This project is created for KNGCuts barbershop. All rights reserved.

---

**Built with ❤️ for KNGCuts**

For setup assistance, refer to the step-by-step instructions above or consult Firebase documentation.
