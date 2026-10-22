// ---------------------------------------------------------------------------
// motion.ts — the "Animations: On / Off" setting.
//
// Animations make the app feel alive, but they can cause dizziness or
// nausea for some people (vestibular disorders, migraines). So:
//   - If the phone is set to "reduce motion", animations are off. Always.
//   - Anyone can also turn them off inside RideConnect (Settings).
// The choice is saved in localStorage and applied as data-motion="off" on
// the <html> tag; motion.css only animates when that isn't set.
// ---------------------------------------------------------------------------

export type MotionChoice = 'on' | 'off';
const KEY = 'rideproof-motion';

export function loadMotion(): MotionChoice {
  try {
    return localStorage.getItem(KEY) === 'off' ? 'off' : 'on';
  } catch {
    return 'on';
  }
}

export function applyMotion(choice: MotionChoice) {
  if (choice === 'off') document.documentElement.dataset.motion = 'off';
  else delete document.documentElement.dataset.motion;
}

export function saveMotion(choice: MotionChoice) {
  try {
    if (choice === 'off') localStorage.setItem(KEY, 'off');
    else localStorage.removeItem(KEY);
  } catch {
    // Still applies until the app is closed.
  }
  applyMotion(choice);
}

/** Does the phone itself ask for less motion? */
export function systemReducesMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Should animations run right now? Used by animations done in code (the
 * counting numbers and the chart), which CSS rules can't switch off.
 */
export function motionAllowed(): boolean {
  return !systemReducesMotion() && document.documentElement.dataset.motion !== 'off';
}
