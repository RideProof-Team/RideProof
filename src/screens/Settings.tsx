// ---------------------------------------------------------------------------
// Settings.tsx — change your information, notifications, delete all data,
// and information about the app.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { BackupButton, RestoreButton } from '../components/BackupControls';
import { useApp } from '../AppContext';
import { Disclaimer } from '../components/Disclaimer';
import { Screen } from '../components/Screen';
import { askNotificationPermission, clearSentNotifications, notificationPermission } from '../lib/notifications';
import { saveLastBackupDate } from '../lib/backup';
import { resetOnboarding } from '../lib/onboarding';
import { askConfirm } from '../lib/feedback';
import { requestPersistentStorage, type PersistState } from '../lib/persist';
import { loadMotion, saveMotion, systemReducesMotion, type MotionChoice } from '../lib/motion';
import { loadTheme, saveTheme, type ThemeChoice } from '../lib/theme';
import { LanguageChoice } from '../components/LanguageSwitch';
import { navigate, routeToHash } from '../lib/router';
import { BookingWindowPicker } from '../components/BookingWindowPicker';
import { showSnackbar } from '../lib/feedback';
import { stateName } from '../lib/stateRules';
import type { RiderBookingWindow } from '../types';
import { createStorage } from '../lib/storage';

const APP_VERSION = '1.0.0';

const PERMISSION_TEXT = {
  granted: 'On. Reminders are also sent as notifications when RideConnect is open.',
  denied: 'Blocked. To turn them on, allow notifications for RideConnect in your phone or browser settings.',
  default: 'Off. Reminders still show on the Home screen.',
  unsupported: 'This browser does not support notifications. Reminders still show on the Home screen.',
};

export function Settings() {
  const { profile, mode, setProfile, toggleDemo, storage } = useApp();
  const [permission, setPermission] = useState(notificationPermission);
  const [deleting, setDeleting] = useState(false);
  const [persist, setPersist] = useState<PersistState | null>(null);
  const [theme, setTheme] = useState<ThemeChoice>(loadTheme);
  const [motion, setMotion] = useState<MotionChoice>(loadMotion);
  useEffect(() => {
    requestPersistentStorage().then(setPersist);
  }, []);
  if (!profile) return null;
  const isDemo = mode === 'demo';

  async function deleteEverything() {
    const ok = await askConfirm({
      title: 'Delete all your data?',
      message:
        'This erases your information, appointments, and ride history from this device. It cannot be undone. ' +
        'Save a backup first if you might want it later.',
      confirmLabel: 'Yes, delete everything',
      cancelLabel: 'Keep my data',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    // Erase the real database, the demo database, and the small notes kept
    // in localStorage. Each mode's storage only clears its own database.
    await createStorage('real').clearAll();
    await createStorage('demo').clearAll();
    clearSentNotifications('real');
    clearSentNotifications('demo');
    saveLastBackupDate(null);
    resetOnboarding();
    setProfile(undefined);
    navigate({ name: 'home' }); // with no profile, this shows the Welcome screen
  }

  // Save the booking window right away (no separate Save button needed).
  async function saveBookingWindow(value: RiderBookingWindow | undefined) {
    const updated = { ...profile!, riderBookingWindow: value };
    await storage.saveProfile(updated);
    setProfile(updated);
    showSnackbar('Booking reminder setting saved.');
  }

  return (
    <Screen title="Settings" back={{ to: { name: 'help' }, label: 'Help' }}>
      <section className="card" aria-labelledby="info-heading">
        <h2 id="info-heading">Your information</h2>
        <dl className="summary-list">
          <dt>{profile.role === 'caregiver' ? 'Rider (you help them)' : 'Rider'}</dt>
          <dd>{profile.riderFirstName}</dd>
          <dt>State</dt>
          <dd>{stateName(profile.state)}</dd>
          <dt>Ride company</dt>
          <dd>{profile.rideCompanyName}, {profile.rideCompanyPhone}</dd>
          {profile.healthPlanName && (
            <>
              <dt>Health plan</dt>
              <dd>{profile.healthPlanName}</dd>
            </>
          )}
        </dl>
        <a href={routeToHash({ name: 'profile-edit' })} className="button-secondary">Edit your information</a>
      </section>

      <section className="card" aria-labelledby="booking-heading">
        <h2 id="booking-heading">Booking reminders</h2>
        {isDemo && <p className="field-hint">In demo mode this changes the sample data only.</p>}
        <BookingWindowPicker id="settings-booking-window" profile={profile} onChange={saveBookingWindow} />
      </section>

      <section className="card" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">Appearance</h2>
        <LanguageChoice />
        <fieldset className="choice-group">
          <legend className="visually-hidden">Light or dark colors</legend>
          <div className="chip-row">
            {([
              ['auto', 'Match my phone'],
              ['light', 'Light'],
              ['dark', 'Dark'],
            ] as [ThemeChoice, string][]).map(([value, label]) => (
              <label key={value} className="chip">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === value}
                  onChange={() => {
                    setTheme(value);
                    saveTheme(value);
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="choice-group">
          <legend>Animations</legend>
          <div className="chip-row">
            {([
              ['on', 'On'],
              ['off', 'Off'],
            ] as [MotionChoice, string][]).map(([value, label]) => (
              <label key={value} className="chip">
                <input
                  type="radio"
                  name="motion"
                  checked={motion === value}
                  onChange={() => {
                    setMotion(value);
                    saveMotion(value);
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="field-hint">
            {systemReducesMotion()
              ? 'Your phone is set to reduce motion, so animations are already off.'
              : 'Turn animations off if moving things on screen are distracting or make you feel dizzy.'}
          </p>
        </fieldset>
      </section>

      <section className="card" aria-labelledby="notify-heading">
        <h2 id="notify-heading">Reminder notifications</h2>
        <p>{PERMISSION_TEXT[permission]}</p>
        {permission === 'default' && (
          <button
            type="button"
            className="button-secondary"
            onClick={async () => setPermission(await askNotificationPermission())}
          >
            Turn on notifications
          </button>
        )}
        <p className="field-hint">
          On iPhone, notifications only work after you add RideConnect to your Home Screen (see Help).
        </p>
      </section>

      <section className="card" aria-labelledby="backup-heading">
        <h2 id="backup-heading">Back up your records</h2>
        {isDemo ? (
          <p>Backups are turned off in demo mode. Exit demo mode to back up your own data.</p>
        ) : (
          <>
            <p>
              Your records are saved only on this phone. Save a backup file and keep it somewhere safe (for example,
              email it to yourself). If you get a new phone, you can restore it there.
            </p>
            <BackupButton />
            <RestoreButton />
            {persist && (
              <p className="field-hint">
                {persist === 'persisted'
                  ? '✓ This browser has agreed to keep RideConnect’s data until you delete it.'
                  : 'This browser may clear saved data if the phone runs low on space. Add RideConnect to your Home Screen and keep a backup to be safe.'}
              </p>
            )}
          </>
        )}
      </section>

      <section className="card danger-zone" aria-labelledby="delete-heading">
        <h2 id="delete-heading">Delete all my data</h2>
        {isDemo ? (
          <>
            <p>You are in demo mode, which only uses sample data. Exit demo mode to delete your own data.</p>
            <button type="button" className="button-secondary" onClick={toggleDemo}>Exit demo</button>
          </>
        ) : (
          <>
            <p>
              Erase everything RideConnect has saved on this device: your information, appointments, and ride history.
              If you want to keep a copy, download a PDF report first.
            </p>
            <button type="button" className="button-danger" onClick={deleteEverything} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete all my data'}
            </button>
          </>
        )}
      </section>

      <section aria-labelledby="about-heading">
        <h2 id="about-heading">About RideConnect</h2>
        <p>Version {APP_VERSION}. Made for the Congressional App Challenge.</p>
        <p>
          <strong>Your privacy:</strong> RideConnect has no accounts and no server. Everything you enter stays on this
          device and is never sent anywhere. Clearing your browser's data for this site will also erase it.
        </p>
        <p>
          <strong>About your records:</strong> Ride details are entered by you. They are your own record, not
          independent proof, but a dated record made at the time is strong evidence when you file a complaint.
        </p>
        <Disclaimer />
      </section>
    </Screen>
  );
}
