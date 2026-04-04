-- Run this in Supabase SQL Editor to add room_qr_url column to hostels table
-- (machine_qr_url may already exist)

ALTER TABLE hostels ADD COLUMN IF NOT EXISTS room_qr_url TEXT;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS machine_qr_url TEXT;
