import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DemoTour } from './DemoTour';
import { navigate, type Route } from '../lib/router';

vi.mock('../lib/router', () => ({ navigate: vi.fn() }));
let root: Root;
let container: HTMLDivElement;
const onClose = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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
async function render(route: Route = { name: 'home' }) {
  await act(async () => root.render(<DemoTour route={route} onClose={onClose} />));
}
async function click(label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(b => b.textContent === label);
  expect(button).toBeTruthy();
  await act(async () => button!.click());
}
it('starts automatically and advances to the schedule', async () => {
  await render();
  expect(container.textContent).toContain('Step 1 of 8');
  await act(async () => vi.advanceTimersByTime(15000));
  expect(navigate).toHaveBeenCalledWith({ name: 'appointments' });
});
it('pauses and resumes automatic navigation', async () => {
  await render();
  await click('Pause');
  await act(async () => vi.advanceTimersByTime(30000));
  expect(navigate).not.toHaveBeenCalled();
  await click('Play tour');
  await act(async () => vi.advanceTimersByTime(15000));
  expect(navigate).toHaveBeenCalledWith({ name: 'appointments' });
});
it('supports back and next and stops playback on manual navigation', async () => {
  await render({ name: 'history' });
  await click('Back');
  expect(navigate).toHaveBeenLastCalledWith({ name: 'checkin' });
  await render({ name: 'checkin' });
  await click('Next');
  expect(navigate).toHaveBeenLastCalledWith({ name: 'history' });
  expect(container.textContent).toContain('Play tour');
});
it('pauses when the user interacts with the underlying screen', async () => {
  await render();
  await act(async () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
  await act(async () => vi.advanceTimersByTime(30000));
  expect(navigate).not.toHaveBeenCalled();
});
it('finishes without leaving demo or starting another timer', async () => {
  await render({ name: 'settings' });
  await act(async () => vi.advanceTimersByTime(30000));
  expect(navigate).not.toHaveBeenCalled();
  await click('Finish tour');
  expect(onClose).toHaveBeenCalledOnce();
});
it('lets users close the tour or return from an unlisted screen', async () => {
  await render({ name: 'appointment-new' });
  await click('Return to tour');
  expect(navigate).toHaveBeenCalledWith({ name: 'home' });
  await click('Explore on my own');
  expect(onClose).toHaveBeenCalledOnce();
});
