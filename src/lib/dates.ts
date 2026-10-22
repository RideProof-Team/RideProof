// ---------------------------------------------------------------------------
// dates.ts — small helpers for working with dates.
//
// We store dates as plain text like "2026-10-30" instead of JavaScript Date
// objects. Why? A Date is an exact moment in time, so it shifts with time
// zones: "Oct 30 at midnight" in California is still Oct 29 somewhere else.
// An appointment date is a calendar day, not a moment, so text is safer.
//
// When we need to do math (add days, find the weekday), we turn the text
// into a LOCAL Date, do the math, and turn it back into text.
//
// Dates and times are written in the app's language (see i18n.ts):
// "Friday, October 30" or "viernes, 30 de octubre".
// ---------------------------------------------------------------------------
import { getLanguage, locale } from './i18n';

/** "2026-10-30" -> a Date at local midnight on that day. */
export function parseDate(text: string): Date {
  const [year, month, day] = text.split('-').map(Number);
  // Months in JavaScript start at 0 (January = 0), so subtract 1.
  return new Date(year, month - 1, day);
}

/** A Date -> "2026-10-30", using the local calendar day. */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add (or subtract, if negative) a number of calendar days. */
export function addDays(text: string, days: number): string {
  const date = parseDate(text);
  // setDate handles month and year changes for us (Oct 31 + 1 = Nov 1).
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/** Day of the week: 0 = Sunday, 1 = Monday, ... 6 = Saturday. */
export function weekdayOf(text: string): number {
  return parseDate(text).getDay();
}

/**
 * "2026-10-30" -> "Friday, October 30" (Spanish: "viernes, 30 de octubre").
 * Pass withYear = true for "Friday, October 30, 2026".
 * Spanish writes weekdays and months in lowercase; use capitalize() when
 * the date starts a line.
 */
export function formatLongDate(text: string, withYear = false): string {
  return parseDate(text).toLocaleDateString(locale(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** "2026-10-16" -> "October 16, 2026" (no weekday: reads better inside a sentence). */
export function formatDateInSentence(text: string): string {
  return parseDate(text).toLocaleDateString(locale(), { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "2026-10-30" -> "Oct 30" (short, for lists). */
export function formatShortDate(text: string): string {
  return parseDate(text).toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
}

/** "2026-10-30" -> "October 2026" (Spanish: "Octubre de 2026"), for headings. */
export function formatMonthYear(text: string): string {
  return capitalize(parseDate(text).toLocaleDateString(locale(), { month: 'long', year: 'numeric' }));
}

/** "viernes, 30 de octubre" -> "Viernes, 30 de octubre" (for the start of a line). */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "09:00" -> "9:00 AM", "14:30" -> "2:30 PM" (Spanish: "9:00 a. m.", "2:30 p. m."). */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const spanish = getLanguage() === 'es';
  const suffix = hours >= 12 ? (spanish ? 'p. m.' : 'PM') : spanish ? 'a. m.' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}
