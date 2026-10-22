// ---------------------------------------------------------------------------
// bookingAttempts.ts — calls to book a ride that didn't work.
//
// "I couldn't get through" or "they had no rides" is itself a problem with
// the ride program, so it's saved as evidence. These records are counted
// by computeStats (reportStats.ts), like rides, so the Report, PDF, and
// letter all show the same numbers.
//
// The ride is NEVER marked as booked here. Only the rider saying "Yes, it's
// booked" does that.
// ---------------------------------------------------------------------------
import type { Appointment, BookingFailReason, FailedBooking } from '../types';
import { formatLongDate } from './dates';

export const FAIL_REASONS: BookingFailReason[] = ['no_answer', 'no_rides', 'too_late', 'other'];

export const FAIL_REASON_LABELS: Record<BookingFailReason, string> = {
  no_answer: "Couldn't get through (busy, on hold too long, or no answer)",
  no_rides: 'No rides available',
  too_late: 'Told it was too late to book',
  other: 'Something else',
};

/** Short words for lists and the PDF. */
export const FAIL_REASON_SHORT: Record<BookingFailReason, string> = {
  no_answer: "couldn't get through",
  no_rides: 'no rides available',
  too_late: 'told it was too late to book',
  other: 'could not book',
};

export function newFailedBooking(
  id: string,
  appointment: Appointment,
  tripDate: string,
  attemptedOn: string,
  reason: BookingFailReason,
  details: string,
  recordedAt: string,
): FailedBooking {
  return {
    id,
    appointmentId: appointment.id,
    tripDate,
    clinicName: appointment.clinicName,
    appointmentType: appointment.type,
    attemptedOn,
    recordedAt,
    reason,
    details: details.trim(),
  };
}

/** Failed attempts whose call happened between two dates (both included), oldest first. */
export function attemptsInRange(attempts: FailedBooking[], from: string, to: string): FailedBooking[] {
  return attempts
    .filter((a) => a.attemptedOn >= from && a.attemptedOn <= to)
    .sort((a, b) => a.attemptedOn.localeCompare(b.attemptedOn) || a.recordedAt.localeCompare(b.recordedAt));
}

/** The failed attempts for one trip, newest first. */
export function attemptsForTrip(attempts: FailedBooking[], appointmentId: string, tripDate: string): FailedBooking[] {
  return attempts
    .filter((a) => a.appointmentId === appointmentId && a.tripDate === tripDate)
    .sort((a, b) => b.attemptedOn.localeCompare(a.attemptedOn) || b.recordedAt.localeCompare(a.recordedAt));
}

/** One line: "Couldn't get through when calling to book the ride for Tuesday, November 3, 2026." */
export function describeAttempt(attempt: FailedBooking): string {
  const what = FAIL_REASON_SHORT[attempt.reason];
  const line = `When I called to book my ride for ${formatLongDate(attempt.tripDate, true)}: ${what}.`;
  return attempt.details ? `${line} Note: "${attempt.details}"` : line;
}
