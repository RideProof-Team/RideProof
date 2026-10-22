// ---------------------------------------------------------------------------
// checkinFlow.ts — the order of questions in the ride check-in.
//
// The check-in asks ONE question per screen, with big buttons:
//   pickup -> how late (only if late) -> appointment outcome -> ride home
//   -> how late was the ride home (only if late) -> notes
// This file decides which question comes next, so the screen itself
// stays simple. It has no screen code, so it's easy to test.
// ---------------------------------------------------------------------------
import type {
  Appointment,
  AppointmentOutcome,
  AppointmentType,
  MinutesLate,
  PickupStatus,
  ReturnRideStatus,
  RideLog,
} from '../types';
import { addDays } from './dates';
import { tripsBetween, type Trip } from './recurrence';

export type Step = 'pickup' | 'howLate' | 'outcome' | 'returnRide' | 'returnHowLate' | 'notes';

/** The answers so far. Questions not answered yet are undefined. */
export interface Answers {
  pickupStatus?: PickupStatus;
  minutesLate?: MinutesLate;
  appointmentOutcome?: AppointmentOutcome;
  returnRideStatus?: ReturnRideStatus;
  returnMinutesLate?: MinutesLate;
  notes: string;
  /** Optional "HH:MM" times for extra evidence. */
  scheduledPickup?: string;
  actualPickup?: string;
  /** Exact minutes measured by the wait timer (not typed by the rider). */
  pickupWaitMinutes?: number;
  returnWaitMinutes?: number;
}

/** Which steps apply, given the answers. "How late?" only appears if that ride was late. */
export function stepsFor(answers: Answers): Step[] {
  const steps: Step[] = ['pickup'];
  if (answers.pickupStatus === 'late') steps.push('howLate');
  steps.push('outcome', 'returnRide');
  if (answers.returnRideStatus === 'late') steps.push('returnHowLate');
  steps.push('notes');
  return steps;
}

export function nextStep(current: Step, answers: Answers): Step | 'done' {
  const steps = stepsFor(answers);
  const index = steps.indexOf(current);
  return index + 1 < steps.length ? steps[index + 1] : 'done';
}

export function previousStep(current: Step, answers: Answers): Step | null {
  const steps = stepsFor(answers);
  const index = steps.indexOf(current);
  return index > 0 ? steps[index - 1] : null;
}

/** Turn a saved log back into answers, so an old check-in can be edited. */
export function answersFromLog(log: RideLog): Answers {
  return {
    pickupStatus: log.pickupStatus,
    minutesLate: log.minutesLate ?? undefined,
    appointmentOutcome: log.appointmentOutcome,
    returnRideStatus: log.returnRideStatus,
    ...(log.returnMinutesLate ? { returnMinutesLate: log.returnMinutesLate } : {}),
    notes: log.notes,
    // Only include times that were actually saved, so an untouched edit
    // counts as "no changes".
    ...(log.scheduledPickup ? { scheduledPickup: log.scheduledPickup } : {}),
    ...(log.actualPickup ? { actualPickup: log.actualPickup } : {}),
    ...(log.pickupWaitMinutes !== undefined ? { pickupWaitMinutes: log.pickupWaitMinutes } : {}),
    ...(log.returnWaitMinutes !== undefined ? { returnWaitMinutes: log.returnWaitMinutes } : {}),
  };
}

interface LogDetails {
  id: string;
  appointmentId: string;
  clinicName: string;
  appointmentType: AppointmentType;
  rideDate: string;
  recordedAt: string;
}

/** Combine the answers with trip details into a RideLog ready to save. */
export function buildRideLog(answers: Answers, details: LogDetails): RideLog {
  if (!answers.pickupStatus || !answers.appointmentOutcome || !answers.returnRideStatus) {
    throw new Error('Check-in is not finished');
  }
  const isLate = answers.pickupStatus === 'late';
  return {
    ...details,
    pickupStatus: answers.pickupStatus,
    // If someone picked "Late", then went back and picked "On time",
    // throw away the old "how late" answer.
    minutesLate: isLate ? answers.minutesLate ?? null : null,
    appointmentOutcome: answers.appointmentOutcome,
    returnRideStatus: answers.returnRideStatus,
    // Same idea as minutesLate: only kept if the ride home was late.
    returnMinutesLate: answers.returnRideStatus === 'late' ? answers.returnMinutesLate ?? null : null,
    notes: answers.notes.trim(),
    scheduledPickup: answers.scheduledPickup || undefined,
    // There's no "driver came at" time if the driver never came.
    actualPickup: answers.pickupStatus === 'never_came' ? undefined : answers.actualPickup || undefined,
    // Timer minutes only make sense if the ride was late or never came. If
    // the rider changed the answer to "on time", drop them.
    ...(answers.pickupWaitMinutes !== undefined && answers.pickupStatus !== 'on_time'
      ? { pickupWaitMinutes: answers.pickupWaitMinutes }
      : {}),
    ...(answers.returnWaitMinutes !== undefined && (answers.returnRideStatus === 'late' || answers.returnRideStatus === 'never_came')
      ? { returnWaitMinutes: answers.returnWaitMinutes }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Finding which trips have been checked in on.
// ---------------------------------------------------------------------------

/** The log for one trip (appointment + date), if there is one. */
export function findLog(logs: RideLog[], appointmentId: string, date: string): RideLog | undefined {
  return logs.find((log) => log.appointmentId === appointmentId && log.rideDate === date);
}

/** How many days back we remind people about trips they haven't logged. */
export const CHECKIN_LOOKBACK_DAYS = 14;

/** Trips from the last two weeks (including today) with no check-in yet, newest first. */
export function tripsNeedingCheckIn(appointments: Appointment[], logs: RideLog[], today: string): Trip[] {
  return tripsBetween(appointments, addDays(today, -CHECKIN_LOOKBACK_DAYS), today)
    .filter((trip) => !findLog(logs, trip.appointment.id, trip.date))
    .reverse();
}
