// ---------------------------------------------------------------------------
// DemoControls.tsx — the panel that opens from the demo banner.
//   - Shortcuts straight to the screens shown in the pitch video
//   - "Simulate reminder": show the booking reminder notification now
//   - "Reset demo": put the sample story back to how it started
// It uses the built-in <dialog> element, which handles focus, the Escape
// key, and screen readers for us.
// ---------------------------------------------------------------------------
import type { RefObject } from 'react';
import { useApp } from '../AppContext';
import { resetDemo } from '../lib/demoData';
import { askNotificationPermission, notificationPermission, showNotification } from '../lib/notifications';
import { bookingReminders, reminderText } from '../lib/reminders';
import { navigate, type Route } from '../lib/router';
import { effectiveBookingWindow } from '../lib/bookingWindow';
import { getStateRule } from '../lib/stateRules';

const SHORTCUTS: { label: string; route: Route }[] = [
  { label: 'Home', route: { name: 'home' } },
  { label: 'Ride check-in', route: { name: 'checkin' } },
  { label: 'History', route: { name: 'history' } },
  { label: 'Report', route: { name: 'report' } },
  { label: 'Complaint preview', route: { name: 'complaint' } },
];

export function DemoControls({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const { storage, profile, today, refreshAll, showToast } = useApp();

  function close() {
    dialogRef.current?.close();
  }

  function go(route: Route) {
    close();
    navigate(route);
  }

  async function simulateReminder() {
    close();
    if (!profile) return;
    const bookingWindow = effectiveBookingWindow(profile, getStateRule(profile.state));
    const reminders = bookingWindow.days === null ? [] : bookingReminders(await storage.listAppointments(), today, bookingWindow.days);
    if (reminders.length === 0) {
      showToast({ title: 'No booking reminders right now', body: 'Tap "Reset demo" to bring the sample reminder back.' });
      return;
    }
    const { title, body } = reminderText(reminders[0], profile);
    // Always show the in-app version (it appears in screen recordings)...
    showToast({ title, body });
    // ...and also a real notification, if the browser allows it.
    if (notificationPermission() === 'default') await askNotificationPermission();
    await showNotification(title, body, 'demo-reminder');
  }

  async function reset() {
    close();
    await resetDemo(storage);
    showToast(null);
    navigate({ name: 'home' });
    refreshAll();
  }

  return (
    <dialog ref={dialogRef} className="demo-dialog" aria-labelledby="demo-controls-heading">
      <h2 id="demo-controls-heading">Demo controls</h2>
      <p className="field-hint">Changes here only affect the sample data, never your own.</p>
      <h3>Go to</h3>
      <div className="shortcut-grid">
        {SHORTCUTS.map((s) => (
          <button key={s.label} type="button" className="button-secondary" onClick={() => go(s.route)}>
            {s.label}
          </button>
        ))}
      </div>
      <h3>Actions</h3>
      <div className="button-stack">
        <button type="button" className="button-secondary" onClick={simulateReminder}>
          Simulate reminder
        </button>
        <button type="button" className="button-danger" onClick={reset}>
          Reset demo
        </button>
        <button type="button" className="button-primary" onClick={close}>
          Close
        </button>
      </div>
    </dialog>
  );
}
