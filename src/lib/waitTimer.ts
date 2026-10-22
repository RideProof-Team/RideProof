// ---------------------------------------------------------------------------
// waitTimer.ts — the math behind "Where's my ride?".
//
// Nothing here counts seconds. Everything is worked out from the saved
// START moment and the current moment ("now"), so it's always right, even
// after the app was closed for an hour:
//
//     elapsed = now − startedAt
//
// "Minutes late":
//   - Ride TO the appointment: minutes past the scheduled pickup time.
//     (Waiting before the pickup time isn't "late".)
//   - Ride HOME: minutes since the rider started waiting.
// ---------------------------------------------------------------------------
import type { ActiveWait, Appointment, MinutesLate, WaitLeg } from '../types';
import { t } from './i18n';

/** Show the "I'm waiting for my ride" button from this long before pickup. */
export const WAIT_BUTTON_LEAD_MINUTES = 15;
/** Gentle "call the ride company" prompts at these minutes late. */
export const PROMPT_MINUTES = [15, 30] as const;
/** "My ride never came" becomes available at this many minutes late. */
export const NEVER_CAME_AFTER_MINUTES = 30;
/** Up to this many minutes late still counts as "on time". */
export const ON_TIME_GRACE_MINUTES = 5;
/** If no pickup time was entered, assume this long before the appointment. */
export const ESTIMATED_PICKUP_LEAD_MINUTES = 60;

/** "09:00" -> 540 minutes after midnight. */
export function minutesOfDay(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 480 -> "08:00" (wraps around midnight). */
export function timeFromMinutes(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** The pickup time for a trip: the one entered, or 1 hour before the appointment. */
export function pickupTimeFor(appointment: Appointment): { time: string; isEstimate: boolean } {
  if (appointment.pickupTime) return { time: appointment.pickupTime, isEstimate: false };
  return { time: timeFromMinutes(minutesOfDay(appointment.time) - ESTIMATED_PICKUP_LEAD_MINUTES), isEstimate: true };
}

/** The exact moment a "YYYY-MM-DD" date + "HH:MM" time happens (local time). */
export function momentOf(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/** The id used for a trip leg's timer. */
export function waitId(appointmentId: string, tripDate: string, leg: WaitLeg): string {
  return `${appointmentId}|${tripDate}|${leg}`;
}

/** Start a new timer at `now`. */
export function startWait(appointment: Appointment, tripDate: string, leg: WaitLeg, now: Date): ActiveWait {
  const pickup = pickupTimeFor(appointment);
  return {
    id: waitId(appointment.id, tripDate, leg),
    appointmentId: appointment.id,
    tripDate,
    leg,
    scheduledTime: leg === 'pickup' ? pickup.time : null,
    scheduledIsEstimate: leg === 'pickup' ? pickup.isEstimate : false,
    startedAt: now.toISOString(),
    promptsShown: [],
  };
}

/** Whole seconds since the timer started (never negative). */
export function elapsedSeconds(wait: ActiveWait, now: Date): number {
  const end = wait.finishedAt ? new Date(wait.finishedAt) : now;
  return Math.max(0, Math.floor((end.getTime() - new Date(wait.startedAt).getTime()) / 1000));
}

/** Whole minutes late right now (or when the wait ended). */
export function minutesLateNow(wait: ActiveWait, now: Date): number {
  const end = wait.finishedAt ? new Date(wait.finishedAt) : now;
  const lateFrom = wait.leg === 'pickup' && wait.scheduledTime
    ? momentOf(wait.tripDate, wait.scheduledTime).getTime()
    : new Date(wait.startedAt).getTime();
  return Math.max(0, Math.floor((end.getTime() - lateFrom) / 60_000));
}

/** Minutes until the scheduled pickup (0 once it's passed). */
export function minutesUntilPickup(wait: ActiveWait, now: Date): number {
  if (wait.leg !== 'pickup' || !wait.scheduledTime) return 0;
  return Math.max(0, Math.ceil((momentOf(wait.tripDate, wait.scheduledTime).getTime() - now.getTime()) / 60_000));
}

/** The next "call the ride company" prompt that is due and not yet shown, if any. */
export function duePrompt(wait: ActiveWait, now: Date): number | null {
  if (wait.finishedAt) return null;
  const late = minutesLateNow(wait, now);
  // The biggest threshold passed that hasn't been shown (so reopening the app
  // at 40 minutes late shows the 30-minute prompt, not an old 15-minute one).
  const due = [...PROMPT_MINUTES].reverse().find((m) => late >= m);
  return due !== undefined && !wait.promptsShown.includes(due) ? due : null;
}

/** Mark prompts up to `minutes` as shown. */
export function markPromptShown(wait: ActiveWait, minutes: number): ActiveWait {
  const shown = PROMPT_MINUTES.filter((m) => m <= minutes || wait.promptsShown.includes(m));
  return { ...wait, promptsShown: shown };
}

export function canMarkNeverCame(wait: ActiveWait, now: Date): boolean {
  return minutesLateNow(wait, now) >= NEVER_CAME_AFTER_MINUTES;
}

/** End the timer: the ride came, or the rider gave up waiting. */
export function finishWait(wait: ActiveWait, result: 'arrived' | 'never_came', now: Date): ActiveWait {
  return { ...wait, finishedAt: now.toISOString(), result, finalMinutesLate: minutesLateNow(wait, now) };
}

/** 754 seconds -> "12:34"; 3909 -> "1:05:09". */
export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** Exact minutes -> the closest check-in answer (15 / 30 / an hour or more). */
export function bucketFor(minutes: number): MinutesLate {
  if (minutes < 23) return 15;
  if (minutes < 45) return 30;
  return 60;
}

/** The "HH:MM" the wait ended (used as "the driver came at"). */
function clockTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** What a finished timer tells the check-in. */
export interface WaitPrefill {
  pickupStatus?: 'on_time' | 'late' | 'never_came';
  minutesLate?: MinutesLate;
  pickupWaitMinutes?: number;
  scheduledPickup?: string;
  actualPickup?: string;
  returnRideStatus?: 'on_time' | 'late' | 'never_came';
  returnMinutesLate?: MinutesLate;
  returnWaitMinutes?: number;
}

/** Turn finished timers for one trip into check-in answers (the rider can still change them). */
export function prefillFromWaits(waits: ActiveWait[]): WaitPrefill {
  const prefill: WaitPrefill = {};
  for (const wait of waits) {
    if (!wait.finishedAt || wait.finalMinutesLate === undefined) continue;
    const late = wait.finalMinutesLate;
    const status = wait.result === 'never_came' ? 'never_came' : late <= ON_TIME_GRACE_MINUTES ? 'on_time' : 'late';
    if (wait.leg === 'pickup') {
      prefill.pickupStatus = status;
      if (status === 'late') prefill.minutesLate = bucketFor(late);
      if (status !== 'on_time') prefill.pickupWaitMinutes = late;
      if (wait.scheduledTime && !wait.scheduledIsEstimate) prefill.scheduledPickup = wait.scheduledTime;
      if (wait.result === 'arrived') prefill.actualPickup = clockTime(wait.finishedAt);
    } else {
      prefill.returnRideStatus = status;
      if (status === 'late') prefill.returnMinutesLate = bucketFor(late);
      if (status !== 'on_time') prefill.returnWaitMinutes = late;
    }
  }
  return prefill;
}

/** The gentle "call the ride company" prompt, for the screen and for notifications (in the app's language). */
export function promptText(wait: ActiveWait, minutes: number, rideCompanyName: string): { title: string; body: string } {
  const isHome = wait.leg === 'return';
  const title = isHome
    ? t("You've waited {minutes} minutes for your ride home", { minutes })
    : t('Your ride is {minutes} minutes late', { minutes });
  const body =
    minutes >= NEVER_CAME_AFTER_MINUTES
      ? t('Call {company} now. If the ride doesn\'t come, you can tap "My ride never came" to record it.', { company: rideCompanyName })
      : t('You may want to call {company} and ask where the driver is. Write down who you talk to.', { company: rideCompanyName });
  return { title, body };
}
