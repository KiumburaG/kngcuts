# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payment processing for your KNGCuts booking system.

## Overview

With Stripe integrated, customers will:
1. Select their services and time
2. Enter their information
3. **Pay the $5 deposit with a credit/debit card**
4. Only after successful payment, the booking is confirmed and saved

## Prerequisites

- Supabase account and project set up
- Stripe account (free to create)

---

## Step 1: Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and click **Sign up**
2. Use your business email: **kngcutsbarbershop@gmail.com**
3. Complete the registration process
4. Fill in your business details when prompted

---

## Step 2: Get Your Stripe API Keys

### 2.1 Get Test Keys (for development)

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in the top right)
3. Click **Developers** in the left sidebar
4. Click **API keys**
5. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - click **Reveal test key**
6. Copy both keys - you'll need them in the next steps

### 2.2 Get Live Keys (for production)

**Only do this when you're ready to go live!**

1. Complete your Stripe account setup (add bank account, verify identity)
2. Switch to **Live mode** in the dashboard (toggle in top right)
3. Go to **Developers** > **API keys**
4. Copy your live keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

---

## Step 3: Configure Stripe in Your Project

### 3.1 Update stripe-config.js

Open `stripe-config.js` and replace the placeholder with your publishable key:

```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_ACTUAL_KEY_HERE';
```

For example:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz123456789...';
```

**Note:** This is safe to include in client-side code. The publishable key is meant to be public.

---

## Step 4: Set Up Supabase Edge Function

### 4.1 Install Supabase CLI

If you haven't already:

```bash
npm install -g supabase
```

### 4.2 Link Your Supabase Project

```bash
cd /Users/Kiumbura/Desktop/Work/Projects/kngcuts-booking
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** > **API**
4. Copy the **Project URL** - the ref is in the URL: `https://YOUR_PROJECT_REF.supabase.co`

### 4.3 Set Stripe Secret Key in Supabase

**IMPORTANT:** Your Stripe secret key must be stored securely in Supabase, not in your code!

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

Replace `sk_test_YOUR_SECRET_KEY_HERE` with your actual Stripe secret key from Step 2.

### 4.4 Deploy the Edge Function

```bash
supabase functions deploy create-payment-intent
```

This deploys the payment intent creation function to Supabase.

---

## Step 5: Update Database Schema

Add the new payment-related columns to your appointments table:

```sql
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE;
```

To run this:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Paste the SQL above
5. Click **Run**

---

## Step 6: Test the Payment Flow

### 6.1 Test with Stripe Test Cards

Stripe provides test card numbers that work in test mode:

**Successful payment:**
- Card number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Card requires authentication (3D Secure):**
- Card number: `4000 0025 0000 3155`

**Payment declined:**
- Card number: `4000 0000 0000 9995`

**More test cards:** [stripe.com/docs/testing](https://stripe.com/docs/testing)

### 6.2 Test the Booking Flow

1. Open your booking page: `bookings.html`
2. Select a service, date, and time
3. Enter your customer information
4. On the payment step, enter a test card number
5. Click **Pay $5.00 & Confirm Booking**
6. Verify:
   - Payment processes successfully
   - Booking is saved to Supabase
   - You're redirected to the success page
7. Check Stripe Dashboard > **Payments** to see the test payment

---

## Step 7: Go Live (When Ready)

### 7.1 Complete Stripe Account Setup

1. Add your bank account information
2. Verify your identity
3. Complete any required business information

### 7.2 Switch to Live Keys

1. Update `stripe-config.js` with your **live publishable key**:
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_LIVE_KEY';
   ```

2. Update the Supabase secret with your **live secret key**:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
   ```

3. Redeploy the edge function:
   ```bash
   supabase functions deploy create-payment-intent
   ```

### 7.3 Update Stripe Settings

In your [Stripe Dashboard](https://dashboard.stripe.com/settings):

1. **Business settings**
   - Add your business name: KNGCuts
   - Add your website URL
   - Set customer support email: kngcutsbarbershop@gmail.com

2. **Branding** (optional)
   - Upload your logo
   - Set your brand color: #D4AF37 (gold)

3. **Email receipts**
   - Enable automatic email receipts for customers
   - Customize the receipt email template

---

## Troubleshooting

### Error: "Payment system not configured"

**Solution:** Make sure you've updated `stripe-config.js` with your publishable key.

### Error: "Failed to initialize payment"

**Solution:**
- Check that the Supabase edge function is deployed
- Verify the secret key is set in Supabase: `supabase secrets list`
- Check the edge function logs: `supabase functions logs create-payment-intent`

### Error: "Stripe secret key not configured"

**Solution:** Set the secret key in Supabase:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY
```

### Payment succeeds but booking isn't saved

**Solution:**
- Check browser console for errors
- Verify Supabase connection is working
- Check that the appointments table has the new columns (payment_intent_id, deposit_paid)

### Test cards not working

**Solution:** Make sure you're using test mode keys (pk_test_ and sk_test_), not live keys.

---

## Security Best Practices

1. ✅ **Never commit secret keys to Git**
   - The `.gitignore` already excludes sensitive files
   - Always use environment variables or Supabase secrets

2. ✅ **Use test mode for development**
   - Only switch to live mode when ready for production
   - Test thoroughly with test cards first

3. ✅ **Keep your keys secure**
   - Don't share your secret key with anyone
   - Regenerate keys if they're ever compromised

4. ✅ **Enable Stripe Radar**
   - Stripe includes fraud protection automatically
   - Review settings in Dashboard > Radar

5. ✅ **Set up webhooks** (optional but recommended)
   - Get notified of payment events
   - Handle refunds and disputes automatically

---

## Payment Flow Summary

Here's what happens when a customer books:

1. **Customer fills out booking form** (service, date/time, info)
2. **Clicks "Proceed to Payment"** (Step 4)
3. **Payment form loads** with Stripe Elements
4. **Behind the scenes:**
   - Frontend calls Supabase Edge Function
   - Edge Function creates PaymentIntent with Stripe API
   - Returns client secret to frontend
5. **Customer enters card details** and clicks "Pay $5.00 & Confirm Booking"
6. **Stripe processes payment**
   - Card is charged $5.00
   - Payment is authenticated (3D Secure if needed)
7. **If payment succeeds:**
   - Booking is saved to Supabase database
   - Customer is redirected to success page
   - Email confirmation sent (if configured)
8. **If payment fails:**
   - Error message shown to customer
   - Booking is NOT saved
   - Customer can try again with different card

---

## Stripe Fees

Stripe charges per successful transaction:
- **2.9% + 30¢** per successful card charge

For a $5 deposit:
- Fee: $5.00 × 2.9% + $0.30 = $0.445
- You receive: $4.56 (after fee)

The remaining balance ($20-$25 for services) is collected in cash at the appointment.

---

## Next Steps

After Stripe is set up:

1. ✅ Test thoroughly with test cards
2. ✅ Customize the email receipts in Stripe Dashboard
3. ✅ Set up webhook for payment confirmations (optional)
4. ✅ Configure refund policy
5. ✅ Train staff on handling no-shows and cancellations

---

## Support Resources

- **Stripe Documentation:** [stripe.com/docs](https://stripe.com/docs)
- **Stripe Support:** Dashboard > Help
- **Supabase Edge Functions:** [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **Test Cards:** [stripe.com/docs/testing](https://stripe.com/docs/testing)

---

## Quick Reference

### Commands

```bash
# Link Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Set Stripe secret
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY

# Deploy edge function
supabase functions deploy create-payment-intent

# View logs
supabase functions logs create-payment-intent

# List secrets
supabase secrets list
```

### Test Card

```
Number: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
ZIP: 12345
```

---

**🎉 Congratulations!** Your booking system now accepts secure online payments!
