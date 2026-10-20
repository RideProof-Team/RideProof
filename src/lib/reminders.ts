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
import { APPOINTMENT_TYPE_LABELS } from './labels';
import { upcomingTrips } from './recurrence';

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

/** The words for a reminder, used on Home and in phone notifications. */
export function reminderText(reminder: BookingReminder, profile: Profile): { title: string; body: string } {
  const who = profile.role === 'caregiver' ? `${profile.riderFirstName}'s` : 'your';
  const type = APPOINTMENT_TYPE_LABELS[reminder.appointment.type].toLowerCase();
  const when = `at ${reminder.appointment.clinicName} on ${formatLongDate(reminder.tripDate)} at ${formatTime(reminder.appointment.time)}`;
  const deadline = formatLongDate(reminder.deadline);

  switch (reminder.urgency) {
    case 'overdue':
      return {
        title: `Book the ride for ${who} ${type} appointment now`,
        body: `The appointment is ${when}. The booking deadline was ${deadline}. Call ${profile.rideCompanyName} now — they may still be able to help.`,
      };
    case 'today':
      return {
        title: `Book the ride for ${who} ${type} appointment today`,
        body: `The appointment is ${when}. Today is the last day to book the ride.`,
      };
    case 'soon':
      return {
        title: `Book the ride for ${who} ${type} appointment`,
        body: `The appointment is ${when}. Book the ride by ${deadline}.`,
      };
  }
}
