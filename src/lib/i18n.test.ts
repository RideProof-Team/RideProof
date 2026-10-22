// Tests for English/Spanish. Run with: npm test
//
// The most important test here reads EVERY source file, finds every
// t('...'), tn(n, '...', '...') and msg('...'), and checks that each one
// has a Spanish translation with the same {blanks}. So if anyone adds a
// new message and forgets the Spanish, this test fails and says which one.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ES, ES_PARTS } from '../i18n/es';
import { capitalize, formatLongDate, formatMonthYear, formatShortDate, formatTime } from './dates';
import { applyLanguage, getLanguage, t, tn, tx, withLanguage } from './i18n';

afterEach(() => applyLanguage('en'));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'i18n' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

// One quoted string: '...', "...", or `...` (without ${...}).
const STRING = String.raw`('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\x60(?:\\.|[^\x60\\$])*\x60)`;
const T_CALL = new RegExp(String.raw`(?<![\w.])(?:t|tx|msg)\(\s*${STRING}`, 'g');
const TN_CALL = new RegExp(String.raw`(?<![\w.])tn\([^,]+,\s*${STRING}\s*,\s*${STRING}`, 'g');

/** Turn the quoted source text into the real string ('It\'s' -> It's). */
function unquote(quoted: string): string {
  return quoted.slice(1, -1).replace(/\\(['"\x60\\])/g, '$1').replace(/\\n/g, '\n');
}

function keysInCode(): Map<string, string> {
  const keys = new Map<string, string>(); // key -> file it came from
  for (const file of sourceFiles(join(__dirname, '..'))) {
    // Skip comment lines (they show examples like t('Ride history')).
    const code = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');
    for (const m of code.matchAll(T_CALL)) keys.set(unquote(m[1]), file);
    for (const m of code.matchAll(TN_CALL)) {
      keys.set(unquote(m[1]), file);
      keys.set(unquote(m[2]), file);
    }
  }
  return keys;
}

const blanks = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('every message has a Spanish translation', () => {
  const keys = keysInCode();

  it('finds the messages in the code', () => {
    expect(keys.size).toBeGreaterThan(0);
  });

  it('has Spanish for every t(), tn(), and msg() in the code', () => {
    const missing = [...keys].filter(([key]) => !(key in ES)).map(([key, file]) => `${file.split('src/')[1]}: ${JSON.stringify(key)}`);
    expect(missing).toEqual([]);
  });

  it('keeps the same {blanks} in Spanish', () => {
    const wrong = [...keys.keys()].filter((key) => key in ES && blanks(key).join() !== blanks(ES[key]).join());
    expect(wrong).toEqual([]);
  });

  it('has no leftover Spanish for messages that no longer exist', () => {
    const unused = Object.keys(ES).filter((key) => !keys.has(key));
    expect(unused).toEqual([]);
  });

  it('never has two different Spanish versions of the same message', () => {
    const seen = new Map<string, { part: string; spanish: string }>();
    const conflicts: string[] = [];
    for (const [part, dict] of Object.entries(ES_PARTS)) {
      for (const [key, spanish] of Object.entries(dict)) {
        const before = seen.get(key);
        if (before && before.spanish !== spanish) conflicts.push(`${JSON.stringify(key)} (${before.part} vs ${part})`);
        seen.set(key, { part, spanish });
      }
    }
    expect(conflicts).toEqual([]);
  });
});

describe('t(), tn(), and withLanguage()', () => {
  it('fills in blanks, in English by default', () => {
    expect(getLanguage()).toBe('en');
    expect(t('Not a real message, {name}', { name: 'Rosa' })).toBe('Not a real message, Rosa');
    expect(tn(1, '{n} thing', '{n} things')).toBe('1 thing');
    expect(tn(3, '{n} thing', '{n} things')).toBe('3 things');
  });

  it('falls back to English (never blank) if a Spanish version is missing', () => {
    applyLanguage('es');
    expect(t('Not a real message')).toBe('Not a real message');
  });

  it('withLanguage switches only for that one job', () => {
    applyLanguage('es');
    expect(withLanguage('en', () => formatLongDate('2026-10-30', true))).toBe('Friday, October 30, 2026');
    expect(formatLongDate('2026-10-30', true)).toBe('viernes, 30 de octubre de 2026');
    expect(getLanguage()).toBe('es');
  });

  it('tx() keeps pieces of the page inside a translated sentence', () => {
    const parts = tx('Hello {who}!', { who: 'Rosa' }) as { props: { children: unknown } }[];
    expect(parts.map((p) => p.props.children)).toEqual(['Hello ', 'Rosa', '!']);
  });

  it('sets the page language for screen readers', () => {
    applyLanguage('es');
    expect(document.documentElement.lang).toBe('es');
    applyLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('dates and times in Spanish', () => {
  it('writes dates and times the Spanish way', () => {
    applyLanguage('es');
    expect(formatLongDate('2026-10-30')).toBe('viernes, 30 de octubre');
    expect(capitalize(formatLongDate('2026-10-30'))).toBe('Viernes, 30 de octubre');
    expect(formatMonthYear('2026-10-01')).toBe('Octubre de 2026');
    expect(formatShortDate('2026-10-30')).toBe('30 oct');
    expect(formatTime('09:00')).toBe('9:00 a. m.');
    expect(formatTime('14:30')).toBe('2:30 p. m.');
  });

  it('leaves English exactly as before', () => {
    expect(formatLongDate('2026-10-30')).toBe('Friday, October 30');
    expect(formatMonthYear('2026-10-01')).toBe('October 2026');
    expect(formatTime('14:30')).toBe('2:30 PM');
  });
});
