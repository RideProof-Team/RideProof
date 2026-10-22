import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoTour } from './DemoTour';
import { navigate, type Route } from '../lib/router';

vi.mock('../lib/router', () => ({ navigate: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
const onClose = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.clearAllMocks();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function render(route: Route = { name: 'home' }, autoPlay = true) {
  await act(async () => root.render(<DemoTour route={route} onClose={onClose} autoPlay={autoPlay} />));
}

async function rerender(route: Route, autoPlay = true) {
  await act(async () => root.render(<DemoTour route={route} onClose={onClose} autoPlay={autoPlay} />));
}

function button(label: string) {
  const match = Array.from(container.querySelectorAll('button')).find(element => element.textContent?.trim() === label);
  expect(match, `button named "${label}"`).toBeTruthy();
  return match!;
}

async function click(label: string) {
  await act(async () => button(label).click());
}

describe('DemoTour', () => {
  it('shows a compact chapter rail and advances the automatic demo after a visible countdown', async () => {
    await render();

    expect(container.textContent).toContain('Stop 1 of 9');
    expect(container.textContent).toContain('Next stop in 15 seconds');
    expect(container.querySelectorAll('.demo-tour-chapter')).toHaveLength(9);
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('1');

    await act(async () => vi.advanceTimersByTime(15000));
    expect(navigate).toHaveBeenCalledWith({ name: 'appointments' });
  });

  it('preserves the remaining time through pause and resume', async () => {
    await render();
    await act(async () => vi.advanceTimersByTime(5000));
    expect(container.textContent).toContain('Next stop in 10 seconds');

    await click('Pause');
    await act(async () => vi.advanceTimersByTime(30000));
    expect(navigate).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Paused with 10 seconds left');

    await click('Resume');
    await act(async () => vi.advanceTimersByTime(9000));
    expect(navigate).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(navigate).toHaveBeenCalledWith({ name: 'appointments' });
  });

  it('starts paused for a manual tour and for reduced-motion preferences', async () => {
    await render({ name: 'home' }, false);
    expect(container.textContent).toContain('Manual tour');
    expect(button('Resume')).toBeTruthy();

    vi.mocked(matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    await act(async () => root.unmount());
    container.remove();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await render({ name: 'home' }, true);
    expect(container.textContent).toContain('Motion preference respected');
    await act(async () => vi.advanceTimersByTime(30000));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('pauses manual Back, Next, and direct chapter navigation to avoid racing the page', async () => {
    await render({ name: 'history' });
    await click('Back');
    expect(navigate).toHaveBeenLastCalledWith({ name: 'checkin' });

    await rerender({ name: 'checkin' });
    expect(container.textContent).toContain('Paused');
    await click('Next');
    expect(navigate).toHaveBeenLastCalledWith({ name: 'history' });

    await click('Report');
    expect(navigate).toHaveBeenLastCalledWith({ name: 'report' });
    expect(container.textContent).toContain('Paused');
  });

  it('pauses when the user interacts with the underlying screen but not with the tour dock', async () => {
    await render();
    await act(async () => button('Pause').dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(container.textContent).toContain('Next stop in 15 seconds');

    await act(async () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    await act(async () => vi.advanceTimersByTime(30000));
    expect(navigate).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Paused with 15 seconds left');
  });

  it('keeps the last chapter when a user opens a detail screen and offers a return', async () => {
    await render({ name: 'appointments' });
    await rerender({ name: 'appointment-new' });

    expect(container.textContent).toContain('You stepped off the tour path');
    await click('Return to Schedule');
    expect(navigate).toHaveBeenCalledWith({ name: 'appointments' });
  });

  it('finishes cleanly, never schedules another navigation, and can be closed early', async () => {
    await render({ name: 'settings' });
    expect(container.textContent).toContain('Nothing has been sent or changed');
    await act(async () => vi.advanceTimersByTime(30000));
    expect(navigate).not.toHaveBeenCalled();
    await click('Finish tour');
    expect(onClose).toHaveBeenCalledOnce();

    await rerender({ name: 'home' });
    await click('Explore sample on my own');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
