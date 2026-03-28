-- Run this in your Supabase SQL Editor to create the push_subscriptions table

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  keys JSONB NOT NULL,
  user_name TEXT NOT NULL,
  hostel_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions (hostel_id, user_name);

-- RLS: Allow authenticated and anon users to manage their subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on push_subscriptions" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);
