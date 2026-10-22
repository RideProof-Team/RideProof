// ---------------------------------------------------------------------------
// DemoControls.tsx — the panel that opens from the demo banner.
//   - Shortcuts straight to the screens shown in the pitch video
//   - "Simulate reminder": show the booking reminder notification now
//   - "Jump ahead 15 minutes": move the simulated demo clock forward, so
//     the ride timer shows what happens when a ride is 15 / 30 minutes late
//   - "Reset demo": put the sample story back to how it started
// It uses the built-in <dialog> element, which handles focus, the Escape
// key, and screen readers for us.
// ---------------------------------------------------------------------------
import type { RefObject } from 'react';
import { useApp } from '../AppContext';
import { jumpDemoClock } from '../lib/clock';
import { resetDemo } from '../lib/demoData';
import { showSnackbar } from '../lib/feedback';
import { askNotificationPermission, notificationPermission, showNotification } from '../lib/notifications';
import { bookingReminders, reminderText } from '../lib/reminders';
import { navigate, type Route } from '../lib/router';
import { effectiveBookingWindow } from '../lib/bookingWindow';
import { getStateRule } from '../lib/stateRules';
import { msg, t } from '../lib/i18n';

// Labels are English, marked with msg() and shown with t().
const SHORTCUTS: { label: string; route: Route }[] = [
  { label: msg('Home'), route: { name: 'home' } },
  { label: msg('Ride timer'), route: { name: 'wait' } },
  { label: msg('Booking call script'), route: { name: 'call', appointmentId: 'demo-cardiology', date: '2026-11-03' } },
  { label: msg('Ride check-in'), route: { name: 'checkin' } },
  { label: msg('History'), route: { name: 'history' } },
  { label: msg('Report'), route: { name: 'report' } },
  { label: msg('Care team summary'), route: { name: 'care-team' } },
  { label: msg('Complaint preview'), route: { name: 'complaint' } },
  { label: msg('Complaints sent'), route: { name: 'complaints' } },
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
      showToast({ title: t('No booking reminders right now'), body: t('Tap "Reset demo" to bring the sample reminder back.') });
      return;
    }
    const { title, body } = reminderText(reminders[0], profile);
    // Always show the in-app version (it appears in screen recordings)...
    showToast({ title, body });
    // ...and also a real notification, if the browser allows it.
    if (notificationPermission() === 'default') await askNotificationPermission();
    await showNotification(title, body, 'demo-reminder');
  }

  function jumpAhead() {
    close();
    jumpDemoClock(15);
    showSnackbar(t('Demo clock moved ahead 15 minutes.'));
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
      <h2 id="demo-controls-heading">{t('Demo controls')}</h2>
      <p className="field-hint">{t('Changes here only affect the sample data, never your own.')}</p>
      <h3>{t('Go to')}</h3>
      <div className="shortcut-grid">
        {SHORTCUTS.map((s) => (
          <button key={s.label} type="button" className="button-secondary" onClick={() => go(s.route)}>
            {t(s.label)}
          </button>
        ))}
      </div>
      <h3>{t('Actions')}</h3>
      <div className="button-stack">
        <button type="button" className="button-secondary" onClick={simulateReminder}>
          {t('Simulate reminder')}
        </button>
        <button type="button" className="button-secondary" onClick={jumpAhead}>
          {t('Ride timer: jump ahead 15 minutes')}
        </button>
        <button type="button" className="button-danger" onClick={reset}>
          {t('Reset demo')}
        </button>
        <button type="button" className="button-primary" onClick={close}>
          {t('Close')}
        </button>
      </div>
    </dialog>
  );
}
