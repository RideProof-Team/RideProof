import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { useApp } from './AppContext';
import { askConfirm } from './lib/feedback';
import { useLeaveWarning } from './lib/router';
import { createStorage } from './lib/storage';
import { DEMO_PROFILE } from './lib/demoData';
import { saveDemoFlag } from './lib/demoFlag';

vi.mock('./screens/Home', () => ({ Home: () => {
  const { mode, profile } = useApp();
  const [dirty, setDirty] = useState(false);
  useLeaveWarning(dirty, {
    title: 'Leave without saving?',
    message: 'Your draft will be lost.',
    confirmLabel: 'Discard draft',
  });
  return <main><p>{mode}:{profile?.riderFirstName}</p><p>{dirty ? 'Unsaved draft' : 'No draft'}</p><button onClick={() => setDirty(true)}>Edit draft</button></main>;
} }));
vi.mock('./lib/feedback', async importOriginal => ({
  ...await importOriginal<typeof import('./lib/feedback')>(),
  askConfirm: vi.fn(),
}));
vi.mock('./lib/storage', async importOriginal => {
  const actual = await importOriginal<typeof import('./lib/storage')>();
  return { ...actual, createStorage: vi.fn(actual.createStorage) };
});

let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.mocked(askConfirm).mockReset().mockResolvedValue(false);
  localStorage.clear();
  history.replaceState(null, '', '#/home');
  await createStorage('real').clearAll();
  await createStorage('demo').clearAll();
  await createStorage('real').saveProfile({ ...DEMO_PROFILE, riderFirstName: 'Alex' });
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
async function flush() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
}
async function expectText(text: string) {
  await vi.waitFor(async () => { await flush(); expect(container.textContent).toContain(text); });
}
async function click(label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent === label);
  expect(button, `button ${label}`).toBeTruthy();
  await act(async () => button!.click());
  await flush();
}
async function start() {
  await act(async () => root.render(<App />));
  await expectText('real:Alex');
}

it('keeps the real draft when a demo-mode change is cancelled', async () => {
  await start();
  await click('Edit draft');
  await click('Demo');
  expect(askConfirm).toHaveBeenCalledOnce();
  expect(container.textContent).toContain('real:Alex');
  expect(container.textContent).toContain('Unsaved draft');
  expect(container.querySelector('[aria-label="Guided demo"]')).toBeNull();
});

it('opens the demo only after confirming the draft can be discarded', async () => {
  await start();
  await click('Edit draft');
  vi.mocked(askConfirm).mockResolvedValue(true);
  await click('Demo');
  expect(askConfirm).toHaveBeenCalledOnce();
  await expectText('demo:Rosa');
  expect(container.querySelector('[aria-label="Guided demo"]')).not.toBeNull();
  expect(container.textContent).not.toContain('Unsaved draft');
});

it('does not restart a paused tour when discarding the draft is cancelled', async () => {
  saveDemoFlag(true);
  await act(async () => root.render(<App />));
  await expectText('demo:Rosa');
  await click('Restart tour');
  await click('Pause');
  await click('Edit draft');
  await click('Restart tour');
  expect(askConfirm).toHaveBeenCalledOnce();
  expect(container.textContent).toContain('Unsaved draft');
  expect(container.textContent).toContain('Resume');
});

it('returns to the saved real profile without mixing in the sample profile', async () => {
  await start();
  await click('Demo');
  await expectText('demo:Rosa');
  await click('Exit demo');
  await expectText('real:Alex');
  expect(container.querySelector('[aria-label="Guided demo"]')).toBeNull();
  expect((await createStorage('real').getProfile())?.riderFirstName).toBe('Alex');
});

it('offers a retry when device storage fails and recovers the saved profile', async () => {
  const storage = createStorage('real');
  const getProfile = vi.fn().mockRejectedValueOnce(new Error('Device storage unavailable'))
    .mockImplementation(() => storage.getProfile());
  vi.mocked(createStorage).mockImplementationOnce(() => ({ ...storage, getProfile }));
  await act(async () => root.render(<App />));
  await vi.waitFor(async () => {
    await flush();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
  await click('Try again');
  await expectText('real:Alex');
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
