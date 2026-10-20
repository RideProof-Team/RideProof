// ---------------------------------------------------------------------------
// onboarding.ts — remembers progress through the "Getting started" list
// shown on Home for new users. Stored in localStorage (just two flags);
// if it can't be saved, the worst case is the list shows again.
// ---------------------------------------------------------------------------
const HIDDEN_KEY = 'rideproof-intro-hidden';
const REPORT_SEEN_KEY = 'rideproof-report-viewed';

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'yes';
  } catch {
    return false;
  }
}

function write(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, 'yes');
    else localStorage.removeItem(key);
  } catch {
    // Not important enough to bother the user about.
  }
}

export const introHidden = () => read(HIDDEN_KEY);
export const hideIntro = () => write(HIDDEN_KEY, true);
export const reportViewed = () => read(REPORT_SEEN_KEY);
export const markReportViewed = () => write(REPORT_SEEN_KEY, true);

/** Start over (used by "Delete all my data"). */
export function resetOnboarding() {
  write(HIDDEN_KEY, false);
  write(REPORT_SEEN_KEY, false);
}
