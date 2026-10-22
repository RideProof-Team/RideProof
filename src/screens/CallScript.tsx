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
// The script can be in English even when the app is in Spanish (some ride
// company agents only speak English).
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useApp } from '../AppContext';
import { TextField } from '../components/FormFields';
import { Icon } from '../components/Icon';
import { DocumentLanguage } from '../components/LanguageSwitch';
import { Screen } from '../components/Screen';
import { attemptsForTrip, FAIL_REASON_LABELS, FAIL_REASONS, FAIL_REASON_SHORT, newFailedBooking } from '../lib/bookingAttempts';
import { buildCallScript, suggestedPickup } from '../lib/callScript';
import { capitalize, formatLongDate } from '../lib/dates';
import { showSnackbar } from '../lib/feedback';
import { t, tx, useLanguage, withLanguage, type Language } from '../lib/i18n';
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
  // The script's language starts as the app's language.
  const appLanguage = useLanguage();
  const [scriptLanguage, setScriptLanguage] = useState<Language>(appLanguage);

  const back = { to: { name: 'home' as const }, label: t('Home') };
  const title = t('Call to book a ride');
  if (!profile || !data) return <Screen title={title} back={back}><p>{t('Loading…')}</p></Screen>;
  if (!appointment) {
    return (
      <Screen title={title} back={back}>
        <p>{t("That appointment couldn't be found. It may have been deleted.")}</p>
      </Screen>
    );
  }

  const pickup = pickupTime ?? suggestedPickup(appointment);
  const script = withLanguage(scriptLanguage, () =>
    buildCallScript({ profile, appointment, tripDate: date, pickupTime: pickup, returnTime, noReturnRide, notes }),
  );
  const earlierTries = attemptsForTrip(data.bookingAttempts, appointment.id, date);

  async function copy() {
    try {
      await navigator.clipboard.writeText(script);
      setStatus(t('Script copied.'));
    } catch {
      setStatus(t('Copying was blocked. You can read the script from the screen.'));
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
    showSnackbar(t('Ride marked as booked.'));
    navigate({ name: 'home' });
  }

  function notYet() {
    showSnackbar(t('OK. The ride is still not booked, and the reminder stays on Home.'));
    navigate({ name: 'home' });
  }

  async function saveFailed() {
    if (!reason) {
      setReasonError(t('Choose what happened.'));
      return;
    }
    await storage.saveBookingAttempt(
      newFailedBooking(newId(), appointment!, date, today, reason, details, new Date().toISOString()),
    );
    showSnackbar(t('Saved. This call will show in History and your report.'));
    navigate({ name: 'home' });
  }

  return (
    <Screen title={title} back={back}>
      <p className="trip-line">
        {t('{type} at {clinic}', { type: t(APPOINTMENT_TYPE_LABELS[appointment.type]), clinic: appointment.clinicName })}
        <br />
        {capitalize(formatLongDate(date, true))}
      </p>
      {earlierTries.length > 0 && (
        <p className="status status-problem">
          <Icon name="x" size={20} />
          {t('Earlier call on {date}: {reason}', {
            date: formatLongDate(earlierTries[0].attemptedOn),
            reason: t(FAIL_REASON_SHORT[earlierTries[0].reason]),
          })}
        </p>
      )}

      <section aria-labelledby="script-heading">
        <h2 id="script-heading">{t('What to say')}</h2>
        <DocumentLanguage id="script-language" value={scriptLanguage} onChange={setScriptLanguage} />
        <p className="field-hint">{t('Fill in anything in [brackets] when you talk to them.')}</p>
        <div className="call-script" id="call-script" lang={scriptLanguage}>
          {script.split('\n').map((line, i) => <p key={i}>{line}</p>)}
        </div>
        <p className="action-status" aria-live="polite">{status}</p>
        <div className="button-stack">
          <a href={`tel:${profile.rideCompanyPhone}`} className="button-primary button-big">
            <Icon name="phone" /> {t('Call {name}', { name: profile.rideCompanyName })}
          </a>
          <button type="button" className="button-secondary" onClick={copy}>
            <Icon name="copy" /> {t('Copy the script')}
          </button>
        </div>
      </section>

      <details className="table-toggle">
        <summary>{t('Change the times or add notes')}</summary>
        <TextField
          id="script-pickup"
          type="time"
          label={t('Pickup time to ask for')}
          hint={appointment.pickupTime ? t('The pickup time you saved for this appointment.') : t('Suggested: 1 hour before the appointment.')}
          value={pickup}
          onChange={setPickupTime}
        />
        <label className="choice-card">
          <input type="checkbox" checked={noReturnRide} onChange={(e) => setNoReturnRide(e.target.checked)} />
          <span className="choice-label">{t('No ride home needed')}</span>
        </label>
        {!noReturnRide && (
          <TextField
            id="script-return"
            type="time"
            label={t('Ride home time (optional)')}
            hint={t('When the appointment should be over.')}
            value={returnTime}
            onChange={setReturnTime}
          />
        )}
        <div className="field">
          <label htmlFor="script-notes">{t('Anything else to tell them (optional)')}</label>
          <textarea id="script-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <p className="field-hint">
          {tx('Mobility needs and home address come from {link}.', {
            link: <a href="#/settings/profile">{t('your information')}</a>,
          })}
        </p>
      </details>

      <section className="card" aria-labelledby="after-call-heading">
        <h2 id="after-call-heading">{t('After the call')}</h2>
        <fieldset className="choice-group">
          <legend>{t('Did you get the ride booked?')}</legend>
          {([
            ['booked', t('Yes, it’s booked')],
            ['not_yet', t('Not yet (I’ll call again)')],
            ['failed', t('I couldn’t book it')],
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
              label={t('Confirmation number (optional)')}
              value={confirmation}
              onChange={setConfirmation}
            />
            <TextField
              id="script-given-pickup"
              type="time"
              label={t('Pickup time they gave you (optional)')}
              hint={t('The ride timer uses it on the day.')}
              value={givenPickup}
              onChange={setGivenPickup}
            />
            <button type="button" className="button-primary" onClick={saveBooked}>
              <Icon name="check" /> {t('Mark the ride as booked')}
            </button>
          </>
        )}
        {outcome === 'not_yet' && (
          <button type="button" className="button-primary" onClick={notYet}>
            {t('Done for now')}
          </button>
        )}
        {outcome === 'failed' && (
          <>
            <fieldset className="choice-group" aria-describedby={reasonError ? 'reason-error' : undefined}>
              <legend>{t('What happened?')}</legend>
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
                  <span className="choice-label">{t(FAIL_REASON_LABELS[r])}</span>
                </label>
              ))}
              {reasonError && <p id="reason-error" className="field-error" role="alert">{reasonError}</p>}
            </fieldset>
            <div className="field">
              <label htmlFor="fail-details">{t('Details (optional)')}</label>
              <p id="fail-details-hint" className="field-hint">{t('For example: “On hold 40 minutes, then the call dropped.”')}</p>
              <textarea
                id="fail-details"
                rows={2}
                value={details}
                aria-describedby="fail-details-hint"
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
            <p className="field-hint">{t('This is saved as evidence. The ride stays “not booked”.')}</p>
            <button type="button" className="button-primary" onClick={saveFailed}>
              {t('Save what happened')}
            </button>
          </>
        )}
      </section>
    </Screen>
  );
}
