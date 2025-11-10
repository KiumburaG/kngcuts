// Firebase Configuration
// Replace these values with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > Your apps > Firebase SDK snippet

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} else {
    console.error('Firebase SDK not loaded. Please check your internet connection.');
}

// Admin Configuration
// Add authorized admin email addresses here
const ADMIN_EMAILS = [
    'kngcutsbarbershop@gmail.com' // Your Gmail address for admin access
];

// Business Configuration
const BUSINESS_CONFIG = {
    name: 'KNGCuts',
    email: 'kngcutsbarbershop@gmail.com', // Your business email
    phone: '+12014140921', // Your phone number for SMS notifications
    address: '84 Pinewood Ave, West Long Branch, NJ 07764', // Your barbershop address

    // Payment Configuration
    venmoUsername: '@Kiumbura-Githinji', // Your Venmo username
    cashAppUsername: '$KiumburaG', // Your Cash App tag
    paypalClientId: 'YOUR_PAYPAL_CLIENT_ID', // Get from PayPal Developer Dashboard

    // Social Media
    instagram: 'kng.cuts', // Your Instagram handle

    // Notification Settings
    sendEmailNotifications: true,
    sendSMSNotifications: false, // Set to true when you set up Twilio
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, ADMIN_EMAILS, BUSINESS_CONFIG };
}
