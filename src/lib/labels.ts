// ---------------------------------------------------------------------------
// labels.ts — the plain-language words shown for each stored value.
// Data is stored as short codes (e.g. 'dialysis'); this turns them into
// words people read. Keeping all wording in one place keeps it consistent.
//
// The words are English, marked with msg() so they get Spanish too. Show
// them with t(), e.g. t(PICKUP_LABELS[log.pickupStatus]).
// ---------------------------------------------------------------------------
import type {
  AppointmentOutcome,
  AppointmentType,
  MinutesLate,
  PickupStatus,
  Profile,
  ReturnRideStatus,
  Weekday,
} from '../types';
import { msg } from './i18n';

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  dialysis: msg('Dialysis'),
  checkup: msg('Checkup'),
  specialist: msg('Specialist'),
  therapy: msg('Therapy'),
  other: msg('Other'),
};

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: msg('Sunday'),
  1: msg('Monday'),
  2: msg('Tuesday'),
  3: msg('Wednesday'),
  4: msg('Thursday'),
  5: msg('Friday'),
  6: msg('Saturday'),
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: msg('Sun'),
  1: msg('Mon'),
  2: msg('Tue'),
  3: msg('Wed'),
  4: msg('Thu'),
  5: msg('Fri'),
  6: msg('Sat'),
};

/** Monday first, the way most people think about a week of appointments. */
export const WEEKDAYS_IN_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/**
 * "Your" for a rider, "Rosa's" for a caregiver. English only: Spanish puts
 * the owner after the noun ("su cita" / "la cita de Rosa"), so screens use a
 * whole-sentence key for each role instead of this word.
 */
export function whose(profile: Profile): string {
  return profile.role === 'caregiver' ? `${profile.riderFirstName}'s` : 'Your';
}

// ----- Ride log wording -----

export const PICKUP_LABELS: Record<PickupStatus, string> = {
  on_time: msg('On time'),
  late: msg('Late'),
  never_came: msg('Never came'),
};

export const MINUTES_LATE_LABELS: Record<MinutesLate, string> = {
  15: msg('About 15 minutes'),
  30: msg('About 30 minutes'),
  60: msg('An hour or more'),
};

/** Short form for lists: "15 min", "30 min", "60+ min". */
export const MINUTES_LATE_SHORT: Record<MinutesLate, string> = {
  15: msg('15 min'),
  30: msg('30 min'),
  60: msg('60+ min'),
};

export const OUTCOME_LABELS: Record<AppointmentOutcome, string> = {
  made_it: msg('Made it on time'),
  late: msg('Arrived late'),
  missed: msg('Missed the appointment'),
};

export const RETURN_LABELS: Record<ReturnRideStatus, string> = {
  on_time: msg('On time'),
  late: msg('Late'),
  never_came: msg('Never came'),
  not_needed: msg('Not needed'),
};
