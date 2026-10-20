// ---------------------------------------------------------------------------
// labels.ts — the plain-language words shown for each stored value.
// Data is stored as short codes (e.g. 'dialysis'); this turns them into
// words people read. Keeping all wording in one place keeps it consistent.
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

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  dialysis: 'Dialysis',
  checkup: 'Checkup',
  specialist: 'Specialist',
  therapy: 'Therapy',
  other: 'Other',
};

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

/** Monday first, the way most people think about a week of appointments. */
export const WEEKDAYS_IN_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** "Your" for a rider, "Rosa's" for a caregiver. */
export function whose(profile: Profile): string {
  return profile.role === 'caregiver' ? `${profile.riderFirstName}'s` : 'Your';
}

// ----- Ride log wording -----

export const PICKUP_LABELS: Record<PickupStatus, string> = {
  on_time: 'On time',
  late: 'Late',
  never_came: 'Never came',
};

export const MINUTES_LATE_LABELS: Record<MinutesLate, string> = {
  15: 'About 15 minutes',
  30: 'About 30 minutes',
  60: 'An hour or more',
};

/** Short form for lists: "15 min", "30 min", "60+ min". */
export const MINUTES_LATE_SHORT: Record<MinutesLate, string> = {
  15: '15 min',
  30: '30 min',
  60: '60+ min',
};

export const OUTCOME_LABELS: Record<AppointmentOutcome, string> = {
  made_it: 'Made it on time',
  late: 'Arrived late',
  missed: 'Missed the appointment',
};

export const RETURN_LABELS: Record<ReturnRideStatus, string> = {
  on_time: 'On time',
  late: 'Late',
  never_came: 'Never came',
  not_needed: 'Not needed',
};
