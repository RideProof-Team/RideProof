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
