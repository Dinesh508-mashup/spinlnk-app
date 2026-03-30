-- Run this in your Supabase SQL Editor AFTER deploying the check-timers Edge Function.
-- This sets up pg_cron to call the Edge Function every 30 seconds.

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule the check-timers function every 30 seconds
-- pg_cron minimum interval is 1 minute, so we schedule two jobs offset by 30 seconds.

-- Job A: runs every minute at :00
SELECT cron.schedule(
  'check-timer-alerts-a',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wskoxxsglnkgzrtdxefp.supabase.co/functions/v1/check-timers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Job B: runs every minute at :30 (using pg_sleep to offset by 30 seconds)
SELECT cron.schedule(
  'check-timer-alerts-b',
  '* * * * *',
  $$
  SELECT pg_sleep(30);
  SELECT net.http_post(
    url := 'https://wskoxxsglnkgzrtdxefp.supabase.co/functions/v1/check-timers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ALTERNATIVE: If the above doesn't work with pg_sleep, use a single job every minute:
-- SELECT cron.schedule(
--   'check-timer-alerts',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://wskoxxsglnkgzrtdxefp.supabase.co/functions/v1/check-timers',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- To unschedule:
-- SELECT cron.unschedule('check-timer-alerts-a');
-- SELECT cron.unschedule('check-timer-alerts-b');

-- NOTE: You need to set the service_role_key in Supabase dashboard settings,
-- or replace the Authorization header with a hardcoded service role key:
--   'Authorization', 'Bearer eyJhbGciOiJIUz...<your-service-role-key>'
