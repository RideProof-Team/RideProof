// ---------------------------------------------------------------------------
// Welcome.tsx — the first screen. The user chooses rider or caregiver and
// enters the basic information RideProof needs. Saving it creates the
// profile, and the app moves on to the Home screen.
//
// The same form is reused from Settings ("Edit your information"): with
// `editing` set, it starts filled in and returns to Settings when saved.
// ---------------------------------------------------------------------------
import { useRef, useState, type FormEvent } from 'react';
import { useApp } from '../AppContext';
import { Screen } from '../components/Screen';
import { RestoreButton } from '../components/BackupControls';
import { Disclaimer } from '../components/Disclaimer';
import { ErrorSummary, TextField } from '../components/FormFields';
import { showSnackbar } from '../lib/feedback';
import { allowLeave, navigate, useLeaveWarning } from '../lib/router';
import { listStates } from '../lib/stateRules';
import { validateProfile, type ProfileErrors } from '../lib/validateProfile';
import type { Profile, Role } from '../types';

const EMPTY_PROFILE: Profile = {
  role: 'rider',
  riderFirstName: '',
  caregiverName: '',
  state: '',
  rideCompanyName: '',
  rideCompanyPhone: '',
  healthPlanName: '',
};

export function Welcome({ editing = false }: { editing?: boolean }) {
  const { storage, setProfile, profile } = useApp();
  const [form, setForm] = useState<Profile>(editing && profile ? profile : EMPTY_PROFILE);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  useLeaveWarning(editing && JSON.stringify(form) !== JSON.stringify(profile), {
    title: 'Leave without saving?',
    message: 'Your changes to your information will be lost.',
    confirmLabel: 'Leave without saving',
  });

  // One helper to update any single field of the form.
  function update<K extends keyof Profile>(field: K, value: Profile[K]) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    // Stop the browser's default behavior of reloading the page on submit.
    event.preventDefault();
    const problems = validateProfile(form);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      // Move focus to the error list so screen reader users hear it.
      // setTimeout waits until React has drawn the list on screen.
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }
    setSaving(true);
    const cleaned: Profile = {
      ...form,
      riderFirstName: form.riderFirstName.trim(),
      caregiverName: form.role === 'caregiver' ? form.caregiverName.trim() : '',
      rideCompanyName: form.rideCompanyName.trim(),
      rideCompanyPhone: form.rideCompanyPhone.trim(),
      healthPlanName: form.healthPlanName.trim(),
    };
    await storage.saveProfile(cleaned);
    setProfile(cleaned);
    if (editing) {
      allowLeave();
      navigate({ name: 'settings' });
      showSnackbar('Changes saved.');
    }
  }

  const isCaregiver = form.role === 'caregiver';

  return (
    <Screen
      title={editing ? 'Your information' : 'Welcome to RideProof'}
      back={editing ? { to: { name: 'settings' }, label: 'Settings' } : undefined}
    >
      {!editing && <p>Keep track of your medical rides, and prove it when rides go wrong.</p>}
      <Disclaimer />

      {/* noValidate: we show our own friendlier error messages instead of the browser's. */}
      <form onSubmit={handleSubmit} noValidate>
        <ErrorSummary errors={Object.values(errors)} ref={errorSummaryRef} />

        {/* A fieldset + legend groups the two choices under one question. */}
        <fieldset className="choice-group">
          <legend>Who is using RideProof?</legend>
          {([
            ['rider', 'I am the rider', 'I ride to my own appointments.'],
            ['caregiver', 'I help a rider', 'I am a family member or caregiver.'],
          ] as [Role, string, string][]).map(([value, label, hint]) => (
            <label key={value} className="choice-card">
              <input
                type="radio"
                name="role"
                value={value}
                checked={form.role === value}
                onChange={() => update('role', value)}
              />
              <span>
                <span className="choice-label">{label}</span>
                <span className="choice-hint">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <TextField
          id="riderFirstName"
          label={isCaregiver ? "Rider's first name" : 'Your first name'}
          value={form.riderFirstName}
          error={errors.riderFirstName}
          onChange={(v) => update('riderFirstName', v)}
          autoComplete={isCaregiver ? 'off' : 'given-name'}
        />

        {isCaregiver && (
          <TextField
            id="caregiverName"
            label="Your first name (optional)"
            hint="Used to sign letters, like “prepared with help from Maria.”"
            value={form.caregiverName}
            onChange={(v) => update('caregiverName', v)}
            autoComplete="given-name"
          />
        )}

        <div className="field">
          <label htmlFor="state">State</label>
          <select
            id="state"
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            aria-invalid={errors.state ? true : undefined}
            aria-describedby={errors.state ? 'state-error' : undefined}
          >
            <option value="">Choose a state</option>
            {listStates().map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          {errors.state && <p id="state-error" className="field-error">{errors.state}</p>}
        </div>

        <TextField
          id="rideCompanyName"
          label="Ride company name"
          hint="The company that schedules your Medicaid rides."
          value={form.rideCompanyName}
          error={errors.rideCompanyName}
          onChange={(v) => update('rideCompanyName', v)}
        />

        <TextField
          id="rideCompanyPhone"
          label="Ride company phone number"
          type="tel"
          value={form.rideCompanyPhone}
          error={errors.rideCompanyPhone}
          onChange={(v) => update('rideCompanyPhone', v)}
        />

        <TextField
          id="healthPlanName"
          label="Health plan name (optional)"
          value={form.healthPlanName}
          onChange={(v) => update('healthPlanName', v)}
        />

        <p className="privacy-note">
          Your information stays on this device. RideProof never sends it anywhere.
        </p>

        <button type="submit" className="button-primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Save and continue'}
        </button>
        {!editing && (
          <div className="restore-box">
            <p>Moving from another phone?</p>
            <RestoreButton label="Restore a RideProof backup" />
          </div>
        )}
        {editing && <a href="#/settings" className="button-secondary">Cancel</a>}
      </form>
    </Screen>
  );
}
