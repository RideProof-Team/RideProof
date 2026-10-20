// ---------------------------------------------------------------------------
// AppointmentForm.tsx — add a new appointment or edit an existing one.
// The same screen does both: if it's given an id, it loads that
// appointment and shows "Edit"; otherwise it starts blank.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../AppContext';
import { Screen } from '../components/Screen';
import { ErrorSummary, TextField } from '../components/FormFields';
import { APPOINTMENT_TYPE_LABELS, WEEKDAY_NAMES, WEEKDAY_SHORT, WEEKDAYS_IN_ORDER } from '../lib/labels';
import { askConfirm, showSnackbar } from '../lib/feedback';
import { allowLeave, navigate, useLeaveWarning } from '../lib/router';
import { newId } from '../lib/storage';
import { validateAppointment, type AppointmentErrors } from '../lib/validateAppointment';
import { weekdayOf } from '../lib/dates';
import type { Appointment, AppointmentType, Weekday } from '../types';

const BACK = { to: { name: 'appointments' } as const, label: 'Schedule' };

const TYPES = Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[];

function blankAppointment(today: string): Appointment {
  return {
    id: newId(),
    date: today,
    time: '09:00',
    clinicName: '',
    clinicAddress: '',
    type: 'checkup',
    recurrence: { kind: 'none' },
    rideBooked: false,
    confirmationNumber: '',
  };
}

export function AppointmentForm({ id }: { id?: string }) {
  const { storage, today, refreshAll } = useApp();
  // undefined = still loading; null = an id was given but not found.
  const [form, setForm] = useState<Appointment | null | undefined>(id ? undefined : () => blankAppointment(today));
  // A text copy of the form as it started, to tell if anything was changed.
  const [startedAs, setStartedAs] = useState<string | null>(null);
  if (form && startedAs === null) setStartedAs(JSON.stringify(form));
  const changed = Boolean(form) && startedAs !== null && JSON.stringify(form) !== startedAs;
  useLeaveWarning(changed, {
    title: 'Leave without saving?',
    message: 'Your changes to this appointment will be lost.',
    confirmLabel: 'Leave without saving',
  });
  const [errors, setErrors] = useState<AppointmentErrors>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const isEditing = Boolean(id);
  const title = isEditing ? 'Edit appointment' : 'Add appointment';

  // When editing, load the saved appointment.
  useEffect(() => {
    if (!id) return;
    storage.listAppointments().then((all) => setForm(all.find((a) => a.id === id) ?? null));
  }, [id, storage]);

  if (form === undefined) return <Screen title={title} back={BACK}><p>Loading…</p></Screen>;
  if (form === null) {
    return (
      <Screen title={title} back={BACK}>
        <p>Sorry, that appointment wasn't found. It may have been deleted.</p>
      </Screen>
    );
  }
  // From here on TypeScript knows `form` is a real Appointment.
  const appt = form;

  function update<K extends keyof Appointment>(field: K, value: Appointment[K]) {
    setForm({ ...appt, [field]: value });
  }

  function setRepeats(repeats: boolean) {
    // When switching to "repeats", pre-check the weekday of the chosen date.
    update(
      'recurrence',
      repeats ? { kind: 'weekly', weekdays: appt.date ? [weekdayOf(appt.date) as Weekday] : [] } : { kind: 'none' },
    );
  }

  function toggleWeekday(day: Weekday) {
    if (appt.recurrence.kind !== 'weekly') return;
    const current = appt.recurrence.weekdays;
    const weekdays = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    update('recurrence', { kind: 'weekly', weekdays });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problems = validateAppointment(appt);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }
    await storage.saveAppointment({
      ...appt,
      clinicName: appt.clinicName.trim(),
      clinicAddress: appt.clinicAddress.trim(),
      // A confirmation number only makes sense if the ride is booked.
      confirmationNumber: appt.rideBooked ? appt.confirmationNumber.trim() : '',
    });
    allowLeave(); // it's saved, so no "unsaved changes" warning
    navigate({ name: 'appointments' });
    showSnackbar(isEditing ? 'Changes saved.' : 'Appointment added.');
  }

  async function handleDelete() {
    const ok = await askConfirm({
      title: 'Delete this appointment?',
      message: 'Rides you already logged for it will be kept in your history.',
      confirmLabel: 'Delete appointment',
      danger: true,
    });
    if (!ok) return;
    // Keep a copy of the saved version so "Undo" can put it back.
    const saved = (await storage.listAppointments()).find((a) => a.id === appt.id);
    await storage.deleteAppointment(appt.id);
    allowLeave();
    navigate({ name: 'appointments' });
    showSnackbar('Appointment deleted.', saved && {
      label: 'Undo',
      run: async () => {
        await storage.saveAppointment(saved);
        refreshAll();
      },
    });
  }

  const repeats = appt.recurrence.kind === 'weekly';

  return (
    <Screen title={title} back={BACK}>

      <form onSubmit={handleSubmit} noValidate>
        <ErrorSummary errors={Object.values(errors)} ref={errorSummaryRef} />

        <fieldset className="choice-group">
          <legend>What kind of appointment?</legend>
          <div className="chip-row">
            {TYPES.map((type) => (
              <label key={type} className="chip">
                <input
                  type="radio"
                  name="type"
                  checked={appt.type === type}
                  onChange={() => update('type', type)}
                />
                <span>{APPOINTMENT_TYPE_LABELS[type]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          id="clinicName"
          label="Clinic name"
          value={appt.clinicName}
          error={errors.clinicName}
          onChange={(v) => update('clinicName', v)}
        />
        <TextField
          id="clinicAddress"
          label="Clinic address (optional)"
          value={appt.clinicAddress}
          onChange={(v) => update('clinicAddress', v)}
        />

        <fieldset className="choice-group">
          <legend>How often?</legend>
          <label className="choice-card">
            <input type="radio" name="repeats" checked={!repeats} onChange={() => setRepeats(false)} />
            <span className="choice-label">Just once</span>
          </label>
          <label className="choice-card">
            <input type="radio" name="repeats" checked={repeats} onChange={() => setRepeats(true)} />
            <span className="choice-label">Every week on certain days</span>
          </label>
        </fieldset>

        <TextField
          id="date"
          type="date"
          label={repeats ? 'Starting on' : 'Date'}
          value={appt.date}
          error={errors.date}
          onChange={(v) => update('date', v)}
        />

        {appt.recurrence.kind === 'weekly' && (
          <fieldset
            className="choice-group"
            aria-describedby={errors.weekdays ? 'weekdays-error' : undefined}
          >
            <legend>Which days?</legend>
            <div className="chip-row">
              {WEEKDAYS_IN_ORDER.map((day) => (
                <label key={day} className="chip">
                  <input
                    type="checkbox"
                    checked={appt.recurrence.kind === 'weekly' && appt.recurrence.weekdays.includes(day)}
                    onChange={() => toggleWeekday(day)}
                    // The screen shows "Mon", but screen readers say "Monday".
                    aria-label={WEEKDAY_NAMES[day]}
                  />
                  <span aria-hidden="true">{WEEKDAY_SHORT[day]}</span>
                </label>
              ))}
            </div>
            {errors.weekdays && <p id="weekdays-error" className="field-error">{errors.weekdays}</p>}
          </fieldset>
        )}

        <TextField
          id="time"
          type="time"
          label="Appointment time"
          value={appt.time}
          error={errors.time}
          onChange={(v) => update('time', v)}
        />

        <fieldset className="choice-group">
          <legend>Is the ride booked?</legend>
          {repeats && (
            <p className="field-hint">For repeating appointments, choose "Yes" if a standing ride order is set up.</p>
          )}
          <div className="chip-row">
            <label className="chip">
              <input type="radio" name="booked" checked={appt.rideBooked} onChange={() => update('rideBooked', true)} />
              <span>Yes</span>
            </label>
            <label className="chip">
              <input type="radio" name="booked" checked={!appt.rideBooked} onChange={() => update('rideBooked', false)} />
              <span>Not yet</span>
            </label>
          </div>
        </fieldset>

        {appt.rideBooked && (
          <TextField
            id="confirmationNumber"
            label="Confirmation number (optional)"
            hint="The number the ride company gave you when you booked."
            value={appt.confirmationNumber}
            onChange={(v) => update('confirmationNumber', v)}
          />
        )}

        <button type="submit" className="button-primary">Save appointment</button>
        {isEditing && (
          <button type="button" className="button-danger" onClick={handleDelete}>
            Delete appointment
          </button>
        )}
        <a href="#/appointments" className="button-secondary">Cancel</a>
      </form>
    </Screen>
  );
}
