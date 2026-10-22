// ---------------------------------------------------------------------------
// TripTimers.tsx — the "Where's my ride?" buttons for one of today's trips,
// shown on Home:
//   - "I'm waiting for my ride": from 15 minutes before the pickup time.
//   - "I'm waiting for my ride home": once the pickup is done or the
//     appointment has started.
//   - A running timer shows how long so far, with "Open the ride timer".
//   - Once a timer has finished, "Finish check-in" uses its results.
// ---------------------------------------------------------------------------
import { useApp } from '../AppContext';
import { t, tn } from '../lib/i18n';
import { routeToHash, navigate } from '../lib/router';
import type { Trip } from '../lib/recurrence';
import {
  minutesLateNow,
  momentOf,
  pickupTimeFor,
  startWait,
  WAIT_BUTTON_LEAD_MINUTES,
  waitId,
} from '../lib/waitTimer';
import type { ActiveWait, RideLog, WaitLeg } from '../types';
import { Icon } from './Icon';

interface Props {
  trip: Trip;
  log: RideLog | undefined;
  waits: ActiveWait[];
  now: Date;
}

export function TripTimers({ trip, log, waits, now }: Props) {
  const { storage } = useApp();
  // Already checked in: nothing to time.
  if (log) return null;

  const pickupWait = waits.find((w) => w.id === waitId(trip.appointment.id, trip.date, 'pickup'));
  const returnWait = waits.find((w) => w.id === waitId(trip.appointment.id, trip.date, 'return'));
  const pickup = pickupTimeFor(trip.appointment);
  const pickupSoon = now.getTime() >= momentOf(trip.date, pickup.time).getTime() - WAIT_BUTTON_LEAD_MINUTES * 60_000;
  const appointmentStarted = now.getTime() >= momentOf(trip.date, trip.appointment.time).getTime();

  async function start(leg: WaitLeg) {
    const wait = startWait(trip.appointment, trip.date, leg, now);
    await storage.saveWait(wait);
    navigate({ name: 'wait', id: wait.id });
  }

  const running = [pickupWait, returnWait].filter((w): w is ActiveWait => Boolean(w && !w.finishedAt));
  const finished = [pickupWait, returnWait].filter((w): w is ActiveWait => Boolean(w?.finishedAt));

  return (
    <div className="trip-timers">
      {running.map((w) => {
        const minutes = minutesLateNow(w, now);
        return (
          <div key={w.id}>
            <p className="timer-status">
              <Icon name="clock" />
              {minutes > 0
                ? w.leg === 'return'
                  ? tn(minutes, 'Waiting for your ride home: {n} minute', 'Waiting for your ride home: {n} minutes')
                  : tn(minutes, 'Waiting for your ride: {n} minute late', 'Waiting for your ride: {n} minutes late')
                : w.leg === 'return'
                  ? t('Waiting for your ride home')
                  : t('Waiting for your ride')}
            </p>
            <a href={routeToHash({ name: 'wait', id: w.id })} className="button-primary">
              {t('Open the ride timer')}
            </a>
          </div>
        );
      })}

      {finished.map((w) => (
        <p key={w.id} className="timer-status">
          <Icon name="check" />
          {w.leg === 'return'
            ? w.result === 'never_came'
              ? t('Ride home recorded by your timer (never came).')
              : w.finalMinutesLate
                ? tn(w.finalMinutesLate, 'Ride home recorded by your timer ({n} minute late).', 'Ride home recorded by your timer ({n} minutes late).')
                : t('Ride home recorded by your timer (on time).')
            : w.result === 'never_came'
              ? t('Pickup recorded by your timer (never came).')
              : w.finalMinutesLate
                ? tn(w.finalMinutesLate, 'Pickup recorded by your timer ({n} minute late).', 'Pickup recorded by your timer ({n} minutes late).')
                : t('Pickup recorded by your timer (on time).')}
        </p>
      ))}

      {!pickupWait && !returnWait && pickupSoon && (
        <button type="button" className="button-primary" onClick={() => start('pickup')}>
          <Icon name="clock" /> {t("I'm waiting for my ride")}
        </button>
      )}
      {!returnWait && (pickupWait?.finishedAt || (!pickupWait && appointmentStarted)) && (
        <button type="button" className="button-secondary" onClick={() => start('return')}>
          <Icon name="home" /> {t("I'm waiting for my ride home")}
        </button>
      )}
      {finished.length > 0 && running.length === 0 && (
        <a
          href={routeToHash({ name: 'checkin', appointmentId: trip.appointment.id, date: trip.date })}
          className="button-secondary"
        >
          {t('Finish check-in')}
        </a>
      )}
    </div>
  );
}
