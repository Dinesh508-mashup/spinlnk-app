// Supabase Edge Function: send-push
// Deploy with: supabase functions deploy send-push
// Set secrets: supabase secrets set VAPID_PRIVATE_KEY=<your-key> VAPID_PUBLIC_KEY=<your-key>

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Web Push requires JWK signing — use the web-push compatible approach
async function sendWebPush(subscription: any, payload: any) {
  const body = JSON.stringify(payload)

  // Create JWT for VAPID auth
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const now = Math.floor(Date.now() / 1000)
  const claims = btoa(JSON.stringify({
    aud: new URL(subscription.endpoint).origin,
    exp: now + 86400,
    sub: 'mailto:admin@spinlnk.app',
  }))

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body,
  })

  return response
}

serve(async (req) => {
  try {
    const { hostelId, targetUserName, payload } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('hostel_id', hostelId)
      .eq('user_name', targetUserName)

    if (error) throw error
    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(sub => sendWebPush(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ))
    )

    // Clean up expired subscriptions (410 Gone)
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        const res = results[i].value
        if (res.status === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', subscriptions[i].endpoint)
        }
      }
    }

    return new Response(JSON.stringify({ sent: results.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
