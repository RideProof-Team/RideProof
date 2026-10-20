// ---------------------------------------------------------------------------
// Settings.tsx — change your information, notifications, delete all data,
// and information about the app.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useApp } from '../AppContext';
import { Disclaimer } from '../components/Disclaimer';
import { Screen } from '../components/Screen';
import { askNotificationPermission, clearSentNotifications, notificationPermission } from '../lib/notifications';
import { askConfirm } from '../lib/feedback';
import { navigate, routeToHash } from '../lib/router';
import { getStateRule } from '../lib/stateRules';
import { createStorage } from '../lib/storage';

const APP_VERSION = '1.0.0';

const PERMISSION_TEXT = {
  granted: 'On. Reminders are also sent as notifications when RideProof is open.',
  denied: 'Blocked. To turn them on, allow notifications for RideProof in your phone or browser settings.',
  default: 'Off. Reminders still show on the Home screen.',
  unsupported: 'This browser does not support notifications. Reminders still show on the Home screen.',
};

export function Settings() {
  const { profile, mode, setProfile, toggleDemo } = useApp();
  const [permission, setPermission] = useState(notificationPermission);
  const [deleting, setDeleting] = useState(false);
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
    setProfile(undefined);
    navigate({ name: 'home' }); // with no profile, this shows the Welcome screen
  }

  return (
    <Screen title="Settings" back={{ to: { name: 'help' }, label: 'Help' }}>
      <section className="card" aria-labelledby="info-heading">
        <h2 id="info-heading">Your information</h2>
        <dl className="summary-list">
          <dt>{profile.role === 'caregiver' ? 'Rider (you help them)' : 'Rider'}</dt>
          <dd>{profile.riderFirstName}</dd>
          <dt>State</dt>
          <dd>{getStateRule(profile.state)?.name ?? profile.state}</dd>
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
          On iPhone, notifications only work after you add RideProof to your Home Screen (see Help).
        </p>
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
              Erase everything RideProof has saved on this device: your information, appointments, and ride history.
              If you want to keep a copy, download a PDF report first.
            </p>
            <button type="button" className="button-danger" onClick={deleteEverything} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete all my data'}
            </button>
          </>
        )}
      </section>

      <section aria-labelledby="about-heading">
        <h2 id="about-heading">About RideProof</h2>
        <p>Version {APP_VERSION}. Made for the Congressional App Challenge.</p>
        <p>
          <strong>Your privacy:</strong> RideProof has no accounts and no server. Everything you enter stays on this
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
