-- Run this in Supabase SQL Editor
-- Step 1: Delete all existing hostel data (as requested)
DELETE FROM wash_history;
DELETE FROM machines;
DELETE FROM hostels;

-- Step 2: Drop old columns that are no longer needed
ALTER TABLE hostels DROP COLUMN IF EXISTS name;

-- Step 3: Add new columns
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS hostel_name TEXT NOT NULL DEFAULT '';
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS login_id TEXT NOT NULL DEFAULT '';
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS admin_id TEXT NOT NULL DEFAULT '';
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS contact_number TEXT NOT NULL DEFAULT '';
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS machine_qr_url TEXT;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS room_qr_url TEXT;

-- Step 4: Remove defaults (they were just for the ALTER to succeed)
ALTER TABLE hostels ALTER COLUMN hostel_name DROP DEFAULT;
ALTER TABLE hostels ALTER COLUMN login_id DROP DEFAULT;
ALTER TABLE hostels ALTER COLUMN admin_id DROP DEFAULT;
ALTER TABLE hostels ALTER COLUMN contact_number DROP DEFAULT;
