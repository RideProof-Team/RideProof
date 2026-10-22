// ---------------------------------------------------------------------------
// Wait.tsx — "Where's my ride?": a big running timer while the rider waits.
//
//   - Shows how long they've waited and the scheduled pickup time.
//   - At 15 and 30 minutes late, a gentle prompt suggests calling the ride
//     company (and a phone notification, if allowed — see WaitWatcher).
//   - "My ride is here" or (after 30 minutes late) "My ride never came"
//     ends the timer and opens the check-in with the answers filled in.
//
// The timer is redrawn every second from the saved START time, so it keeps
// the right time even after the phone was locked or the app was closed.
// ---------------------------------------------------------------------------
import { useEffect } from 'react';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { formatLongDate, formatTime } from '../lib/dates';
import { askConfirm, showSnackbar } from '../lib/feedback';
import { APPOINTMENT_TYPE_LABELS } from '../lib/labels';
import { navigate } from '../lib/router';
import { useNow } from '../lib/useNow';
import { useRideData } from '../lib/useRideData';
import {
  canMarkNeverCame,
  elapsedSeconds,
  finishWait,
  formatClock,
  markPromptShown,
  minutesLateNow,
  minutesUntilPickup,
  NEVER_CAME_AFTER_MINUTES,
  promptText,
  PROMPT_MINUTES,
} from '../lib/waitTimer';
import type { ActiveWait } from '../types';

export function Wait({ id }: { id?: string }) {
  const { profile, storage, mode, refreshAll } = useApp();
  const { data, reload } = useRideData();
  const now = useNow(1000);

  // Which timer: the one named in the address, or the newest one still running.
  const wait: ActiveWait | undefined = data
    ? id
      ? data.waits.find((w) => w.id === id)
      : [...data.waits].filter((w) => !w.finishedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
    : undefined;

  // Remember which prompts were seen here, so the background watcher
  // doesn't also pop up the same message.
  const late = wait ? minutesLateNow(wait, now) : 0;
  const reached = [...PROMPT_MINUTES].filter((m) => late >= m).pop();
  useEffect(() => {
    if (wait && !wait.finishedAt && reached !== undefined && !wait.promptsShown.includes(reached)) {
      storage.saveWait(markPromptShown(wait, reached)).then(reload);
    }
  }, [wait, reached, storage, reload]);

  if (!data || !profile) return <Screen title="Waiting for your ride"><p>Loading…</p></Screen>;
  if (!wait) {
    return (
      <Screen title="Waiting for your ride" back={{ to: { name: 'home' }, label: 'Home' }}>
        <p>There's no ride timer running right now. You can start one from the Home screen when it's almost time for your ride.</p>
      </Screen>
    );
  }

  const appointment = data.appointments.find((a) => a.id === wait.appointmentId);
  const isHome = wait.leg === 'return';
  const title = isHome ? 'Waiting for your ride home' : 'Waiting for your ride';
  const until = minutesUntilPickup(wait, now);
  const prompt = reached !== undefined ? promptText(wait, reached, profile.rideCompanyName) : null;

  async function rideIsHere() {
    await storage.saveWait(finishWait(wait!, 'arrived', now));
    navigate({ name: 'checkin', appointmentId: wait!.appointmentId, date: wait!.tripDate });
  }

  async function neverCame() {
    const ok = await askConfirm({
      title: 'Record that the ride never came?',
      message: `You waited ${late} minutes${isHome ? ' for your ride home' : ' past the pickup time'}. RideConnect will save that and open the check-in.`,
      confirmLabel: 'Yes, it never came',
      danger: true,
    });
    if (!ok) return;
    await storage.saveWait(finishWait(wait!, 'never_came', now));
    navigate({ name: 'checkin', appointmentId: wait!.appointmentId, date: wait!.tripDate });
  }

  async function stopByMistake() {
    const ok = await askConfirm({
      title: 'Stop this timer?',
      message: 'Use this if you started the timer by mistake. Nothing will be recorded.',
      confirmLabel: 'Stop the timer',
    });
    if (!ok) return;
    await storage.deleteWait(wait!.id);
    showSnackbar('Timer stopped.', {
      label: 'Undo',
      run: async () => {
        await storage.saveWait(wait!);
        refreshAll();
      },
    });
    navigate({ name: 'home' });
  }

  return (
    <Screen title={title} back={{ to: { name: 'home' }, label: 'Home' }}>
      {mode === 'demo' && (
        <p className="demo-note">
          <Icon name="clock" /> Demo: this timer uses a simulated clock. Open Demo controls and tap "Jump ahead 15 minutes" to
          see what happens when a ride is late.
        </p>
      )}

      {appointment && (
        <p className="trip-line">
          {APPOINTMENT_TYPE_LABELS[appointment.type]} at {appointment.clinicName}
          <br />
          {formatLongDate(wait.tripDate)}
        </p>
      )}

      <div className="wait-timer-box">
        <p className="wait-timer-label">{isHome ? 'Waiting for your ride home' : "You've been waiting"}</p>
        {/* role="timer": screen readers know this changes every second and don't announce each tick. */}
        <p className="wait-timer" role="timer" aria-label={`Waiting time: ${formatClock(elapsedSeconds(wait, now))}`}>
          {formatClock(elapsedSeconds(wait, now))}
        </p>
        {!isHome && wait.scheduledTime && (
          <p className="wait-detail">
            Pickup time: <strong>{formatTime(wait.scheduledTime)}</strong>
            {wait.scheduledIsEstimate && ' (estimated: 1 hour before the appointment)'}
          </p>
        )}
        <p className="wait-detail">
          {!isHome && until > 0
            ? `The pickup time is in ${until} ${until === 1 ? 'minute' : 'minutes'}.`
            : late > 0
              ? `${late} ${late === 1 ? 'minute' : 'minutes'} ${isHome ? 'waiting so far' : 'past the pickup time'}.`
              : isHome
                ? 'Timer started.'
                : 'Your ride is due now.'}
        </p>
      </div>

      {prompt && (
        // role="alert": screen readers read it out the moment it appears.
        <div className="wait-prompt" role="alert">
          <Icon name="warning" />
          <div>
            <p className="wait-prompt-title">{prompt.title}</p>
            <p>{prompt.body}</p>
          </div>
        </div>
      )}

      <div className="button-stack">
        <button type="button" className="button-primary button-big" onClick={rideIsHere}>
          <Icon name="check" /> My ride is here
        </button>
        <a href={`tel:${profile.rideCompanyPhone}`} className="button-secondary button-tall">
          <Icon name="phone" /> Call {profile.rideCompanyName}
        </a>
        {canMarkNeverCame(wait, now) ? (
          <button type="button" className="button-danger" onClick={neverCame}>
            <Icon name="x" /> My ride never came
          </button>
        ) : (
          <p className="field-hint">
            "My ride never came" will appear here after {NEVER_CAME_AFTER_MINUTES} minutes
            {isHome ? ' of waiting' : ' past the pickup time'}.
          </p>
        )}
        <button type="button" className="link-button" onClick={stopByMistake}>
          I started this timer by mistake
        </button>
      </div>
      <p className="field-hint">You can close the app or lock your phone. The timer keeps the right time.</p>
    </Screen>
  );
}
