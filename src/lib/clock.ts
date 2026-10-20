// ---------------------------------------------------------------------------
// clock.ts — answers "what day is today?" for the whole app.
//
// Every screen asks this file instead of calling new Date() itself. That
// way demo mode can pretend "today" is a fixed date (DEMO_TODAY), so the
// pitch video looks the same no matter what day it's recorded.
// ---------------------------------------------------------------------------
import { toDateString } from './dates';
import type { DataMode } from './storage';

/**
 * The pretend "today" in demo mode. It's a Friday, so Rosa has a
 * Mon/Wed/Fri dialysis appointment to check in on.
 */
export const DEMO_TODAY = '2026-10-30';

export function getToday(mode: DataMode): string {
  return mode === 'demo' ? DEMO_TODAY : toDateString(new Date());
}

/** The pretend time of day in demo mode: after Rosa's 9:00 AM dialysis. */
export const DEMO_NOW_TIME = '12:00';

/** The time right now as "HH:MM" (24-hour), for comparing with appointment times. */
export function getNowTime(mode: DataMode): string {
  if (mode === 'demo') return DEMO_NOW_TIME;
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * The exact moment, for a ride log's automatic timestamp. In demo mode
 * we keep the real time of day but use DEMO_TODAY's date, so demo logs
 * don't look like they were saved on a different day.
 */
export function nowTimestamp(mode: DataMode): string {
  const now = new Date();
  if (mode === 'demo') {
    const [year, month, day] = DEMO_TODAY.split('-').map(Number);
    now.setFullYear(year, month - 1, day);
  }
  return now.toISOString();
}
