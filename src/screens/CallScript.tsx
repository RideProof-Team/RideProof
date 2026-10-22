// ---------------------------------------------------------------------------
// CallScript.tsx — "Call to book": what to say, then "Did it work?"
//
//   1. A "What to say" script built from the appointment and profile
//      (callScript.ts). Anything unknown is in [brackets]. The pickup and
//      ride-home times can be changed here. Copy button.
//   2. The Call button.
//   3. After the call: "Did you get the ride booked?"
//        Yes        -> marks the ride as booked (optional confirmation number)
//        Not yet    -> nothing changes; the booking reminder stays
//        Couldn't   -> saved as evidence (bookingAttempts.ts) with the reason
// The ride is only ever marked booked when the rider taps "Yes".
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useApp } from '../AppContext';
import { TextField } from '../components/FormFields';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { attemptsForTrip, FAIL_REASON_LABELS, FAIL_REASONS, FAIL_REASON_SHORT, newFailedBooking } from '../lib/bookingAttempts';
import { buildCallScript, suggestedPickup } from '../lib/callScript';
import { formatLongDate } from '../lib/dates';
import { showSnackbar } from '../lib/feedback';
import { APPOINTMENT_TYPE_LABELS } from '../lib/labels';
import { navigate } from '../lib/router';
import { newId } from '../lib/storage';
import { useRideData } from '../lib/useRideData';
import type { BookingFailReason } from '../types';

type Outcome = 'booked' | 'not_yet' | 'failed';

export function CallScript({ appointmentId, date }: { appointmentId: string; date: string }) {
  const { profile, storage, today } = useApp();
  const { data } = useRideData();
  const appointment = data?.appointments.find((a) => a.id === appointmentId);

  const [pickupTime, setPickupTime] = useState<string | null>(null);
  const [returnTime, setReturnTime] = useState('');
  const [noReturnRide, setNoReturnRide] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [givenPickup, setGivenPickup] = useState('');
  const [reason, setReason] = useState<BookingFailReason | null>(null);
  const [details, setDetails] = useState('');
  const [reasonError, setReasonError] = useState('');

  const back = { to: { name: 'home' as const }, label: 'Home' };
  if (!profile || !data) return <Screen title="Call to book a ride" back={back}><p>Loading…</p></Screen>;
  if (!appointment) {
    return (
      <Screen title="Call to book a ride" back={back}>
        <p>That appointment couldn't be found. It may have been deleted.</p>
      </Screen>
    );
  }

  const pickup = pickupTime ?? suggestedPickup(appointment);
  const script = buildCallScript({ profile, appointment, tripDate: date, pickupTime: pickup, returnTime, noReturnRide, notes });
  const earlierTries = attemptsForTrip(data.bookingAttempts, appointment.id, date);

  async function copy() {
    try {
      await navigator.clipboard.writeText(script);
      setStatus('Script copied.');
    } catch {
      setStatus("Copying was blocked. You can read the script from the screen.");
    }
  }

  async function saveBooked() {
    await storage.saveAppointment({
      ...appointment!,
      rideBooked: true,
      confirmationNumber: confirmation.trim() || appointment!.confirmationNumber,
      // Only a time the ride company actually gave, never our suggestion.
      ...(givenPickup ? { pickupTime: givenPickup } : {}),
    });
    showSnackbar('Ride marked as booked.');
    navigate({ name: 'home' });
  }

  function notYet() {
    showSnackbar('OK. The ride is still not booked, and the reminder stays on Home.');
    navigate({ name: 'home' });
  }

  async function saveFailed() {
    if (!reason) {
      setReasonError('Choose what happened.');
      return;
    }
    await storage.saveBookingAttempt(
      newFailedBooking(newId(), appointment!, date, today, reason, details, new Date().toISOString()),
    );
    showSnackbar('Saved. This call will show in History and your report.');
    navigate({ name: 'home' });
  }

  return (
    <Screen title="Call to book a ride" back={back}>
      <p className="trip-line">
        {APPOINTMENT_TYPE_LABELS[appointment.type]} at {appointment.clinicName}
        <br />
        {formatLongDate(date, true)}
      </p>
      {earlierTries.length > 0 && (
        <p className="status status-problem">
          <Icon name="x" size={20} />
          Earlier call on {formatLongDate(earlierTries[0].attemptedOn)}: {FAIL_REASON_SHORT[earlierTries[0].reason]}
        </p>
      )}

      <section aria-labelledby="script-heading">
        <h2 id="script-heading">What to say</h2>
        <p className="field-hint">Fill in anything in [brackets] when you talk to them.</p>
        <div className="call-script" id="call-script">
          {script.split('\n').map((line, i) => <p key={i}>{line}</p>)}
        </div>
        <p className="action-status" aria-live="polite">{status}</p>
        <div className="button-stack">
          <a href={`tel:${profile.rideCompanyPhone}`} className="button-primary button-big">
            <Icon name="phone" /> Call {profile.rideCompanyName}
          </a>
          <button type="button" className="button-secondary" onClick={copy}>
            <Icon name="copy" /> Copy the script
          </button>
        </div>
      </section>

      <details className="table-toggle">
        <summary>Change the times or add notes</summary>
        <TextField
          id="script-pickup"
          type="time"
          label="Pickup time to ask for"
          hint={appointment.pickupTime ? 'The pickup time you saved for this appointment.' : 'Suggested: 1 hour before the appointment.'}
          value={pickup}
          onChange={setPickupTime}
        />
        <label className="choice-card">
          <input type="checkbox" checked={noReturnRide} onChange={(e) => setNoReturnRide(e.target.checked)} />
          <span className="choice-label">No ride home needed</span>
        </label>
        {!noReturnRide && (
          <TextField
            id="script-return"
            type="time"
            label="Ride home time (optional)"
            hint="When the appointment should be over."
            value={returnTime}
            onChange={setReturnTime}
          />
        )}
        <div className="field">
          <label htmlFor="script-notes">Anything else to tell them (optional)</label>
          <textarea id="script-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <p className="field-hint">
          Mobility needs and home address come from <a href="#/settings/profile">your information</a>.
        </p>
      </details>

      <section className="card" aria-labelledby="after-call-heading">
        <h2 id="after-call-heading">After the call</h2>
        <fieldset className="choice-group">
          <legend>Did you get the ride booked?</legend>
          {([
            ['booked', 'Yes, it’s booked'],
            ['not_yet', 'Not yet (I’ll call again)'],
            ['failed', 'I couldn’t book it'],
          ] as [Outcome, string][]).map(([value, label]) => (
            <label key={value} className="choice-card">
              <input type="radio" name="call-outcome" checked={outcome === value} onChange={() => setOutcome(value)} />
              <span className="choice-label">{label}</span>
            </label>
          ))}
        </fieldset>

        {outcome === 'booked' && (
          <>
            <TextField
              id="script-confirmation"
              label="Confirmation number (optional)"
              value={confirmation}
              onChange={setConfirmation}
            />
            <TextField
              id="script-given-pickup"
              type="time"
              label="Pickup time they gave you (optional)"
              hint="The ride timer uses it on the day."
              value={givenPickup}
              onChange={setGivenPickup}
            />
            <button type="button" className="button-primary" onClick={saveBooked}>
              <Icon name="check" /> Mark the ride as booked
            </button>
          </>
        )}
        {outcome === 'not_yet' && (
          <button type="button" className="button-primary" onClick={notYet}>
            Done for now
          </button>
        )}
        {outcome === 'failed' && (
          <>
            <fieldset className="choice-group" aria-describedby={reasonError ? 'reason-error' : undefined}>
              <legend>What happened?</legend>
              {FAIL_REASONS.map((r) => (
                <label key={r} className="choice-card">
                  <input
                    type="radio"
                    name="fail-reason"
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      setReasonError('');
                    }}
                  />
                  <span className="choice-label">{FAIL_REASON_LABELS[r]}</span>
                </label>
              ))}
              {reasonError && <p id="reason-error" className="field-error" role="alert">{reasonError}</p>}
            </fieldset>
            <div className="field">
              <label htmlFor="fail-details">Details (optional)</label>
              <p id="fail-details-hint" className="field-hint">For example: “On hold 40 minutes, then the call dropped.”</p>
              <textarea
                id="fail-details"
                rows={2}
                value={details}
                aria-describedby="fail-details-hint"
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
            <p className="field-hint">This is saved as evidence. The ride stays “not booked”.</p>
            <button type="button" className="button-primary" onClick={saveFailed}>
              Save what happened
            </button>
          </>
        )}
      </section>
    </Screen>
  );
}
