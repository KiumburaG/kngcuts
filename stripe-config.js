// Stripe Configuration for KNGCuts Booking System
// Get your keys from: https://dashboard.stripe.com/apikeys

// Replace with your actual Stripe publishable key
// This key is safe to use in client-side code
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51SyZscBw8zyf1MtqiZceEmB3l01ynNh1imFtWZLU5HPSR5pk30acHsIl856zM2hslKdwHtS5m2lMuGwsRI7FYiAY00t6nv8bat';

// Initialize Stripe
let stripe = null;

function initializeStripe() {
    if (typeof Stripe === 'undefined') {
        console.error('Stripe.js not loaded. Make sure you included the Stripe script in your HTML.');
        return null;
    }

    if (STRIPE_PUBLISHABLE_KEY.includes('YOUR_PUBLISHABLE_KEY_HERE')) {
        console.warn('Stripe not configured. Please add your publishable key to stripe-config.js');
        return null;
    }

    try {
        stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
        console.log('✅ Stripe initialized successfully');
        return stripe;
    } catch (error) {
        console.error('❌ Error initializing Stripe:', error);
        return null;
    }
}

// Initialize on page load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStripe);
    } else {
        initializeStripe();
    }
}
