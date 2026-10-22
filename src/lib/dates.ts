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
// ---------------------------------------------------------------------------

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
 * "2026-10-30" -> "Friday, October 30".
 * Pass withYear = true for "Friday, October 30, 2026".
 */
export function formatLongDate(text: string, withYear = false): string {
  return parseDate(text).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** "2026-10-16" -> "October 16, 2026" (no weekday: reads better inside a sentence). */
export function formatDateInSentence(text: string): string {
  return parseDate(text).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "2026-10-30" -> "Oct 30" (short, for lists). */
export function formatShortDate(text: string): string {
  return parseDate(text).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "09:00" -> "9:00 AM", "14:30" -> "2:30 PM". */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}
