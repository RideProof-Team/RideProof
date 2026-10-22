// ---------------------------------------------------------------------------
// WaitWatcher.tsx — keeps an eye on running ride timers from ANY screen.
//
// Every 20 seconds it checks: has a running timer just reached 15 or 30
// minutes late? If so, it shows a gentle prompt suggesting a call to the
// ride company (a pop-up inside the app, plus a phone notification if the
// rider allowed them). Each prompt is shown only once per timer.
//
// It draws nothing itself. The waiting screen shows its own prompt, so the
// pop-up is skipped while that screen is open.
// ---------------------------------------------------------------------------
import { useEffect } from 'react';
import { useApp } from '../AppContext';
import { nowMoment } from '../lib/clock';
import { notifyOncePerDay } from '../lib/notifications';
import { duePrompt, markPromptShown, promptText } from '../lib/waitTimer';

const CHECK_EVERY_MS = 20_000;

export function WaitWatcher({ onWaitScreen }: { onWaitScreen: boolean }) {
  const { storage, profile, mode, today, showToast } = useApp();

  useEffect(() => {
    if (!profile) return;
    let stopped = false;
    async function check() {
      const now = nowMoment(mode);
      for (const wait of await storage.listWaits()) {
        const minutes = duePrompt(wait, now);
        if (minutes === null || stopped) continue;
        await storage.saveWait(markPromptShown(wait, minutes));
        const { title, body } = promptText(wait, minutes, profile!.rideCompanyName);
        if (!onWaitScreen) showToast({ title, body });
        // In demo mode the in-app pop-up is enough (it shows up in recordings).
        if (mode === 'real') notifyOncePerDay(mode, `wait:${wait.id}:${minutes}`, today, title, body);
      }
    }
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [storage, profile, mode, today, showToast, onWaitScreen]);

  return null;
}
