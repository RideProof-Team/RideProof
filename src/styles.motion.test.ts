import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appTheme = readFileSync(resolve('src/app-theme.css'), 'utf8');
const publicTheme = readFileSync(resolve('src/screens/public.css'), 'utf8');

describe('motion design', () => {
  it('stages app screens and dashboard cards as a short arrival sequence', () => {
    expect(appTheme).toContain('@keyframes screen-arrive');
    expect(appTheme).toContain('@keyframes card-arrive');
    expect(appTheme).toMatch(/\.screen-dashboard\s*>\s*\.card[\s\S]*animation:/);
  });

  it('animates the trip-log story as the landing-page signature moment', () => {
    expect(publicTheme).toContain('@keyframes trip-log-arrive');
    expect(publicTheme).toMatch(/\.rp-timeline li[\s\S]*animation:/);
  });

  it('keeps all new motion behind the user no-preference setting', () => {
    expect(appTheme).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(appTheme).toContain('@media (prefers-reduced-motion: reduce)');
    expect(publicTheme).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
