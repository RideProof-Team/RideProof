// ---------------------------------------------------------------------------
// CheckIn.tsx — log what happened on a ride, one question per screen.
//
// Step 1 — figure out WHICH trip we're checking in on:
//   - the address can name one ("#/checkin/<appointment id>/<date>"), or
//   - with no trip named, we use today's appointment. If there are several
//     today, the user picks one. If there are none, we offer recent trips.
// Step 2 — ask the questions (the <Questions> part further down).
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../AppContext';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import {
  answersFromLog,
  buildRideLog,
  findLog,
  nextStep,
  previousStep,
  stepsFor,
  tripsNeedingCheckIn,
  type Answers,
  type Step,
} from '../lib/checkinFlow';
import { nowTimestamp } from '../lib/clock';
import { formatLongDate, formatTime } from '../lib/dates';
import {
  APPOINTMENT_TYPE_LABELS,
  MINUTES_LATE_LABELS,
  PICKUP_LABELS,
  RETURN_LABELS,
} from '../lib/labels';
import { tripsBetween } from '../lib/recurrence';
import { askConfirm, showSnackbar } from '../lib/feedback';
import { navigate, routeToHash } from '../lib/router';
import { newId } from '../lib/storage';
import { useRideData } from '../lib/useRideData';
import type { AppointmentType, Profile, RideLog } from '../types';

/** The details of the trip being checked in on. */
interface TripInfo {
  appointmentId: string;
  clinicName: string;
  appointmentType: AppointmentType;
  time: string | null;
  date: string;
}

const TITLE = 'Ride check-in';

export function CheckIn({ appointmentId, date }: { appointmentId?: string; date?: string }) {
  const { today, profile } = useApp();
  const { data } = useRideData();

  if (!data || !profile) return <Screen title={TITLE}><p>Loading…</p></Screen>;
  const { appointments, rideLogs } = data;

  // --- A specific trip was named in the address ---
  if (appointmentId && date) {
    const appointment = appointments.find((a) => a.id === appointmentId);
    const existing = findLog(rideLogs, appointmentId, date);
    // If the appointment was deleted, we can still edit its log using the
    // clinic details copied into the log.
    const source = appointment ?? existing;
    if (!source) {
      return (
        <Screen title={TITLE}>
          <p>Sorry, that ride wasn't found.</p>
          <a href="#/home" className="button-secondary">Back to Home</a>
        </Screen>
      );
    }
    const trip: TripInfo = {
      appointmentId,
      clinicName: source.clinicName,
      appointmentType: appointment ? appointment.type : existing!.appointmentType,
      time: appointment?.time ?? null,
      date,
    };
    // key: start the questions fresh if the trip changes.
    return <Questions key={`${appointmentId}-${date}`} trip={trip} existing={existing} profile={profile} />;
  }

  // --- No trip named: use today's ---
  const todaysTrips = tripsBetween(appointments, today, today);
  if (todaysTrips.length === 1) {
    const t = todaysTrips[0];
    const trip: TripInfo = {
      appointmentId: t.appointment.id,
      clinicName: t.appointment.clinicName,
      appointmentType: t.appointment.type,
      time: t.appointment.time,
      date: t.date,
    };
    return <Questions trip={trip} existing={findLog(rideLogs, t.appointment.id, t.date)} profile={profile} />;
  }

  // Zero or several trips today: let the user choose.
  const choices = todaysTrips.length > 1 ? todaysTrips : tripsNeedingCheckIn(appointments, rideLogs, today);
  return (
    <Screen title={TITLE}>
      <p>
        {todaysTrips.length > 1
          ? 'There is more than one appointment today. Which ride do you want to check in on?'
          : 'There is no appointment today.'}
      </p>
      {todaysTrips.length === 0 && choices.length > 0 && <h2>Recent rides with no check-in</h2>}
      <ul className="card-list">
        {choices.map((t) => (
          <li key={`${t.appointment.id}-${t.date}`}>
            <a
              className="card card-link"
              href={routeToHash({ name: 'checkin', appointmentId: t.appointment.id, date: t.date })}
            >
              <span className="card-title">{formatLongDate(t.date)}, {formatTime(t.appointment.time)}</span>
              <span className="card-detail">
                {APPOINTMENT_TYPE_LABELS[t.appointment.type]} at {t.appointment.clinicName}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {todaysTrips.length === 0 && choices.length === 0 && (
        <p>There are no recent rides to check in on.</p>
      )}
      <a href="#/home" className="button-secondary">Back to Home</a>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// The questions themselves.
// ---------------------------------------------------------------------------

interface Option<T> {
  value: T;
  label: string;
  icon: IconName;
  tone: 'good' | 'late' | 'problem' | 'neutral';
}

function Questions({ trip, existing, profile }: { trip: TripInfo; existing?: RideLog; profile: Profile }) {
  const { storage, mode, refreshAll } = useApp();
  // If this trip was already logged, start with the old answers so they can be changed.
  const [answers, setAnswers] = useState<Answers>(() => (existing ? answersFromLog(existing) : { notes: '' }));
  const [step, setStep] = useState<Step>('pickup');
  const [saved, setSaved] = useState<RideLog | null>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Each time the question changes, move focus to it so screen readers read it.
  // (Skip the very first one: the screen heading gets focus then.)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    questionRef.current?.focus();
  }, [step, saved]);

  const isCaregiver = profile.role === 'caregiver';
  const name = profile.riderFirstName;
  const steps = stepsFor(answers);

  /** Record an answer and go straight to the next question: one tap per question. */
  function answer(change: Partial<Answers>) {
    const updated = { ...answers, ...change };
    setAnswers(updated);
    const next = nextStep(step, updated);
    if (next !== 'done') setStep(next);
  }

  function goBack() {
    const previous = previousStep(step, answers);
    if (previous) setStep(previous);
    else window.history.back();
  }

  async function save() {
    const log = buildRideLog(answers, {
      id: existing?.id ?? newId(),
      appointmentId: trip.appointmentId,
      clinicName: trip.clinicName,
      appointmentType: trip.appointmentType,
      rideDate: trip.date,
      // Keep the original time if this check-in is being edited.
      recordedAt: existing?.recordedAt ?? nowTimestamp(mode),
    });
    await storage.saveRideLog(log);
    setSaved(log);
  }

  async function deleteLog() {
    if (!existing) return;
    const ok = await askConfirm({
      title: 'Delete this check-in?',
      message: `Your record of the ride on ${formatLongDate(existing.rideDate)} will be removed.`,
      confirmLabel: 'Delete check-in',
      danger: true,
    });
    if (!ok) return;
    await storage.deleteRideLog(existing.id);
    navigate({ name: 'history' });
    showSnackbar('Check-in deleted.', {
      label: 'Undo',
      run: async () => {
        await storage.saveRideLog(existing);
        refreshAll();
      },
    });
  }

  const tripLine = (
    <p className="trip-line">
      {APPOINTMENT_TYPE_LABELS[trip.appointmentType]} at {trip.clinicName}
      <br />
      {formatLongDate(trip.date)}
      {trip.time && `, ${formatTime(trip.time)}`}
    </p>
  );

  // ----- Finished -----
  if (saved) {
    const hadProblem =
      saved.pickupStatus !== 'on_time' || saved.appointmentOutcome !== 'made_it' ||
      saved.returnRideStatus === 'late' || saved.returnRideStatus === 'never_came';
    return (
      <Screen title={TITLE}>
        {tripLine}
        <div className="done-box" role="status">
          <Icon name="check" size={40} />
          <h2 tabIndex={-1} ref={questionRef}>Saved</h2>
        </div>
        <p>
          {hadProblem
            ? 'This ride had a problem. It is saved with the date and time, so you can use it as proof.'
            : 'Great — this ride went well. It is saved in your history.'}
        </p>
        <a href="#/home" className="button-primary">Back to Home</a>
        <a href="#/history" className="button-secondary">See ride history</a>
      </Screen>
    );
  }

  // ----- One question -----
  let question: string;
  let content;
  switch (step) {
    case 'pickup':
      question = isCaregiver ? `Did the ride pick ${name} up on time?` : 'Did your ride pick you up on time?';
      content = (
        <Options
          selected={answers.pickupStatus}
          onPick={(v) => answer({ pickupStatus: v })}
          options={[
            { value: 'on_time', label: PICKUP_LABELS.on_time, icon: 'check', tone: 'good' },
            { value: 'late', label: PICKUP_LABELS.late, icon: 'clock', tone: 'late' },
            { value: 'never_came', label: PICKUP_LABELS.never_came, icon: 'x', tone: 'problem' },
          ]}
        />
      );
      break;
    case 'howLate':
      question = 'How late was the ride?';
      content = (
        <Options
          selected={answers.minutesLate}
          onPick={(v) => answer({ minutesLate: v })}
          options={([15, 30, 60] as const).map((m) => ({
            value: m,
            label: MINUTES_LATE_LABELS[m],
            icon: 'clock',
            tone: 'late',
          }))}
        />
      );
      break;
    case 'outcome':
      question = isCaregiver ? `Did ${name} make it to the appointment?` : 'Did you make it to your appointment?';
      content = (
        <Options
          selected={answers.appointmentOutcome}
          onPick={(v) => answer({ appointmentOutcome: v })}
          options={[
            { value: 'made_it', label: 'Yes, on time', icon: 'check', tone: 'good' },
            { value: 'late', label: 'Yes, but late', icon: 'clock', tone: 'late' },
            { value: 'missed', label: 'No, missed it', icon: 'x', tone: 'problem' },
          ]}
        />
      );
      break;
    case 'returnRide':
      question = 'How was the ride home?';
      content = (
        <Options
          selected={answers.returnRideStatus}
          onPick={(v) => answer({ returnRideStatus: v })}
          options={[
            { value: 'on_time', label: RETURN_LABELS.on_time, icon: 'check', tone: 'good' },
            { value: 'late', label: RETURN_LABELS.late, icon: 'clock', tone: 'late' },
            { value: 'never_came', label: RETURN_LABELS.never_came, icon: 'x', tone: 'problem' },
            { value: 'not_needed', label: "Didn't need one", icon: 'home', tone: 'neutral' },
          ]}
        />
      );
      break;
    case 'notes':
      question = 'Anything else to note?';
      content = (
        <div className="field">
          <label htmlFor="notes">Notes (optional)</label>
          <p id="notes-hint" className="field-hint">For example: "Waited 2 hours for ride home."</p>
          <textarea
            id="notes"
            rows={4}
            value={answers.notes}
            onChange={(e) => setAnswers({ ...answers, notes: e.target.value })}
            aria-describedby="notes-hint"
          />
          <button type="button" className="button-primary button-big" onClick={save}>
            Save check-in
          </button>
        </div>
      );
      break;
  }

  return (
    <Screen title={TITLE}>
      {tripLine}
      <p className="step-count">Question {steps.indexOf(step) + 1} of {steps.length}</p>
      {/* aria-live isn't needed: focus moves to this heading on each step. */}
      <h2 className="question" tabIndex={-1} ref={questionRef}>{question}</h2>
      {content}
      <button type="button" className="button-secondary" onClick={goBack}>
        Back
      </button>
      {existing && step === 'pickup' && (
        <button type="button" className="button-danger" onClick={deleteLog}>
          Delete this check-in
        </button>
      )}
    </Screen>
  );
}

/** A column of big answer buttons. The current answer is marked as pressed. */
function Options<T extends string | number>({
  options,
  selected,
  onPick,
}: {
  options: Option<T>[];
  selected: T | undefined;
  onPick(value: T): void;
}) {
  return (
    <div className="answer-list">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={`answer-button tone-${option.tone}`}
          aria-pressed={selected === option.value}
          onClick={() => onPick(option.value)}
        >
          <Icon name={option.icon} size={32} />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
