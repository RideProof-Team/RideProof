// ---------------------------------------------------------------------------
// useNow.ts — a React hook that returns "now" and redraws the screen every
// `everyMs` milliseconds. The wait timer uses it once a second.
//
// It doesn't count anything itself: each redraw just asks the clock what
// time it is (the real clock, or the simulated demo clock).
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { nowMoment } from './clock';

export function useNow(everyMs: number): Date {
  const { mode } = useApp();
  const [now, setNow] = useState(() => nowMoment(mode));
  useEffect(() => {
    setNow(nowMoment(mode));
    const timer = setInterval(() => setNow(nowMoment(mode)), everyMs);
    // Phones pause timers in the background. When the app comes back,
    // update right away instead of waiting for the next tick.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(nowMoment(mode));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [mode, everyMs]);
  return now;
}
