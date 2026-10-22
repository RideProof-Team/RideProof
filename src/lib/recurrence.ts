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
import { addDays, capitalize, formatLongDate, formatTime, weekdayOf } from './dates';
import { getLanguage, t } from './i18n';
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
  const skipped = appointment.skippedDates ?? [];
  return datesFromRule(appointment, from, to).filter((date) => !skipped.includes(date));
}

/** The dates the rule says, before taking out skipped days. */
function datesFromRule(appointment: Appointment, from: string, to: string): string[] {
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
 * Spanish says "a las 9:00" but "a la 1:00" (one o'clock is singular).
 * Fixes a translated sentence that has "a las {time}" in it.
 */
export function spanishOneOClock(text: string): string {
  return getLanguage() === 'es' ? text.replace(/\ba las 1:/g, 'a la 1:') : text;
}

/** "Mon, Wed, Fri" (Spanish: "lun, mié y vie"). */
function joinDays(days: string[]): string {
  if (getLanguage() !== 'es' || days.length < 2) return days.join(', ');
  return `${days.slice(0, -1).join(', ')} y ${days[days.length - 1]}`;
}

/**
 * A plain-language description of when an appointment happens:
 *   "Thursday, November 5 at 2:30 PM"   ("Jueves, 5 de noviembre a las 2:30 p. m.")
 *   "Every Mon, Wed, Fri at 9:00 AM"    ("Cada lun, mié y vie a las 9:00 a. m.")
 */
export function describeSchedule(appointment: Appointment): string {
  const time = formatTime(appointment.time);
  const rule = appointment.recurrence;
  if (rule.kind === 'none') {
    return spanishOneOClock(capitalize(t('{date} at {time}', { date: formatLongDate(appointment.date), time })));
  }
  // List the days Monday-first, no matter what order they were picked in.
  const days = WEEKDAYS_IN_ORDER.filter((d) => rule.weekdays.includes(d)).map((d) => t(WEEKDAY_SHORT[d]));
  return spanishOneOClock(t('Every {days} at {time}', { days: joinDays(days), time }));
}

/** True if a one-time appointment is over. Recurring ones are never "past". */
export function isPastAppointment(appointment: Appointment, today: string): boolean {
  return appointment.recurrence.kind === 'none' && appointment.date < today;
}

// ---------------------------------------------------------------------------
// Skipping one day ("dialysis is cancelled this Monday").
// These return a NEW appointment instead of changing the old one, which
// makes "Undo" easy: just save the old one again.
// ---------------------------------------------------------------------------

export function skipTrip(appointment: Appointment, date: string): Appointment {
  const skipped = appointment.skippedDates ?? [];
  if (skipped.includes(date)) return appointment;
  return { ...appointment, skippedDates: [...skipped, date].sort() };
}

export function restoreTrip(appointment: Appointment, date: string): Appointment {
  return { ...appointment, skippedDates: (appointment.skippedDates ?? []).filter((d) => d !== date) };
}
