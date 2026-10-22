// ---------------------------------------------------------------------------
// timeLost.ts — "How much time did late and missing rides cost?"
//
// For each ride we add up the waiting:
//   - a late pickup:    its minutes late
//   - a late ride home: its minutes late
//   - a ride (pickup or home) that NEVER came: only if the "Where's my
//     ride?" timer measured the wait. Otherwise we don't guess a number;
//     we count those rides separately and say so.
//
// Where the minutes come from, best first:
//   1. An exact time measured by the timer.
//   2. The check-in answer: "about 15", "about 30", or "an hour or more".
//      "An hour or more" counts as 60, so the total becomes "at least".
//
// The wording functions at the bottom are shared by the Report screen, the
// PDF, and the complaint letter, so all three always say the same thing.
// They write in the app's language (or the one set with withLanguage()).
// ---------------------------------------------------------------------------
import type { MinutesLate, RideLog } from '../types';
import { t, tn } from './i18n';

/** How sure we are about a total: measured exactly, roughly, or a minimum. */
export type WaitPrecision = 'exact' | 'about' | 'at_least';

export interface RideWait {
  minutes: number;
  /** Used "about 15/30" answers. */
  usedEstimate: boolean;
  /** Used an "an hour or more" answer (counted as 60). */
  usedMinimum: boolean;
  /** Rides that never came, with no measured wait. */
  untimedNeverCame: number;
  /** Late rides home saved before the "how late" question existed. */
  untimedLate: number;
}

function addLate(wait: RideWait, exact: number | undefined, bucket: MinutesLate | null | undefined) {
  if (exact !== undefined) wait.minutes += exact;
  else if (bucket) {
    wait.minutes += bucket;
    if (bucket === 60) wait.usedMinimum = true;
    else wait.usedEstimate = true;
  } else wait.untimedLate += 1;
}

function addNeverCame(wait: RideWait, exact: number | undefined) {
  if (exact !== undefined) wait.minutes += exact;
  else wait.untimedNeverCame += 1;
}

/** The waiting on one ride (pickup and ride home together). */
export function rideWait(log: RideLog): RideWait {
  const wait: RideWait = { minutes: 0, usedEstimate: false, usedMinimum: false, untimedNeverCame: 0, untimedLate: 0 };
  if (log.pickupStatus === 'late') addLate(wait, log.pickupWaitMinutes, log.minutesLate);
  if (log.pickupStatus === 'never_came') addNeverCame(wait, log.pickupWaitMinutes);
  if (log.returnRideStatus === 'late') addLate(wait, log.returnWaitMinutes, log.returnMinutesLate);
  if (log.returnRideStatus === 'never_came') addNeverCame(wait, log.returnWaitMinutes);
  return wait;
}

/** Adds up many rides. computeStats uses this. */
export function totalWait(logs: RideLog[]) {
  let minutes = 0;
  let usedEstimate = false;
  let usedMinimum = false;
  let untimedNeverCame = 0;
  let untimedLate = 0;
  for (const log of logs) {
    const w = rideWait(log);
    minutes += w.minutes;
    usedEstimate ||= w.usedEstimate;
    usedMinimum ||= w.usedMinimum;
    untimedNeverCame += w.untimedNeverCame;
    untimedLate += w.untimedLate;
  }
  const precision: WaitPrecision = usedMinimum ? 'at_least' : usedEstimate ? 'about' : 'exact';
  return { waitMinutes: minutes, waitPrecision: precision, untimedNeverCame, untimedLate };
}

// ---------------------------------------------------------------------------
// Wording
// ---------------------------------------------------------------------------

/** 375 -> "6 hours 15 minutes" ("6 horas y 15 minutos"), 60 -> "1 hour", 1 -> "1 minute". */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourText = tn(hours, '{n} hour', '{n} hours');
  const minuteText = tn(minutes, '{n} minute', '{n} minutes');
  if (hours === 0) return minuteText;
  if (minutes === 0) return hourText;
  return t('{hours} {minutes}', { hours: hourText, minutes: minuteText });
}

/** "at least 6 hours 15 minutes" / "about 45 minutes" / "2 hours". */
export function durationWithPrecision(minutes: number, precision: WaitPrecision): string {
  const duration = formatDuration(minutes);
  if (precision === 'at_least') return t('at least {duration}', { duration });
  if (precision === 'about') return t('about {duration}', { duration });
  return duration;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The parts of the stats the wording needs. */
export interface WaitStats {
  waitMinutes: number;
  waitPrecision: WaitPrecision;
  untimedNeverCame: number;
  untimedLate: number;
}

/** Report headline: "At least 6 hours 15 minutes spent waiting" ('' if none). */
export function timeLostHeadline(stats: WaitStats): string {
  if (stats.waitMinutes === 0) return '';
  return capitalize(t('{duration} spent waiting', { duration: durationWithPrecision(stats.waitMinutes, stats.waitPrecision) }));
}

/** What's left out, e.g. "Not counted: 2 times a ride never came (no wait time was recorded)." */
export function timeLostNotCounted(stats: WaitStats): string {
  const parts: string[] = [];
  if (stats.untimedNeverCame > 0) {
    parts.push(tn(stats.untimedNeverCame, '{n} time a ride never came', '{n} times a ride never came'));
  }
  if (stats.untimedLate > 0) {
    parts.push(tn(stats.untimedLate, '{n} late ride home with no time recorded', '{n} late rides home with no time recorded'));
  }
  if (parts.length === 0) return '';
  const items = parts.length === 2 ? t('{first} and {second}', { first: parts[0], second: parts[1] }) : parts[0];
  return stats.untimedNeverCame > 0
    ? t('Not counted: {items} (no wait time was recorded).', { items })
    : t('Not counted: {items}.', { items });
}

/** A sentence for the complaint letter ('' if there's nothing to say). */
export function timeLostLetterSentence(stats: WaitStats): string {
  if (stats.waitMinutes === 0) return '';
  const duration = durationWithPrecision(stats.waitMinutes, stats.waitPrecision);
  if (stats.untimedNeverCame === 0) return t('In total, I spent {duration} waiting for late rides.', { duration });
  return tn(
    stats.untimedNeverCame,
    'In total, I spent {duration} waiting for late rides, not counting the time a ride never came at all.',
    'In total, I spent {duration} waiting for late rides, not counting the {n} times a ride never came at all.',
    { duration },
  );
}
