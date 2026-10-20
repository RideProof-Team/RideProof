// ---------------------------------------------------------------------------
// FeedbackHost.tsx — draws the confirm dialog and the snackbar requested
// through lib/feedback.ts. It's placed once, in App.tsx.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { onConfirmRequest, onSnackbar, type ConfirmRequest, type Snackbar } from '../lib/feedback';

/** How long a snackbar stays up. Long enough to read and reach "Undo". */
const SNACKBAR_MS = 10000;

export function FeedbackHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [snackbar, setSnackbar] = useState<Snackbar | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // While the user's finger/mouse/keyboard focus is on the snackbar, keep it up.
  const [paused, setPaused] = useState(false);

  useEffect(() => onConfirmRequest(setRequest), []);
  useEffect(() => onSnackbar(setSnackbar), []);

  // Open the <dialog> as a "modal" (it blocks the page behind it) when asked.
  useEffect(() => {
    if (request && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
      // Start on "Cancel": the safe choice is the default one.
      cancelRef.current?.focus();
    }
  }, [request]);

  // Hide the snackbar after a while, unless it's being used.
  useEffect(() => {
    if (!snackbar || paused) return;
    const timer = setTimeout(() => setSnackbar(null), SNACKBAR_MS);
    return () => clearTimeout(timer);
  }, [snackbar, paused]);

  function answer(value: boolean) {
    request?.resolve(value);
    setRequest(null);
    dialogRef.current?.close();
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        // Pressing Escape counts as "Cancel".
        onCancel={(e) => {
          e.preventDefault();
          answer(false);
        }}
      >
        {request && (
          <>
            <h2 id="confirm-title">{request.title}</h2>
            <p id="confirm-message">{request.message}</p>
            <div className="button-stack">
              <button
                type="button"
                className={request.danger ? 'button-danger-solid' : 'button-primary'}
                onClick={() => answer(true)}
              >
                {request.confirmLabel}
              </button>
              <button type="button" className="button-secondary" onClick={() => answer(false)} ref={cancelRef}>
                {request.cancelLabel ?? 'Cancel'}
              </button>
            </div>
          </>
        )}
      </dialog>

      {/* role="status" + aria-live: screen readers read the message without moving focus. */}
      <div className="snackbar-region" role="status" aria-live="polite">
        {snackbar && (
          <div
            className="snackbar"
            key={snackbar.id}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <span>{snackbar.text}</span>
            {snackbar.action && (
              <button
                type="button"
                className="snackbar-action"
                onClick={() => {
                  snackbar.action!.run();
                  setSnackbar(null);
                }}
              >
                {snackbar.action.label}
              </button>
            )}
            <button type="button" className="snackbar-close" onClick={() => setSnackbar(null)} aria-label="Dismiss message">
              ✕
            </button>
          </div>
        )}
      </div>
    </>
  );
}
