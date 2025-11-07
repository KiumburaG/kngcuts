# KNGCuts - Quick Start Guide

## Fastest Way to Get Started (5 Minutes)

### 1. Firebase Setup (2 minutes)
```bash
# Go to https://console.firebase.google.com/
# Create new project named "kngcuts-booking"
# Enable: Authentication (Google), Firestore, Storage
```

### 2. Update Configuration (1 minute)
Open `config.js` and replace:
- Firebase credentials (from Firebase Console > Project Settings)
- Your Gmail address in `ADMIN_EMAILS`
- Your business phone/email in `BUSINESS_CONFIG`

### 3. Deploy to Firebase (2 minutes)
```bash
cd kngcuts-booking

# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize and deploy
firebase init hosting
firebase deploy
```

Your site is now live! 🎉

## Test Your Site

1. **Visit your site** at `https://your-project-id.web.app`
2. **Click "Book Now"** and try booking an appointment
3. **Click "Admin Login"** and sign in with your Google account
4. **Upload some haircut photos** to test the gallery
5. **Set your business hours** in the calendar management

## What Works Right Away

✅ **Customer Booking** - Full booking flow with calendar
✅ **Price Calculator** - Real-time price updates
✅ **Admin Dashboard** - Upload photos, manage calendar
✅ **Calendar Export** - Google, Apple, Outlook
✅ **Responsive Design** - Works on all devices

## What Needs Additional Setup

### For Email Notifications (10 minutes)
1. Sign up at [SendGrid.com](https://sendgrid.com)
2. Get API key
3. Deploy Cloud Functions with configuration

### For SMS Notifications (10 minutes)
1. Sign up at [Twilio.com](https://twilio.com)
2. Get credentials
3. Deploy Cloud Functions with configuration

### For PayPal Payments (5 minutes)
1. Sign up at [PayPal Developer](https://developer.paypal.com)
2. Get Client ID
3. Update `config.js` and `bookings.html`

See full `README.md` for detailed instructions.

## Important Files to Customize

| File | What to Change |
|------|---------------|
| `config.js` | Firebase credentials, your email, business info |
| `styles.css` | Colors (search for `--primary-color`) |
| `index.html` | Business address, contact info |

## Default Settings

- **Business Hours**: Mon-Fri 9am-6pm, Sat 10am-4pm
- **Appointment Length**: 40 minutes
- **Services**: Fade ($25), Buzz ($15), Trim ($25)
- **Booking Deposit**: $5 (included in total)

## Need Help?

1. Check browser console for errors (F12)
2. Review Firebase Console logs
3. Read full `README.md` for detailed setup
4. Check Firebase documentation

## Next Steps

After basic setup:
1. ✅ Upload your haircut photos
2. ✅ Set your actual business hours
3. ✅ Test booking flow end-to-end
4. ✅ Set up email notifications
5. ✅ Connect custom domain
6. ✅ Update Firebase security rules

---

**You're all set! Start taking bookings! 💈**
