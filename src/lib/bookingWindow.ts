// ---------------------------------------------------------------------------
// bookingWindow.ts — "How many business days ahead must a ride be booked?"
//
// The answer can come from two places, checked in this order:
//   1. The rider's own number (entered in Settings or setup). If they typed
//      one in, we trust it: they know their ride company's rule.
//   2. The state's rule from stateRules.json (only 3 states have one so far).
//   3. Neither: we don't know, so no booking reminders are shown (rather
//      than guessing a deadline and being wrong).
// ---------------------------------------------------------------------------
import type { Profile, RiderBookingWindow } from '../types';
import type { StateRule } from './stateRules';

export const MIN_BOOKING_DAYS = 1;
export const MAX_BOOKING_DAYS = 14;

export type BookingWindowSource = 'rider' | 'state' | 'none';

export interface EffectiveBookingWindow {
  /** Business days to use for reminders, or null if unknown. */
  days: number | null;
  /** Where that number came from. */
  source: BookingWindowSource;
  /** The state's own rule, if there is one (shown even when overridden). */
  stateDays: number | null;
}

/** True for a whole number from 1 to 14. */
export function isValidBookingDays(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= MIN_BOOKING_DAYS && (value as number) <= MAX_BOOKING_DAYS;
}

/** True for anything the profile is allowed to store. */
export function isValidRiderBookingWindow(value: unknown): value is RiderBookingWindow {
  return value === 'not_sure' || isValidBookingDays(value);
}

export function effectiveBookingWindow(profile: Profile, stateRule: StateRule | undefined): EffectiveBookingWindow {
  const stateDays = stateRule ? stateRule.bookingWindowBusinessDays : null;
  const riderDays = profile.riderBookingWindow;
  if (isValidBookingDays(riderDays)) return { days: riderDays, source: 'rider', stateDays };
  if (stateDays !== null) return { days: stateDays, source: 'state', stateDays };
  return { days: null, source: 'none', stateDays };
}

/** "1 business day" / "5 business days". */
export function businessDaysText(days: number): string {
  return `${days} business ${days === 1 ? 'day' : 'days'}`;
}
