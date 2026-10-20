// ---------------------------------------------------------------------------
// notifications.ts — phone/computer notifications for booking reminders.
//
// IMPORTANT LIMIT: RideProof has no server, so it can't "push" a message
// to a phone while the app is closed. Notifications are sent when the
// app is opened (or is open). The Home screen reminders always work,
// with or without notification permission.
//
// Every function here is safe to call even if the browser doesn't
// support notifications or the user said no; it just does nothing.
// ---------------------------------------------------------------------------
import type { DataMode } from './storage';

export type PermissionState = NotificationPermission | 'unsupported';

export function notificationPermission(): PermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/** Ask the user for permission. Browsers only allow this after a tap. */
export async function askNotificationPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Show one notification. Returns true if it was shown.
 * Android phones only allow notifications through the service worker
 * (the app's offline helper), so we try that first.
 */
export async function showNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false;
  const options = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

// ----- Don't send the same reminder over and over -----
// We remember which reminders were already sent today, in localStorage,
// separately for real and demo mode.

function sentKey(mode: DataMode) {
  return `rideproof-notified-${mode}`;
}

function loadSent(mode: DataMode): string[] {
  try {
    return JSON.parse(localStorage.getItem(sentKey(mode)) ?? '[]');
  } catch {
    return [];
  }
}

/**
 * Send a notification only if this exact one (same `id`) hasn't been sent
 * today already. Returns true if it was sent now.
 */
export async function notifyOncePerDay(mode: DataMode, id: string, today: string, title: string, body: string) {
  const key = `${today}|${id}`;
  // Keep only today's entries so the list doesn't grow forever.
  const sent = loadSent(mode).filter((entry) => entry.startsWith(`${today}|`));
  if (sent.includes(key)) return false;
  const shown = await showNotification(title, body, id);
  if (shown) {
    try {
      localStorage.setItem(sentKey(mode), JSON.stringify([...sent, key]));
    } catch {
      // Couldn't save; worst case the reminder is shown again later.
    }
  }
  return shown;
}

/** Forget which reminders were sent (used by "Delete all my data"). */
export function clearSentNotifications(mode: DataMode) {
  try {
    localStorage.removeItem(sentKey(mode));
  } catch {
    // Nothing to clear.
  }
}
