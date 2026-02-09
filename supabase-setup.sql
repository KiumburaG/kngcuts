-- KNG Cuts Booking System - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- =============================================
-- 1. Create Tables
-- =============================================

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    haircut TEXT NOT NULL,
    haircut_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    extras JSONB DEFAULT '[]'::jsonb,
    extras_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 5.00,
    payment_method TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Blocked dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date TEXT NOT NULL,
    reason TEXT DEFAULT 'Unavailable',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings table (key-value store for schedule, etc.)
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    includes TEXT,
    category TEXT NOT NULL DEFAULT 'haircut',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. Create updated_at trigger function
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to appointments
DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Apply trigger to settings
DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 3. Enable Row Level Security
-- =============================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RLS Policies
-- =============================================

-- APPOINTMENTS
DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;
CREATE POLICY "Anyone can create appointments"
    ON appointments FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can check availability" ON appointments;
CREATE POLICY "Anon can check availability"
    ON appointments FOR SELECT
    TO anon
    USING (status = 'confirmed');

-- BLOCKED DATES
DROP POLICY IF EXISTS "Anyone can read blocked dates" ON blocked_dates;
CREATE POLICY "Anyone can read blocked dates"
    ON blocked_dates FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert blocked dates" ON blocked_dates;
CREATE POLICY "Authenticated users can insert blocked dates"
    ON blocked_dates FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update blocked dates" ON blocked_dates;
CREATE POLICY "Authenticated users can update blocked dates"
    ON blocked_dates FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete blocked dates" ON blocked_dates;
CREATE POLICY "Authenticated users can delete blocked dates"
    ON blocked_dates FOR DELETE
    TO authenticated
    USING (true);

-- SETTINGS
DROP POLICY IF EXISTS "Anyone can read settings" ON settings;
CREATE POLICY "Anyone can read settings"
    ON settings FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;
CREATE POLICY "Authenticated users can update settings"
    ON settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can insert settings" ON settings;
CREATE POLICY "Authenticated users can insert settings"
    ON settings FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- SERVICES
DROP POLICY IF EXISTS "Anyone can read services" ON services;
CREATE POLICY "Anyone can read services"
    ON services FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert services" ON services;
CREATE POLICY "Authenticated users can insert services"
    ON services FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update services" ON services;
CREATE POLICY "Authenticated users can update services"
    ON services FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete services" ON services;
CREATE POLICY "Authenticated users can delete services"
    ON services FOR DELETE
    TO authenticated
    USING (true);

-- =============================================
-- 5. Seed Data - Default Services
-- =============================================

INSERT INTO services (name, description, price, includes, category) VALUES
    ('Fade', 'Professional fade cut with precision and style', 25.00, 'Includes line-up', 'haircut'),
    ('Buzz Cut', 'Clean and sharp buzz cut', 15.00, 'Includes line-up', 'haircut'),
    ('Trim', 'Detailed hair trim and shape-up', 25.00, 'Includes line-up', 'haircut'),
    ('Beard Trim/Line-up', 'Clean beard trim and line-up', 5.00, NULL, 'extra'),
    ('Beard Fade', 'Professional beard fade', 10.00, NULL, 'extra'),
    ('Eyebrows', 'Eyebrow slits or shape-up', 5.00, NULL, 'extra')
ON CONFLICT DO NOTHING;

-- Seed default schedule settings
INSERT INTO settings (key, value) VALUES
    ('schedule', '{
        "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "tuesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "wednesday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "thursday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "friday": {"enabled": true, "start": "09:00", "end": "18:00"},
        "saturday": {"enabled": true, "start": "10:00", "end": "16:00"},
        "sunday": {"enabled": false, "start": "10:00", "end": "16:00"}
    }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 6. Client Auth Migration
-- =============================================

-- Profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow insert for trigger (service role) and authenticated users
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
CREATE POLICY "Allow profile creation"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Admins can read all profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Apply updated_at trigger to profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Add user_id column to appointments (nullable for guest bookings)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add payment_intent_id and deposit_paid columns if missing
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        CASE
            WHEN NEW.email = 'kngcutsbarbershop@gmail.com' THEN 'admin'
            ELSE 'client'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 7. Updated Appointment RLS for Client Auth
-- =============================================
-- Drop old policies that need updating
DROP POLICY IF EXISTS "Authenticated users can read appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;

-- Admins can read all appointments
DROP POLICY IF EXISTS "Admins can read all appointments" ON appointments;
CREATE POLICY "Admins can read all appointments"
    ON appointments FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Clients can read their own appointments
DROP POLICY IF EXISTS "Clients can read own appointments" ON appointments;
CREATE POLICY "Clients can read own appointments"
    ON appointments FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Admins can update all appointments
DROP POLICY IF EXISTS "Admins can update all appointments" ON appointments;
CREATE POLICY "Admins can update all appointments"
    ON appointments FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Clients can update their own appointments (for cancellation)
DROP POLICY IF EXISTS "Clients can update own appointments" ON appointments;
CREATE POLICY "Clients can update own appointments"
    ON appointments FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Only admins can delete appointments
DROP POLICY IF EXISTS "Admins can delete appointments" ON appointments;
CREATE POLICY "Admins can delete appointments"
    ON appointments FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- =============================================
-- 8. Reviews Table
-- =============================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON reviews;
CREATE POLICY "Anyone can read approved reviews"
    ON reviews FOR SELECT
    TO anon, authenticated
    USING (approved = true);

-- Authenticated users can read their own reviews (even unapproved)
DROP POLICY IF EXISTS "Users can read own reviews" ON reviews;
CREATE POLICY "Users can read own reviews"
    ON reviews FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Authenticated users can create reviews
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews"
    ON reviews FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Admins can read all reviews
DROP POLICY IF EXISTS "Admins can read all reviews" ON reviews;
CREATE POLICY "Admins can read all reviews"
    ON reviews FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Admins can update reviews (approve/reject)
DROP POLICY IF EXISTS "Admins can update reviews" ON reviews;
CREATE POLICY "Admins can update reviews"
    ON reviews FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admins can delete reviews
DROP POLICY IF EXISTS "Admins can delete reviews" ON reviews;
CREATE POLICY "Admins can delete reviews"
    ON reviews FOR DELETE
    TO authenticated
    USING (public.is_admin());
