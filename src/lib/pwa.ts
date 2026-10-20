// ---------------------------------------------------------------------------
// pwa.ts — the "app-like" extras of a Progressive Web App:
//
//   Install: Chrome on Android fires a "beforeinstallprompt" event when the
//   app can be installed. We save that event so a friendly "Install" button
//   inside RideProof can show the install box later. (iPhones don't support
//   this; the Help screen explains how to "Add to Home Screen" instead.)
//
//   Update: when a new version is published, the browser downloads the new
//   service worker in the background, but we keep it WAITING so nothing
//   changes in the middle of a check-in. We show "A new version is ready",
//   and only when the user taps "Update" do we switch and reload.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';

/** Chrome's install event (not yet part of TypeScript's built-in types). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installEvent: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

/** True when RideProof is running as an installed app (not in a browser tab). */
export function isInstalled(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true);
}

/** Called once from main.tsx when the app starts. */
export function startPwa() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // don't show Chrome's own mini bar; we'll ask nicely
    installEvent = event as BeforeInstallPromptEvent;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    changed();
  });

  // The service worker only runs in the built app (see main.tsx).
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      // Watch a new version while it downloads. "installed" + an existing
      // controller means it's an UPDATE (not the very first install).
      const watch = (worker: ServiceWorker) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker);
        });
      };
      // The browser may have found an update before this code ran, so check
      // for one that's already waiting or already downloading, too.
      if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
      if (registration.installing) watch(registration.installing);
      registration.addEventListener('updatefound', () => {
        if (registration.installing) watch(registration.installing);
      });
      // Check for a new version whenever the user comes back to the app.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    } catch {
      // If this fails, the app still works; it just won't work offline.
    }
  });
}

function setWaiting(worker: ServiceWorker) {
  waitingWorker = worker;
  changed();
}

export async function installApp() {
  if (!installEvent) return;
  await installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  changed();
}

export function applyUpdate() {
  if (!waitingWorker) return;
  // When the new version takes over, reload once to use its files.
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waitingWorker.postMessage('SKIP_WAITING');
}

/** A React hook so screens redraw when install/update becomes available. */
export function usePwa() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return { canInstall: installEvent !== null && !isInstalled(), updateReady: waitingWorker !== null };
}
