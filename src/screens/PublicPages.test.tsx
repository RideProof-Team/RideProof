import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Landing, SignIn } from './PublicPages';
import type { Profile } from '../types';

const profile: Profile = { role: 'rider', riderFirstName: 'Alex', caregiverName: '', state: 'WA', rideCompanyName: 'Example', rideCompanyPhone: '555-0100', healthPlanName: '' };
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('public entry pages', () => {
  it('provides setup, sign-in, and a working sample entry point', async () => {
    const demo = vi.fn();
    await act(async () => root.render(<Landing onDemo={demo} />));
    expect(container.textContent).toContain('RideConnect');
    expect(container.textContent).not.toContain('RideProof');
    expect(container.querySelector('.rp-mark')?.textContent).toBe('rc');
    expect(document.title).toBe('Keep a record. Have a voice. · RideConnect');
    expect(container.querySelector('a[href="#/setup"]')).not.toBeNull();
    expect(container.querySelector('a[href="#/signin"]')).not.toBeNull();
    await act(async () => Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Watch the auto-demo')!.click());
    expect(demo).toHaveBeenCalledOnce();
    expect(demo).toHaveBeenLastCalledWith(true);
    const guided = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Take a guided tour');
    expect(guided).toBeTruthy();
    await act(async () => guided!.click());
    expect(demo).toHaveBeenLastCalledWith(false);
    expect(document.activeElement).toBe(container.querySelector('h1'));
  });
  it('offers setup rather than pretending a missing account can sign in', async () => {
    await act(async () => root.render(<SignIn loading={false} onContinue={vi.fn()} onDemo={vi.fn()} />));
    expect(container.textContent).toContain('There isn’t a saved profile');
    expect(container.querySelector('a[href="#/setup"]')).not.toBeNull();
    expect(container.querySelector('input[type="password"]')).toBeNull();
  });
  it('resumes the saved profile and explains device-only access', async () => {
    const resume = vi.fn();
    await act(async () => root.render(<SignIn profile={profile} loading={false} onContinue={resume} onDemo={vi.fn()} />));
    expect(container.textContent).toContain('Alex’s ride record');
    expect(container.textContent).toContain('does not sign you into an online account');
    await act(async () => container.querySelector<HTMLButtonElement>('.rp-button')!.click());
    expect(resume).toHaveBeenCalledOnce();
  });
  it('waits for storage before offering profile setup', async () => {
    await act(async () => root.render(<SignIn loading onContinue={vi.fn()} onDemo={vi.fn()} />));
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.querySelector('a[href="#/setup"]')).toBeNull();
  });
});
