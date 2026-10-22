import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { useApp } from './AppContext';
import { createStorage } from './lib/storage';

vi.mock('./screens/Home', () => ({ Home: () => {
  const { mode, profile } = useApp();
  return <main>{mode}:{profile?.riderFirstName}</main>;
} }));

let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  localStorage.clear();
  history.replaceState(null, '', '#/landing');
  await createStorage('real').clearAll();
  await createStorage('demo').clearAll();
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

it('opens the demo from the landing page and returns to real device access', async () => {
  await act(async () => root.render(<App />));
  await act(async () => container.querySelector('button')!.click());
  await vi.waitFor(async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(container.querySelector('main')?.textContent).toBe('demo:Rosa');
  });
  expect(container.querySelector('[aria-label="Guided demo"]')?.textContent).toContain('Stop 1 of 10');
  const tourButton = (label: string) => Array.from(container.querySelectorAll('button')).find(button => button.textContent === label)!;
  await act(async () => tourButton('Pause').click());
  expect(tourButton('Resume')).toBeTruthy();
  await act(async () => tourButton('Restart tour').click());
  expect(tourButton('Pause')).toBeTruthy();
  await act(async () => tourButton('Explore sample on my own').click());
  expect(container.querySelector('[aria-label="Guided demo"]')).toBeNull();
  expect(container.querySelector('main')?.textContent).toBe('demo:Rosa');
  await act(async () => tourButton('Restart tour').click());
  await act(async () => {
    window.location.hash = '#/signin';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await vi.waitFor(async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(container.textContent).toContain('There isn’t a saved profile');
  });
  expect(container.textContent).not.toContain('Rosa’s ride record');
  expect(container.querySelector('.bottom-nav')).toBeNull();
  expect(container.querySelector('[aria-label="Guided demo"]')).toBeNull();
});
