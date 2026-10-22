// ---------------------------------------------------------------------------
// reminders.ts — which rides need booking soon?
//
// For every appointment whose ride ISN'T booked yet, we find its next trip,
// work out the booking deadline from the state's rules, and decide how
// urgent it is:
//   'overdue' = the deadline has passed (call now, they may still help)
//   'today'   = today is the last day to book
//   'soon'    = the deadline is within the next week
// ---------------------------------------------------------------------------
import type { Appointment, Profile } from '../types';
import { bookingDeadline } from './businessDays';
import { addDays, formatLongDate, formatTime } from './dates';
import { t } from './i18n';
import { APPOINTMENT_TYPE_LABELS } from './labels';
import { spanishOneOClock, upcomingTrips } from './recurrence';

export type Urgency = 'overdue' | 'today' | 'soon';

export interface BookingReminder {
  appointment: Appointment;
  /** The trip that needs a ride. */
  tripDate: string;
  /** The last day to book. */
  deadline: string;
  urgency: Urgency;
}

/** Only remind about deadlines this many days away or fewer. */
export const REMINDER_LOOKAHEAD_DAYS = 7;

export function bookingReminders(
  appointments: Appointment[],
  today: string,
  windowBusinessDays: number,
): BookingReminder[] {
  const reminders: BookingReminder[] = [];
  const unbooked = appointments.filter((a) => !a.rideBooked);

  for (const appointment of unbooked) {
    // Only the NEXT trip of each appointment, so a repeating appointment
    // doesn't fill the screen with one reminder per week.
    const nextTrip = upcomingTrips([appointment], today)[0];
    if (!nextTrip) continue;

    const deadline = bookingDeadline(nextTrip.date, windowBusinessDays);
    if (deadline > addDays(today, REMINDER_LOOKAHEAD_DAYS)) continue;

    const urgency: Urgency = deadline < today ? 'overdue' : deadline === today ? 'today' : 'soon';
    reminders.push({ appointment, tripDate: nextTrip.date, deadline, urgency });
  }

  // Most urgent first.
  return reminders.sort((a, b) => a.deadline.localeCompare(b.deadline));
}

/** "your dialysis appointment" / "Rosa's dialysis appointment" ("su cita de diálisis" / "la cita de diálisis de Rosa"). */
function appointmentPhrase(reminder: BookingReminder, profile: Profile): string {
  const kind = reminder.appointment.type;
  const name = profile.riderFirstName;
  const caregiver = profile.role === 'caregiver';
  // "Other" has no good Spanish adjective ("su cita de otra"), so it gets its own words.
  if (kind === 'other') return caregiver ? t("{name}'s other appointment", { name }) : t('your other appointment');
  const type = t(APPOINTMENT_TYPE_LABELS[kind]).toLowerCase();
  return caregiver ? t("{name}'s {type} appointment", { name, type }) : t('your {type} appointment', { type });
}

/** The words for a reminder, used on Home and in phone notifications. */
export function reminderText(reminder: BookingReminder, profile: Profile): { title: string; body: string } {
  const appointment = appointmentPhrase(reminder, profile);
  const when = spanishOneOClock(
    t('at {clinic} on {date} at {time}', {
      clinic: reminder.appointment.clinicName,
      date: formatLongDate(reminder.tripDate),
      time: formatTime(reminder.appointment.time),
    }),
  );
  const deadline = formatLongDate(reminder.deadline);

  switch (reminder.urgency) {
    case 'overdue':
      return {
        title: t('Book the ride for {appointment} now', { appointment }),
        body: t(
          'The appointment is {when}. The booking deadline was {deadline}. Call {company} now — they may still be able to help.',
          { when, deadline, company: profile.rideCompanyName },
        ),
      };
    case 'today':
      return {
        title: t('Book the ride for {appointment} today', { appointment }),
        body: t('The appointment is {when}. Today is the last day to book the ride.', { when }),
      };
    case 'soon':
      return {
        title: t('Book the ride for {appointment}', { appointment }),
        body: t('The appointment is {when}. Book the ride by {deadline}.', { when, deadline }),
      };
  }
}
