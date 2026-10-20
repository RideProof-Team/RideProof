// ---------------------------------------------------------------------------
// theme.ts — Light / Dark / Automatic appearance.
// The choice is saved in localStorage and applied as data-theme="..." on
// the <html> tag; styles.css does the rest. "auto" removes the attribute
// so the phone's own light/dark setting decides.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';

export type ThemeChoice = 'auto' | 'light' | 'dark';
const KEY = 'rideproof-theme';
const EVENT = 'rideproof-theme-change';

export function loadTheme(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

export function applyTheme(choice: ThemeChoice) {
  if (choice === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
  window.dispatchEvent(new Event(EVENT));
}

export function saveTheme(choice: ThemeChoice) {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // The choice still applies until the app is closed.
  }
  applyTheme(choice);
}

/** Is dark mode showing right now (by choice or by the phone's setting)? */
export function isDark(): boolean {
  const choice = document.documentElement.dataset.theme;
  if (choice) return choice === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** A hook that redraws a component when light/dark changes (used by the chart). */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const update = () => setDark(isDark());
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener('change', update);
    window.addEventListener(EVENT, update);
    return () => {
      media?.removeEventListener('change', update);
      window.removeEventListener(EVENT, update);
    };
  }, []);
  return dark;
}

/** Read a color from styles.css, e.g. cssColor('--color-text'). */
export function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
