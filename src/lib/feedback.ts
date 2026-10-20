// ---------------------------------------------------------------------------
// feedback.ts — two ways the app talks back to the user:
//
//   askConfirm({...})   "Are you sure?" in RideProof's own big, clear dialog
//                       (instead of the browser's small, plain OK/Cancel box).
//                       It returns a Promise: await it to get true or false.
//
//   showSnackbar(...)   A short message at the bottom, like "Appointment
//                       deleted", with an optional "Undo" button.
//
// These are plain functions (not React components), so any screen — or
// even the router — can call them. The <FeedbackHost> component listens
// and draws them. This "publish / subscribe" pattern keeps the two apart.
// ---------------------------------------------------------------------------

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red "danger" styling for actions that delete things. */
  danger?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  resolve(answer: boolean): void;
}

export interface Snackbar {
  id: number;
  text: string;
  /** Optional button, e.g. { label: 'Undo', run: () => ... } */
  action?: { label: string; run(): void };
}

type Listener<T> = (value: T) => void;
const confirmListeners = new Set<Listener<ConfirmRequest>>();
const snackbarListeners = new Set<Listener<Snackbar>>();
let nextSnackbarId = 1;

export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  // If nothing is listening (for example in a unit test), fall back to the
  // browser's own confirm box so the question is never silently skipped.
  if (confirmListeners.size === 0) return Promise.resolve(window.confirm(`${options.title}\n\n${options.message}`));
  return new Promise((resolve) => {
    confirmListeners.forEach((listener) => listener({ ...options, resolve }));
  });
}

export function showSnackbar(text: string, action?: Snackbar['action']) {
  const snackbar = { id: nextSnackbarId++, text, action };
  snackbarListeners.forEach((listener) => listener(snackbar));
}

export function onConfirmRequest(listener: Listener<ConfirmRequest>) {
  confirmListeners.add(listener);
  // Returns a function that stops listening.
  return () => {
    confirmListeners.delete(listener);
  };
}

export function onSnackbar(listener: Listener<Snackbar>) {
  snackbarListeners.add(listener);
  return () => {
    snackbarListeners.delete(listener);
  };
}
