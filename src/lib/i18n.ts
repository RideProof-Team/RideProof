// ---------------------------------------------------------------------------
// i18n.ts — English and Spanish ("i18n" is short for "internationalization":
// i, then 18 letters, then n).
//
// HOW IT WORKS
// The English text itself is the "key". Code writes:
//     t('Ride history')                       -> "Historial de viajes"
//     t('Call {company}', { company: name })  -> "Llamar a Sample Ride Co."
//     tn(count, '{n} ride', '{n} rides')      -> "1 viaje" / "5 viajes"
// When the language is English, t() just fills in the {blanks}. When it's
// Spanish, it looks the English text up in src/i18n/es/ and uses the
// Spanish version. If a Spanish version is missing, English is shown
// (never a blank), and a test (i18n.test.ts) fails so we notice.
//
// Lists of labels that are made once, when the app starts (like the
// pickup choices), are marked with msg('On time'). msg() does nothing by
// itself; it marks the text so the test can check it has a translation,
// and the screen translates it with t() when it's drawn.
//
// Letters, scripts, and summaries can be written in a different language
// from the app (a Spanish-speaking rider may need an English letter):
// withLanguage('en', () => buildComplaintLetter(...)).
// ---------------------------------------------------------------------------
import { Fragment, createElement, useSyncExternalStore, type ReactNode } from 'react';
import { ES } from '../i18n/es';

export type Language = 'en' | 'es';
export const LANGUAGES: Language[] = ['en', 'es'];
/** Each language's name, written in that language (so anyone can find theirs). */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', es: 'Español' };

const KEY = 'rideconnect-language';

/** The saved choice, or the phone's language the first time. */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // No saved choice.
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}

let current: Language = initialLanguage();
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return current;
}

/** Switch the app's language, remember it, and redraw. */
export function setLanguage(language: Language) {
  try {
    localStorage.setItem(KEY, language);
  } catch {
    // Still applies until the app closes.
  }
  applyLanguage(language);
}

/** Change the language without saving it (tests use this too). */
export function applyLanguage(language: Language) {
  current = language;
  // Screen readers use this to pick the right voice and pronunciation.
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  for (const listener of listeners) listener();
}

/** A React hook: the current language, redrawing when it changes. */
export function useLanguage(): Language {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}

/** Run `build` with a different language, then switch back. (For letters in another language.) */
export function withLanguage<T>(language: Language, build: () => T): T {
  const before = current;
  current = language;
  try {
    return build();
  } finally {
    current = before;
  }
}

/** The locale for dates and times: "en-US" or "es-US" (Spanish as used in the United States). */
export function locale(): string {
  return current === 'es' ? 'es-US' : 'en-US';
}

type Vars = Record<string, string | number>;

/** Fill in {blanks}: fill('Hi {name}', { name: 'Rosa' }) -> "Hi Rosa". */
function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** Translate one piece of text (the English text is the key). */
export function t(english: string, vars?: Vars): string {
  const template = current === 'es' ? (ES[english] ?? english) : english;
  return fill(template, vars);
}

/** Translate with "1 ride" / "5 rides". {n} is filled in with the count. */
export function tn(count: number, one: string, many: string, vars?: Vars): string {
  return t(count === 1 ? one : many, { n: count, ...vars });
}

/**
 * Like t(), but a blank can be a piece of the page (bold text, a link), so
 * a sentence stays whole and Spanish can put the words in its own order:
 *   tx('Send it to {who} again.', { who: <strong>{name}</strong> })
 */
export function tx(english: string, parts: Record<string, ReactNode>): ReactNode {
  const template = current === 'es' ? (ES[english] ?? english) : english;
  const pieces = template.split(/\{(\w+)\}/);
  // split() with a (group) gives: text, name, text, name, text...
  return pieces.map((piece, i) => createElement(Fragment, { key: i }, i % 2 === 1 ? (parts[piece] ?? `{${piece}}`) : piece));
}

/** Marks text for translation without translating it yet (see the top of this file). */
export function msg(english: string): string {
  return english;
}
