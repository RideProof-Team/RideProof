// ---------------------------------------------------------------------------
// Welcome.tsx — the first screen. The user chooses rider or caregiver and
// enters the basic information RideConnect needs. Saving it creates the
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
import { BookingWindowPicker } from '../components/BookingWindowPicker';
import { getStateRule, listStates } from '../lib/stateRules';
import { validateProfile, type ProfileErrors } from '../lib/validateProfile';
import type { MobilityNeeds, Profile, Role } from '../types';
import { MOBILITY_LABELS } from '../lib/callScript';
import { t } from '../lib/i18n';

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
    title: t('Leave without saving?'),
    message: t('Your changes to your information will be lost.'),
    confirmLabel: t('Leave without saving'),
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
      homeAddress: form.homeAddress?.trim() || undefined,
    };
    if (!cleaned.homeAddress) delete cleaned.homeAddress;
    if (!cleaned.mobilityNeeds) delete cleaned.mobilityNeeds;
    await storage.saveProfile(cleaned);
    setProfile(cleaned);
    if (!editing) navigate({ name: 'home' });
    if (editing) {
      allowLeave();
      navigate({ name: 'settings' });
      showSnackbar(t('Changes saved.'));
    }
  }

  const isCaregiver = form.role === 'caregiver';

  return (
    <Screen
      title={editing ? t('Your information') : t('Welcome to RideConnect')}
      back={editing ? { to: { name: 'settings' }, label: t('Settings') } : undefined}
    >
      {!editing && <p>{t('Keep track of your medical rides, and prove it when rides go wrong.')}</p>}
      <Disclaimer />

      {/* noValidate: we show our own friendlier error messages instead of the browser's. */}
      <form onSubmit={handleSubmit} noValidate>
        <ErrorSummary errors={Object.values(errors)} ref={errorSummaryRef} />

        {/* A fieldset + legend groups the two choices under one question. */}
        <fieldset className="choice-group">
          <legend>{t('Who is using RideConnect?')}</legend>
          {([
            ['rider', t('I am the rider'), t('I ride to my own appointments.')],
            ['caregiver', t('I help a rider'), t('I am a family member or caregiver.')],
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
          label={isCaregiver ? t("Rider's first name") : t('Your first name')}
          value={form.riderFirstName}
          error={errors.riderFirstName}
          onChange={(v) => update('riderFirstName', v)}
          autoComplete={isCaregiver ? 'off' : 'given-name'}
        />

        {isCaregiver && (
          <TextField
            id="caregiverName"
            label={t('Your first name (optional)')}
            hint={t('Used to sign letters, like “prepared with help from Maria.”')}
            value={form.caregiverName}
            onChange={(v) => update('caregiverName', v)}
            autoComplete="given-name"
          />
        )}

        <div className="field">
          <label htmlFor="state">{t('State')}</label>
          <select
            id="state"
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            aria-invalid={errors.state ? true : undefined}
            aria-describedby={errors.state ? 'state-error' : undefined}
          >
            <option value="">{t('Choose a state')}</option>
            {listStates().map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          {errors.state && <p id="state-error" className="field-error">{errors.state}</p>}
        </div>

        {/* Optional: only for states RideConnect has no rules for yet, so
            booking reminders can still work. (Settings has it for everyone.) */}
        {!editing && form.state && !getStateRule(form.state) && (
          <fieldset className="choice-group optional-step">
            <legend>{t('Booking reminders (optional)')}</legend>
            <BookingWindowPicker
              id="setup-booking-window"
              profile={form}
              onChange={(value) => update('riderBookingWindow', value)}
            />
            <p className="field-hint">{t('You can skip this and set it later in Settings.')}</p>
          </fieldset>
        )}

        <TextField
          id="rideCompanyName"
          label={t('Ride company name')}
          hint={t('The company that schedules your Medicaid rides.')}
          value={form.rideCompanyName}
          error={errors.rideCompanyName}
          onChange={(v) => update('rideCompanyName', v)}
        />

        <TextField
          id="rideCompanyPhone"
          label={t('Ride company phone number')}
          type="tel"
          value={form.rideCompanyPhone}
          error={errors.rideCompanyPhone}
          onChange={(v) => update('rideCompanyPhone', v)}
        />

        <TextField
          id="healthPlanName"
          label={t('Health plan name (optional)')}
          value={form.healthPlanName}
          onChange={(v) => update('healthPlanName', v)}
        />

        <fieldset className="choice-group optional-step">
          <legend>{t('For booking calls (optional)')}</legend>
          <p className="field-hint">
            {t('RideConnect uses these in the “What to say” script when you call to book. Leave them blank to fill in during the call.')}
          </p>
          <div className="field">
            <label htmlFor="mobilityNeeds">{isCaregiver ? t("The rider's mobility needs") : t('Your mobility needs')}</label>
            <select
              id="mobilityNeeds"
              value={form.mobilityNeeds ?? ''}
              onChange={(e) => update('mobilityNeeds', (e.target.value || undefined) as MobilityNeeds | undefined)}
            >
              <option value="">{t('Not sure / skip')}</option>
              {(Object.keys(MOBILITY_LABELS) as MobilityNeeds[]).map((need) => (
                <option key={need} value={need}>{t(MOBILITY_LABELS[need])}</option>
              ))}
            </select>
          </div>
          <TextField
            id="homeAddress"
            label={t('Pickup address (optional)')}
            hint={t('Usually home. Saved only on this device.')}
            value={form.homeAddress ?? ''}
            onChange={(v) => update('homeAddress', v)}
            autoComplete={isCaregiver ? 'off' : 'street-address'}
          />
        </fieldset>

        <p className="privacy-note">
          {t('Your information stays on this device. RideConnect never sends it anywhere.')}
        </p>

        <button type="submit" className="button-primary" disabled={saving}>
          {saving ? t('Saving…') : editing ? t('Save changes') : t('Save and continue')}
        </button>
        {!editing && (
          <div className="restore-box">
            <p>{t('Moving from another phone?')}</p>
            <RestoreButton label={t('Restore a RideConnect backup')} />
          </div>
        )}
        {editing && <a href="#/settings" className="button-secondary">{t('Cancel')}</a>}
      </form>
    </Screen>
  );
}
