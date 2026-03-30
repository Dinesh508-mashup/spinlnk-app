// Supabase Edge Function: check-timers
// Called by pg_cron every 30 seconds to send push notifications for due timer alerts.
// Deploy with: supabase functions deploy check-timers
// Set secrets:
//   supabase secrets set VAPID_PUBLIC_KEY=<key> VAPID_PRIVATE_KEY=<key> VAPID_EMAIL=mailto:dineshmaganti4@gmail.com

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:dineshmaganti4@gmail.com'

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

serve(async (_req) => {
  const started = Date.now()

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Fetch all unsent alerts that are due
    const { data: alerts, error: fetchErr } = await supabase
      .from('timer_alerts')
      .select('*')
      .eq('sent', false)
      .lte('alert_at', new Date().toISOString())
      .limit(100)

    if (fetchErr) throw fetchErr
    if (!alerts || alerts.length === 0) {
      // Cleanup: delete old sent alerts (older than 1 hour)
      await supabase
        .from('timer_alerts')
        .delete()
        .eq('sent', true)
        .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

      // Also delete unsent alerts that are way past due (older than 1 hour)
      await supabase
        .from('timer_alerts')
        .delete()
        .lt('alert_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

      return new Response(JSON.stringify({ processed: 0, ms: Date.now() - started }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let sentCount = 0
    let failCount = 0

    // 2. Process each alert
    for (const alert of alerts) {
      try {
        // Look up the user's push subscription(s)
        const { data: subs, error: subErr } = await supabase
          .from('push_subscriptions')
          .select('endpoint, keys')
          .eq('hostel_id', alert.hostel_id)
          .eq('user_name', alert.user_name)

        if (subErr) {
          console.error(`Subscription lookup failed for ${alert.user_name}:`, subErr)
          failCount++
          continue
        }

        if (!subs || subs.length === 0) {
          // No subscription found - mark as sent so we don't retry forever
          await supabase
            .from('timer_alerts')
            .update({ sent: true })
            .eq('id', alert.id)
          continue
        }

        // Build notification payload
        const isQueue = alert.alert_type === 'queue'
        const payload = JSON.stringify({
          title: isQueue ? 'Your Turn!' : "Time's Up!",
          body: isQueue
            ? `${alert.machine_name} — Go grab the machine now!`
            : `${alert.machine_name} has finished. Collect your clothes!`,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: `timer-${alert.alert_type}-${alert.machine_key}`,
          url: `/home?hostel=${alert.hostel_id}`,
          actions: [
            { action: 'stop', title: 'Stop Alarm' },
            { action: 'open', title: 'Open App' },
          ],
        })

        // Send to all subscriptions for this user
        const pushResults = await Promise.allSettled(
          subs.map((sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
            webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.keys.p256dh,
                  auth: sub.keys.auth,
                },
              },
              payload,
              { TTL: 300 } // 5 minute TTL
            )
          )
        )

        // Clean up expired subscriptions (410 Gone)
        for (let i = 0; i < pushResults.length; i++) {
          const result = pushResults[i]
          if (result.status === 'rejected') {
            const statusCode = (result.reason as any)?.statusCode
            if (statusCode === 410 || statusCode === 404) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', subs[i].endpoint)
            }
          }
        }

        // Mark alert as sent
        await supabase
          .from('timer_alerts')
          .update({ sent: true })
          .eq('id', alert.id)

        sentCount++
      } catch (alertErr) {
        console.error(`Failed to process alert ${alert.id}:`, alertErr)
        failCount++
      }
    }

    // 3. Cleanup old alerts
    await supabase
      .from('timer_alerts')
      .delete()
      .eq('sent', true)
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    await supabase
      .from('timer_alerts')
      .delete()
      .lt('alert_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    return new Response(
      JSON.stringify({
        processed: alerts.length,
        sent: sentCount,
        failed: failCount,
        ms: Date.now() - started,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('check-timers error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
