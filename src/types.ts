// ---------------------------------------------------------------------------
// types.ts — the "shape" of every piece of data RideConnect stores.
//
// TypeScript types don't run; they are a contract. If any part of the app
// tries to save an appointment without a date, or uses a pickup status that
// isn't on the list, TypeScript reports an error before the app even runs.
// ---------------------------------------------------------------------------

/** Who is using the app: the rider themself, or someone helping them. */
export type Role = 'rider' | 'caregiver';

/** Information about the rider. There is only ever one profile. */
export interface Profile {
  role: Role;
  /** The rider's first name (even in caregiver mode, this is the rider). */
  riderFirstName: string;
  /** Caregiver mode only, optional: the helper's own first name. */
  caregiverName: string;
  /** Two-letter state code, e.g. "WA". Must match a key in stateRules.json. */
  state: string;
  rideCompanyName: string;
  rideCompanyPhone: string;
  /** Optional, so it can be an empty string. */
  healthPlanName: string;
  /**
   * The rider's own answer to "How many business days ahead does your ride
   * company require you to book?" — a number from 1 to 14, or 'not_sure'.
   * Missing (undefined) means they haven't answered. Optional, because
   * profiles saved by older versions of the app don't have it.
   */
  riderBookingWindow?: RiderBookingWindow;
}

/** 1–14 business days, or "Not sure". */
export type RiderBookingWindow = number | 'not_sure';

export type AppointmentType = 'dialysis' | 'checkup' | 'specialist' | 'therapy' | 'other';

/** Days of the week, numbered like JavaScript's Date.getDay(): 0 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * How an appointment repeats.
 * - { kind: 'none' }: it happens once, on its date.
 * - { kind: 'weekly', weekdays: [1, 3, 5] }: every Mon/Wed/Fri, starting on its date.
 */
export type RecurrenceRule = { kind: 'none' } | { kind: 'weekly'; weekdays: Weekday[] };

export interface Appointment {
  id: string;
  /** "YYYY-MM-DD". For recurring appointments, this is the first day. */
  date: string;
  /** "HH:MM" in 24-hour time, e.g. "09:00". */
  time: string;
  clinicName: string;
  clinicAddress: string;
  /** Optional: the clinic's phone number, for tap-to-call. */
  clinicPhone?: string;
  type: AppointmentType;
  recurrence: RecurrenceRule;
  rideBooked: boolean;
  confirmationNumber: string;
  /**
   * Days this appointment is NOT happening (e.g. dialysis cancelled for a
   * holiday), as "YYYY-MM-DD". Optional, because appointments saved by
   * older versions of RideConnect don't have it.
   */
  skippedDates?: string[];
}

export type PickupStatus = 'on_time' | 'late' | 'never_came';
export type MinutesLate = 15 | 30 | 60;  // 60 means "60 or more"
export type AppointmentOutcome = 'made_it' | 'late' | 'missed';
export type ReturnRideStatus = 'on_time' | 'late' | 'never_came' | 'not_needed';

/** What happened on one ride. Created by the check-in flow. */
export interface RideLog {
  id: string;
  appointmentId: string;
  /**
   * Copied from the appointment when the log is saved, so History and
   * reports still make sense if the appointment is edited or deleted later.
   */
  clinicName: string;
  appointmentType: AppointmentType;
  /**
   * "YYYY-MM-DD" of the trip. Needed because one recurring appointment
   * produces many trips, so the appointment id alone isn't enough.
   */
  rideDate: string;
  pickupStatus: PickupStatus;
  /** Only filled in when pickupStatus is 'late'. */
  minutesLate: MinutesLate | null;
  appointmentOutcome: AppointmentOutcome;
  returnRideStatus: ReturnRideStatus;
  notes: string;
  /** Exact moment the log was saved (ISO format). Filled in automatically. */
  recordedAt: string;
  /** Optional evidence: when pickup was scheduled, and when the driver came ("HH:MM"). */
  scheduledPickup?: string;
  actualPickup?: string;
}
