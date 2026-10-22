// ---------------------------------------------------------------------------
// BookingReminders.tsx — the "Book your ride" box on the Home screen.
//
// Shows a reminder for each unbooked ride whose deadline is close, with
// "Call to book" (opens the what-to-say script) and "I booked it" buttons.
// If an earlier call didn't work, it says so. If the user allows it, the
// same reminders are also sent as phone notifications (once per day).
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { askNotificationPermission, notificationPermission, notifyOncePerDay } from '../lib/notifications';
import { reminderText, type BookingReminder } from '../lib/reminders';
import { attemptsForTrip, FAIL_REASON_SHORT } from '../lib/bookingAttempts';
import { formatLongDate } from '../lib/dates';
import { t, tn } from '../lib/i18n';
import { routeToHash } from '../lib/router';
import type { FailedBooking } from '../types';
import { Icon } from './Icon';

interface Props {
  reminders: BookingReminder[];
  onBooked(reminder: BookingReminder): void;
  /** Calls that didn't work, to show "Last call: couldn't get through". */
  attempts?: FailedBooking[];
}

export function BookingReminders({ reminders, onBooked, attempts = [] }: Props) {
  const { profile, mode, today } = useApp();
  const [permission, setPermission] = useState(notificationPermission);

  // Send notifications for the reminders (real mode only; demo mode has a
  // "Simulate reminder" button instead, so videos aren't interrupted).
  // A text "key" of the reminders lets React know when they really changed.
  const key = reminders.map((r) => `${r.appointment.id}:${r.tripDate}`).join(',');
  useEffect(() => {
    if (!profile || mode !== 'real' || permission !== 'granted') return;
    for (const reminder of reminders) {
      const { title, body } = reminderText(reminder, profile);
      notifyOncePerDay(mode, `${reminder.appointment.id}:${reminder.tripDate}`, today, title, body);
    }
  }, [key, permission, mode, today, profile]);

  if (!profile || reminders.length === 0) return null;

  async function turnOnNotifications() {
    setPermission(await askNotificationPermission());
  }

  return (
    <section className="card card-reminder" aria-labelledby="reminder-heading">
      <h2 id="reminder-heading">
        <Icon name="warning" /> {tn(reminders.length, 'Book a ride', 'Book {n} rides')}
      </h2>
      <ul className="plain-list">
        {reminders.map((reminder) => {
          const { title, body } = reminderText(reminder, profile);
          const lastTry = attemptsForTrip(attempts, reminder.appointment.id, reminder.tripDate)[0];
          return (
            <li key={`${reminder.appointment.id}-${reminder.tripDate}`} className="reminder-item">
              <p className="reminder-title">
                {reminder.urgency !== 'soon' && (
                  <span className="badge badge-problem badge-attention">{reminder.urgency === 'today' ? t('Due today') : t('Past due')}</span>
                )}{' '}
                {title}
              </p>
              <p>{body}</p>
              {lastTry && (
                <p className="status status-problem">
                  <Icon name="x" size={20} />
                  {t('Last call on {date}: {reason}. Still not booked.', {
                    date: formatLongDate(lastTry.attemptedOn),
                    reason: t(FAIL_REASON_SHORT[lastTry.reason]),
                  })}
                </p>
              )}
              <div className="button-stack">
                <a href={routeToHash({ name: 'call', appointmentId: reminder.appointment.id, date: reminder.tripDate })} className="button-primary">
                  <Icon name="phone" /> {t('Call {company} to book', { company: profile.rideCompanyName })}
                </a>
                <button type="button" className="button-secondary" onClick={() => onBooked(reminder)}>
                  <Icon name="check" /> {t('I booked this ride')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {permission === 'default' && mode === 'real' && (
        <button type="button" className="link-button" onClick={turnOnNotifications}>
          {t('Also send reminders as phone notifications')}
        </button>
      )}
    </section>
  );
}
