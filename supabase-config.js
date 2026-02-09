// Supabase Configuration
// Get these from: Supabase Dashboard > Project Settings > API

const SUPABASE_URL = 'https://nstixabguljazuzdglka.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VepgkESYSXLk5vThJ8w6gw_KpF5x1AT';

// Initialize Supabase client
// The CDN declares "var supabase = { createClient, ... }" on the global scope.
// We reassign that same variable to the initialized client instance.
if (typeof supabase !== 'undefined' && supabase.createClient) {
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized');
} else {
    console.error('Supabase SDK not loaded. Please check your internet connection.');
}

// Admin Configuration
const ADMIN_EMAIL = 'kngcutsbarbershop@gmail.com';

// Business Configuration
const BUSINESS_CONFIG = {
    name: 'KNGCuts',
    email: 'kngcutsbarbershop@gmail.com',
    phone: '+12014140921',
    address: '84 Pinewood Ave, West Long Branch, NJ 07764',

    // Payment Configuration
    venmoUsername: '@Kiumbura-Githinji',
    cashAppUsername: '$KiumburaG',

    // Social Media
    instagram: 'kng.cuts',

    // Booking
    depositAmount: 5,
    slotDurationMinutes: 60
};

// Export for use in other files (Node.js context)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, BUSINESS_CONFIG };
}
