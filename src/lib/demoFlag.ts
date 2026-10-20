// ---------------------------------------------------------------------------
// demoFlag.ts — remembers whether demo mode is on, so it stays on if the
// page reloads in the middle of recording a video.
//
// This is just one true/false value, so localStorage (a tiny built-in
// key/value store) is simpler than IndexedDB here. Some browsers block
// localStorage (e.g. private windows), so every access is wrapped in
// try/catch: if it fails, the app just starts with demo mode off.
// ---------------------------------------------------------------------------
const KEY = 'rideproof-demo-mode';

export function loadDemoFlag(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveDemoFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    // Not saved — that's okay, demo mode still works until the page reloads.
  }
}
