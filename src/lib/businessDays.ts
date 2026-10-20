// ---------------------------------------------------------------------------
// businessDays.ts — "book your ride at least N business days ahead."
//
// A business day is Monday–Friday that isn't a federal holiday.
// Example (2 business days): an appointment on Wednesday must be booked by
// Monday. An appointment on Monday must be booked by the Thursday before,
// because Saturday and Sunday don't count.
//
// NOTE: Ride companies may close on other days too. VERIFY with your
// state's Medicaid website which days count.
// ---------------------------------------------------------------------------
import { addDays, toDateString, weekdayOf } from './dates';

/** The date of the Nth given weekday in a month, e.g. the 4th Thursday of November. */
function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  // Start at the 1st of the month, move forward to the first matching weekday...
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  // ...then jump ahead (n - 1) weeks.
  return toDateString(new Date(year, month - 1, 1 + offset + (n - 1) * 7));
}

/** The date of the last given weekday in a month, e.g. the last Monday of May. */
function lastWeekday(year: number, month: number, weekday: number): string {
  // Day 0 of next month = the last day of this month.
  const last = new Date(year, month, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return toDateString(new Date(year, month - 1, last.getDate() - offset));
}

/**
 * When a fixed-date holiday falls on a weekend, offices close on a
 * weekday instead: Saturday -> the Friday before, Sunday -> the Monday after.
 */
function observed(date: string): string {
  const day = weekdayOf(date);
  if (day === 6) return addDays(date, -1);
  if (day === 0) return addDays(date, 1);
  return date;
}

/** The 11 U.S. federal holidays (the days offices are closed) for one year. */
export function federalHolidays(year: number): string[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fixed = (month: number, day: number) => observed(`${year}-${pad(month)}-${pad(day)}`);
  return [
    fixed(1, 1), // New Year's Day
    nthWeekday(year, 1, 1, 3), // Martin Luther King Jr. Day: 3rd Monday of January
    nthWeekday(year, 2, 1, 3), // Washington's Birthday: 3rd Monday of February
    lastWeekday(year, 5, 1), // Memorial Day: last Monday of May
    fixed(6, 19), // Juneteenth
    fixed(7, 4), // Independence Day
    nthWeekday(year, 9, 1, 1), // Labor Day: 1st Monday of September
    nthWeekday(year, 10, 1, 2), // Columbus Day: 2nd Monday of October
    fixed(11, 11), // Veterans Day
    nthWeekday(year, 11, 4, 4), // Thanksgiving: 4th Thursday of November
    fixed(12, 25), // Christmas Day
  ];
}

// Remember each year's holidays after working them out once.
const holidayCache = new Map<number, Set<string>>();

export function isFederalHoliday(date: string): boolean {
  const year = Number(date.slice(0, 4));
  if (!holidayCache.has(year)) {
    // Also include next year's list: when Jan 1 is a Saturday, it is
    // observed on Dec 31 of THIS year (this happens in 2027).
    holidayCache.set(year, new Set([...federalHolidays(year), ...federalHolidays(year + 1)]));
  }
  return holidayCache.get(year)!.has(date);
}

export function isBusinessDay(date: string): boolean {
  const day = weekdayOf(date);
  return day !== 0 && day !== 6 && !isFederalHoliday(date);
}

/** Count back `count` business days from a date (the date itself doesn't count). */
export function subtractBusinessDays(date: string, count: number): string {
  let day = date;
  let counted = 0;
  while (counted < count) {
    day = addDays(day, -1);
    if (isBusinessDay(day)) counted++;
  }
  return day;
}

/**
 * The last day a ride can be booked for an appointment on `appointmentDate`,
 * if the state requires booking `windowBusinessDays` business days ahead.
 */
export function bookingDeadline(appointmentDate: string, windowBusinessDays: number): string {
  return subtractBusinessDays(appointmentDate, windowBusinessDays);
}
