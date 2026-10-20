// ---------------------------------------------------------------------------
// Toast.tsx — a pop-up at the top of the screen that looks like a phone
// notification. Used by "Simulate reminder" in demo mode, so the pitch
// video can show a reminder even if the phone's real notification
// doesn't appear in the screen recording. It hides itself after 8 seconds.
// ---------------------------------------------------------------------------
import { useEffect } from 'react';
import type { ToastMessage } from '../AppContext';

export function Toast({ message, onClose }: { message: ToastMessage; onClose(): void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    // role="alert" makes screen readers read it out right away.
    <div className="toast" role="alert">
      <div className="toast-app">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={20} height={20} /> RideProof · now
      </div>
      <p className="toast-title">{message.title}</p>
      <p className="toast-body">{message.body}</p>
      <button type="button" className="toast-close" onClick={onClose}>
        Close<span className="visually-hidden"> notification</span>
      </button>
    </div>
  );
}
