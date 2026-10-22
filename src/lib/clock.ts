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

// ---------------------------------------------------------------------------
// The exact moment "now", used by the "Where's my ride?" wait timers.
//
// Real mode: the real clock.
// Demo mode: a SIMULATED clock. It starts at noon on DEMO_TODAY when the
// demo is set up, then runs forward in real time, so the timer visibly
// ticks. "Jump ahead 15 minutes" (Demo controls) moves it forward, so a
// pitch video can show what happens at 15 and 30 minutes late without
// waiting. The clock's starting point is saved, so it survives reloads.
// ---------------------------------------------------------------------------
const DEMO_CLOCK_KEY = 'rideproof-demo-clock';

interface DemoClock {
  /** The real moment (milliseconds) the simulated clock was set to noon. */
  anchorMs: number;
  /** Extra minutes added by "Jump ahead". */
  jumpMinutes: number;
}

/** Noon on DEMO_TODAY, local time. */
function demoStartMs(): number {
  const [year, month, day] = DEMO_TODAY.split('-').map(Number);
  const [hours, minutes] = DEMO_NOW_TIME.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).getTime();
}

function loadDemoClock(): DemoClock {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_CLOCK_KEY) ?? 'null');
    if (saved && typeof saved.anchorMs === 'number' && typeof saved.jumpMinutes === 'number') return saved;
  } catch {
    // fall through and start a new clock
  }
  return resetDemoClock();
}

function saveDemoClock(clock: DemoClock) {
  try {
    localStorage.setItem(DEMO_CLOCK_KEY, JSON.stringify(clock));
  } catch {
    // The demo clock just won't survive a reload.
  }
}

/** Set the simulated demo clock back to noon (used when the demo is set up or reset). */
export function resetDemoClock(): DemoClock {
  const clock = { anchorMs: Date.now(), jumpMinutes: 0 };
  saveDemoClock(clock);
  return clock;
}

/** "Jump ahead 15 minutes" in Demo controls. */
export function jumpDemoClock(minutes: number) {
  const clock = loadDemoClock();
  saveDemoClock({ ...clock, jumpMinutes: clock.jumpMinutes + minutes });
}

export function nowMoment(mode: DataMode): Date {
  if (mode === 'real') return new Date();
  const clock = loadDemoClock();
  return new Date(demoStartMs() + (Date.now() - clock.anchorMs) + clock.jumpMinutes * 60_000);
}
