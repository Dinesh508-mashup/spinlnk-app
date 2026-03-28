import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register the service worker
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('SW registered:', registration.scope);
    return registration;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

// Subscribe to push notifications
export async function subscribeToPush(registration, userName, hostelId) {
  if (!('PushManager' in window)) {
    console.warn('Push messaging not supported');
    return null;
  }

  try {
    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Save subscription to Supabase
    const subJson = subscription.toJSON();
    await savePushSubscription(subJson, userName, hostelId);

    console.log('Push subscription saved');
    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

// Save subscription to Supabase
async function savePushSubscription(subscription, userName, hostelId) {
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    user_name: userName,
    hostel_id: hostelId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) console.error('Failed to save push subscription:', error);
}

// Send a push notification via Supabase Edge Function
export async function sendPushNotification(hostelId, targetUserName, payload) {
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: { hostelId, targetUserName, payload },
    });
    if (error) console.error('Push send error:', error);
  } catch (err) {
    console.error('Push send failed:', err);
  }
}

// Trigger push for specific events
export async function pushSessionComplete(hostelId, userName, machineName, endTime) {
  const time = new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  await sendPushNotification(hostelId, userName, {
    title: 'Session Complete!',
    body: `Your session on ${machineName} ended at ${time}. Collect your clothes!`,
    tag: `session-${machineName}`,
    url: `/?hostel=${hostelId}`,
  });
}

export async function pushMachineAvailable(hostelId, userName, machineName) {
  await sendPushNotification(hostelId, userName, {
    title: 'Your Turn!',
    body: `${machineName} is now free — go grab it before someone else does!`,
    tag: `available-${machineName}`,
    url: `/?hostel=${hostelId}`,
  });
}

export async function pushTimerWarning(hostelId, userName, machineName, minsLeft) {
  await sendPushNotification(hostelId, userName, {
    title: 'Almost Done!',
    body: `${machineName} has ${minsLeft} minute${minsLeft > 1 ? 's' : ''} remaining.`,
    tag: `warning-${machineName}`,
    url: `/lineup?hostel=${hostelId}`,
  });
}

export async function pushBookingConfirmed(hostelId, userName, machineName, cycle, minutes) {
  const start = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const end = new Date(Date.now() + minutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  await sendPushNotification(hostelId, userName, {
    title: 'Booking Confirmed!',
    body: `${machineName} — ${cycle} cycle: ${start} to ${end} (${minutes} min)`,
    tag: `booking-${machineName}`,
    url: `/lineup?hostel=${hostelId}`,
  });
}

export async function pushQueueUpdate(hostelId, userName, machineName, position) {
  await sendPushNotification(hostelId, userName, {
    title: 'Queue Update',
    body: position === 1
      ? `You're next for ${machineName}!`
      : `You're #${position} for ${machineName}. ${position - 1} ahead of you.`,
    tag: `queue-${machineName}`,
    url: `/join?hostel=${hostelId}`,
  });
}
