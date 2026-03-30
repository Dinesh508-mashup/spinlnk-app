-- Run this in your Supabase SQL Editor to create the timer_alerts table
-- This table stores pending alarm notifications to be sent via server-side push

CREATE TABLE IF NOT EXISTS timer_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_id TEXT NOT NULL,
  machine_key TEXT NOT NULL,
  machine_name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('session', 'queue')),
  alert_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for the check-timers Edge Function: find unsent alerts that are due
CREATE INDEX IF NOT EXISTS idx_timer_alerts_pending
  ON timer_alerts (sent, alert_at)
  WHERE sent = FALSE;

-- Index for deleting alerts when a user frees a machine early
CREATE INDEX IF NOT EXISTS idx_timer_alerts_lookup
  ON timer_alerts (hostel_id, machine_key, user_name);

-- RLS: Allow anon/authenticated users to insert and delete their own alerts
ALTER TABLE timer_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on timer_alerts" ON timer_alerts
  FOR ALL USING (true) WITH CHECK (true);
