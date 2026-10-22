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
import { motionAllowed } from '../lib/motion';
import { capitalize, formatLongDate, formatTime } from '../lib/dates';
import { msg, t, tn, tx } from '../lib/i18n';
import {
  APPOINTMENT_TYPE_LABELS,
  MINUTES_LATE_LABELS,
  PICKUP_LABELS,
  RETURN_LABELS,
} from '../lib/labels';
import { tripsBetween } from '../lib/recurrence';
import { prefillFromWaits } from '../lib/waitTimer';
import { askConfirm, showSnackbar } from '../lib/feedback';
import { allowLeave, navigate, routeToHash, useLeaveWarning } from '../lib/router';
import { newId } from '../lib/storage';
import { useRideData } from '../lib/useRideData';
import type { ActiveWait, AppointmentType, Profile, RideLog } from '../types';

/** The details of the trip being checked in on. */
interface TripInfo {
  appointmentId: string;
  clinicName: string;
  appointmentType: AppointmentType;
  time: string | null;
  date: string;
}

const TITLE = msg('Ride check-in');
const BACK_LABEL = msg('Home');
const back = () => ({ to: { name: 'home' } as const, label: t(BACK_LABEL) });

export function CheckIn({ appointmentId, date }: { appointmentId?: string; date?: string }) {
  const { today, profile } = useApp();
  const { data } = useRideData();

  if (!data || !profile) return <Screen title={t(TITLE)} back={back()}><p>{t('Loading…')}</p></Screen>;
  const { appointments, rideLogs, waits } = data;
  // Finished "Where's my ride?" timers for a trip: they fill in the answers.
  const timersFor = (id: string, tripDate: string) =>
    waits.filter((w) => w.appointmentId === id && w.tripDate === tripDate && w.finishedAt);

  // --- A specific trip was named in the address ---
  if (appointmentId && date) {
    const appointment = appointments.find((a) => a.id === appointmentId);
    const existing = findLog(rideLogs, appointmentId, date);
    // If the appointment was deleted, we can still edit its log using the
    // clinic details copied into the log.
    const source = appointment ?? existing;
    if (!source) {
      return (
        <Screen title={t(TITLE)} back={back()}>
          <p>{t("Sorry, that ride wasn't found.")}</p>
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
    return (
      <Questions
        key={`${appointmentId}-${date}`}
        trip={trip}
        existing={existing}
        profile={profile}
        timers={timersFor(appointmentId, date)}
        isToday={date === today}
      />
    );
  }

  // --- No trip named: use today's ---
  const todaysTrips = tripsBetween(appointments, today, today);
  if (todaysTrips.length === 1) {
    const only = todaysTrips[0];
    const trip: TripInfo = {
      appointmentId: only.appointment.id,
      clinicName: only.appointment.clinicName,
      appointmentType: only.appointment.type,
      time: only.appointment.time,
      date: only.date,
    };
    return (
      <Questions
        trip={trip}
        existing={findLog(rideLogs, only.appointment.id, only.date)}
        profile={profile}
        timers={timersFor(only.appointment.id, only.date)}
        isToday
      />
    );
  }

  // Zero or several trips today: let the user choose.
  const choices = todaysTrips.length > 1 ? todaysTrips : tripsNeedingCheckIn(appointments, rideLogs, today);
  return (
    <Screen title={t(TITLE)} back={back()}>
      <p>
        {todaysTrips.length > 1
          ? t('There is more than one appointment today. Which ride do you want to check in on?')
          : t('There is no appointment today.')}
      </p>
      {todaysTrips.length === 0 && choices.length > 0 && <h2>{t('Recent rides with no check-in')}</h2>}
      <ul className="card-list">
        {choices.map((choice) => (
          <li key={`${choice.appointment.id}-${choice.date}`}>
            <a
              className="card card-link"
              href={routeToHash({ name: 'checkin', appointmentId: choice.appointment.id, date: choice.date })}
            >
              <span className="card-title">{capitalize(formatLongDate(choice.date))}, {formatTime(choice.appointment.time)}</span>
              <span className="card-detail">
                {t('{type} at {clinic}', { type: t(APPOINTMENT_TYPE_LABELS[choice.appointment.type]), clinic: choice.appointment.clinicName })}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {todaysTrips.length === 0 && choices.length === 0 && (
        <p>{t('There are no recent rides to check in on.')}</p>
      )}
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

interface QuestionsProps {
  trip: TripInfo;
  existing?: RideLog;
  profile: Profile;
  /** Finished wait timers for this trip. */
  timers: ActiveWait[];
  isToday: boolean;
}

function Questions({ trip, existing, profile, timers, isToday }: QuestionsProps) {
  const { storage, mode, refreshAll } = useApp();
  // Answers from the wait timer(s), laid over any earlier check-in. The
  // rider sees them already chosen and can still change any of them.
  const prefill = prefillFromWaits(timers);
  const startingAnswers: Answers = { ...(existing ? answersFromLog(existing) : { notes: '' }), ...prefill };
  // If this trip was already logged, start with the old answers so they can be changed.
  const [answers, setAnswers] = useState<Answers>(startingAnswers);
  const [step, setStep] = useState<Step>('pickup');
  // Which way the questions slide: forward (from the right) or back (from the left).
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  // The answer just tapped, shown "popping" for a moment before moving on.
  const [picked, setPicked] = useState<string | null>(null);
  const [saved, setSaved] = useState<RideLog | null>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Warn before leaving a check-in that was started but not saved.
  // Compared with what the screen started with (including timer answers,
  // which are already saved in the timer, so leaving doesn't lose them).
  const original = JSON.stringify(startingAnswers);
  useLeaveWarning(!saved && JSON.stringify(answers) !== original, {
    title: t('Leave without saving?'),
    message: t('This check-in is not saved yet. Your answers will be lost.'),
    confirmLabel: t('Leave without saving'),
  });

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
    if (picked) return; // ignore extra taps while the next question is coming
    const moveOn = () => {
      setPicked(null);
      const updated = { ...answers, ...change };
      setAnswers(updated);
      const next = nextStep(step, updated);
      setDirection('forward');
      if (next !== 'done') setStep(next);
    };
    if (motionAllowed()) {
      // Show the tapped answer "pop" for 0.2 seconds, so it's clear the tap
      // counted, then slide in the next question.
      setPicked(String(Object.values(change)[0]));
      setTimeout(moveOn, 200);
    } else {
      moveOn();
    }
  }

  function goBack() {
    const previous = previousStep(step, answers);
    if (previous) {
      setDirection('back');
      setStep(previous);
    }
  }

  const hasPickupTimer = timers.some((timer) => timer.leg === 'pickup');

  function notHomeYet() {
    allowLeave();
    navigate({ name: 'home' });
    showSnackbar(t('Your pickup time is saved. When you\'re waiting to go home, tap "I\'m waiting for my ride home".'));
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
    // The timers' minutes are now part of the ride log, so clear them.
    for (const timer of timers) await storage.deleteWait(timer.id);
    allowLeave();
    setSaved(log);
  }

  async function deleteLog() {
    if (!existing) return;
    const ok = await askConfirm({
      title: t('Delete this check-in?'),
      message: t('Your record of the ride on {date} will be removed.', { date: formatLongDate(existing.rideDate) }),
      confirmLabel: t('Delete check-in'),
      danger: true,
    });
    if (!ok) return;
    await storage.deleteRideLog(existing.id);
    allowLeave();
    navigate({ name: 'history' });
    showSnackbar(t('Check-in deleted.'), {
      label: t('Undo'),
      run: async () => {
        await storage.saveRideLog(existing);
        refreshAll();
      },
    });
  }

  const tripLine = (
    <p className="trip-line">
      {t('{type} at {clinic}', { type: t(APPOINTMENT_TYPE_LABELS[trip.appointmentType]), clinic: trip.clinicName })}
      <br />
      {capitalize(formatLongDate(trip.date))}
      {trip.time && `, ${formatTime(trip.time)}`}
    </p>
  );

  // ----- Finished -----
  if (saved) {
    const hadProblem =
      saved.pickupStatus !== 'on_time' || saved.appointmentOutcome !== 'made_it' ||
      saved.returnRideStatus === 'late' || saved.returnRideStatus === 'never_came';
    return (
      <Screen title={t(TITLE)} back={back()}>
        {tripLine}
        <div className="done-box" role="status">
          <SavedCheck />
          <h2 tabIndex={-1} ref={questionRef}>{t('Saved')}</h2>
        </div>
        <p>
          {hadProblem
            ? t('This ride had a problem. It is saved with the date and time, so you can use it as proof.')
            : t('Great — this ride went well. It is saved in your history.')}
        </p>
        <a href="#/home" className="button-primary">{t('Back to Home')}</a>
        <a href="#/history" className="button-secondary">{t('See ride history')}</a>
      </Screen>
    );
  }

  // ----- One question -----
  let question: string;
  let content;
  switch (step) {
    case 'pickup':
      question = isCaregiver ? t('Did the ride pick {name} up on time?', { name }) : t('Did your ride pick you up on time?');
      content = (
        <Options
          picked={picked}
          selected={answers.pickupStatus}
          onPick={(v) => answer({ pickupStatus: v })}
          options={[
            { value: 'on_time', label: t(PICKUP_LABELS.on_time), icon: 'check', tone: 'good' },
            { value: 'late', label: t(PICKUP_LABELS.late), icon: 'clock', tone: 'late' },
            { value: 'never_came', label: t(PICKUP_LABELS.never_came), icon: 'x', tone: 'problem' },
          ]}
        />
      );
      break;
    case 'howLate':
      question = t('How late was the ride?');
      content = (
        <Options
          picked={picked}
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
      question = isCaregiver ? t('Did {name} make it to the appointment?', { name }) : t('Did you make it to your appointment?');
      content = (
        <Options
          picked={picked}
          selected={answers.appointmentOutcome}
          onPick={(v) => answer({ appointmentOutcome: v })}
          options={[
            { value: 'made_it', label: t('Yes, on time'), icon: 'check', tone: 'good' },
            { value: 'late', label: t('Yes, but late'), icon: 'clock', tone: 'late' },
            { value: 'missed', label: t('No, missed it'), icon: 'x', tone: 'problem' },
          ]}
        />
      );
      break;
    case 'returnRide':
      question = t('How was the ride home?');
      content = (
        <Options
          picked={picked}
          selected={answers.returnRideStatus}
          onPick={(v) => answer({ returnRideStatus: v })}
          options={[
            { value: 'on_time', label: t(RETURN_LABELS.on_time), icon: 'check', tone: 'good' },
            { value: 'late', label: t(RETURN_LABELS.late), icon: 'clock', tone: 'late' },
            { value: 'never_came', label: t(RETURN_LABELS.never_came), icon: 'x', tone: 'problem' },
            { value: 'not_needed', label: t("Didn't need one"), icon: 'home', tone: 'neutral' },
          ]}
        />
      );
      // Came from the pickup timer and still at the clinic? Nothing is lost
      // by stopping here: the pickup timer's result stays saved for later.
      if (isToday && hasPickupTimer && !answers.returnRideStatus) {
        content = (
          <>
            {content}
            <button type="button" className="link-button" onClick={notHomeYet}>
              {t("I'm not home yet — finish this later")}
            </button>
          </>
        );
      }
      break;
    case 'returnHowLate':
      question = t('How late was the ride home?');
      content = (
        <Options
          picked={picked}
          selected={answers.returnMinutesLate}
          onPick={(v) => answer({ returnMinutesLate: v })}
          options={([15, 30, 60] as const).map((m) => ({
            value: m,
            label: MINUTES_LATE_LABELS[m],
            icon: 'clock',
            tone: 'late',
          }))}
        />
      );
      break;
    case 'notes':
      question = t('Anything else to note?');
      content = (
        <div className="field">
          <label htmlFor="notes">{t('Notes (optional)')}</label>
          <p id="notes-hint" className="field-hint">{t('For example: "Waited 2 hours for ride home."')}</p>
          <textarea
            id="notes"
            rows={4}
            value={answers.notes}
            onChange={(e) => setAnswers({ ...answers, notes: e.target.value })}
            aria-describedby="notes-hint"
          />
          <details className="time-details" open={Boolean(answers.scheduledPickup || answers.actualPickup)}>
            <summary>{t('Add pickup times (optional, makes a stronger record)')}</summary>
            <TimeBox
              id="scheduledPickup"
              label={t('Pickup time you were given')}
              value={answers.scheduledPickup}
              onChange={(v) => setAnswers({ ...answers, scheduledPickup: v })}
            />
            {answers.pickupStatus !== 'never_came' && (
              <TimeBox
                id="actualPickup"
                label={t('Time the driver actually came')}
                value={answers.actualPickup}
                onChange={(v) => setAnswers({ ...answers, actualPickup: v })}
              />
            )}
          </details>
          <button type="button" className="button-primary button-big" onClick={save}>
            {t('Save check-in')}
          </button>
        </div>
      );
      break;
  }

  return (
    <Screen title={t(TITLE)} back={back()}>
      {tripLine}
      {timers.length > 0 && <TimerNote timers={timers} />}
      {/* key={step}: a new question is a new "page", so its slide-in animation plays. */}
      <div key={step} className={direction === 'back' ? 'step-back' : 'step-forward'}>
        <p className="step-count">{t('Question {n} of {total}', { n: steps.indexOf(step) + 1, total: steps.length })}</p>
        {/* aria-live isn't needed: focus moves to this heading on each step. */}
        <h2 className="question" tabIndex={-1} ref={questionRef}>{question}</h2>
        {content}
      </div>
      {steps.indexOf(step) > 0 && (
        <button type="button" className="button-secondary" onClick={goBack}>
          {t('Previous question')}
        </button>
      )}
      {existing && step === 'pickup' && (
        <button type="button" className="button-danger" onClick={deleteLog}>
          {t('Delete this check-in')}
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
  picked,
}: {
  options: Option<T>[];
  selected: T | undefined;
  onPick(value: T): void;
  /** The answer just tapped (while it "pops", before the next question). */
  picked: string | null;
}) {
  return (
    <div className="answer-list">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={`answer-button tone-${option.tone}${picked === String(option.value) ? ' just-picked' : ''}`}
          aria-pressed={picked !== null ? picked === String(option.value) : selected === option.value}
          onClick={() => onPick(option.value)}
        >
          <Icon name={option.icon} size={32} />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

/** A labeled time picker. An empty box means "not filled in". */
function TimeBox({ id, label, value, onChange }: { id: string; label: string; value?: string; onChange(v: string): void }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="time" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** The big "Saved" check mark. motion.css makes it draw itself in. */
function SavedCheck() {
  return (
    <svg className="saved-check" width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
      <circle cx="28" cy="28" r="26" />
      <path d="M17 29l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "From your ride timer: the driver came 23 minutes late." */
function TimerNote({ timers }: { timers: ActiveWait[] }) {
  return (
    <div className="timer-note">
      <Icon name="clock" />
      <div>
        <p>{tx('{bold} (already chosen below; you can change them):', { bold: <strong>{t('From your ride timer')}</strong> })}</p>
        <ul>
          {timers.map((timer) => (
            <li key={timer.id}>
              {timer.leg === 'pickup' ? t('Pickup') : t('Ride home')}:{' '}
              {timer.result === 'never_came'
                ? tn(timer.finalMinutesLate ?? 0, 'never came (you waited {n} minute)', 'never came (you waited {n} minutes)')
                : timer.finalMinutesLate
                  ? tn(timer.finalMinutesLate, '{n} minute late', '{n} minutes late')
                  : t('on time')}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
