// ---------------------------------------------------------------------------
// recurrence.ts — turns appointments into actual trip dates.
//
// A recurring appointment is saved ONCE, as a rule: "every Mon/Wed/Fri at
// 9:00 AM, starting Sept 28." We don't save a copy for every week (that
// would be hundreds of records, and editing the time would mean changing
// all of them). Instead, when a screen needs dates, we calculate them.
//
// A "trip" = one appointment on one specific date.
// ---------------------------------------------------------------------------
import type { Appointment, Weekday } from '../types';
import { addDays, formatLongDate, formatTime, weekdayOf } from './dates';
import { WEEKDAY_SHORT, WEEKDAYS_IN_ORDER } from './labels';

export interface Trip {
  appointment: Appointment;
  /** "YYYY-MM-DD" */
  date: string;
}

/**
 * Every date an appointment happens between `from` and `to` (both included).
 * Dates are text like "2026-10-30", and text in this format sorts the same
 * way dates do, so we can compare them with < and >.
 */
export function appointmentDates(appointment: Appointment, from: string, to: string): string[] {
  const rule = appointment.recurrence;

  if (rule.kind === 'none') {
    const inRange = appointment.date >= from && appointment.date <= to;
    return inRange ? [appointment.date] : [];
  }

  // Weekly: walk through each day from the later of (start date, from) up
  // to `to`, keeping days whose weekday is in the rule.
  // A recurring appointment never happens before its start date.
  const dates: string[] = [];
  let day = appointment.date > from ? appointment.date : from;
  while (day <= to) {
    if (rule.weekdays.includes(weekdayOf(day) as Weekday)) {
      dates.push(day);
    }
    day = addDays(day, 1);
  }
  return dates;
}

/** All trips for all appointments between two dates, earliest first. */
export function tripsBetween(appointments: Appointment[], from: string, to: string): Trip[] {
  const trips: Trip[] = [];
  for (const appointment of appointments) {
    for (const date of appointmentDates(appointment, from, to)) {
      trips.push({ appointment, date });
    }
  }
  // Sort by date, then by time on the same day.
  trips.sort((a, b) =>
    a.date === b.date
      ? a.appointment.time.localeCompare(b.appointment.time)
      : a.date.localeCompare(b.date),
  );
  return trips;
}

/** How far ahead we look for upcoming trips. */
export const UPCOMING_DAYS = 60;

/** Trips from today through the next UPCOMING_DAYS days, earliest first. */
export function upcomingTrips(appointments: Appointment[], today: string): Trip[] {
  return tripsBetween(appointments, today, addDays(today, UPCOMING_DAYS));
}

/**
 * A plain-language description of when an appointment happens:
 *   "Thursday, November 5 at 2:30 PM"
 *   "Every Mon, Wed, Fri at 9:00 AM"
 */
export function describeSchedule(appointment: Appointment): string {
  const time = formatTime(appointment.time);
  const rule = appointment.recurrence;
  if (rule.kind === 'none') {
    return `${formatLongDate(appointment.date)} at ${time}`;
  }
  // List the days Monday-first, no matter what order they were picked in.
  const days = WEEKDAYS_IN_ORDER.filter((d) => rule.weekdays.includes(d)).map((d) => WEEKDAY_SHORT[d]);
  return `Every ${days.join(', ')} at ${time}`;
}

/** True if a one-time appointment is over. Recurring ones are never "past". */
export function isPastAppointment(appointment: Appointment, today: string): boolean {
  return appointment.recurrence.kind === 'none' && appointment.date < today;
}
