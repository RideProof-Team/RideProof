// ---------------------------------------------------------------------------
// Home.tsx — PLACEHOLDER for Phase 1. Confirms setup worked.
// Phase 2 replaces this with the next appointment, booking status,
// reminders, and the "Check in on today's ride" button.
// ---------------------------------------------------------------------------
import { useApp } from '../AppContext';
import { getStateRule } from '../lib/stateRules';

export function Home() {
  const { profile } = useApp();
  if (!profile) return null;
  const state = getStateRule(profile.state);

  return (
    <main className="screen">
      <h1>Hi{profile.role === 'rider' ? `, ${profile.riderFirstName}` : ''}!</h1>
      <p>
        {profile.role === 'caregiver'
          ? `You're set up to help ${profile.riderFirstName} track rides.`
          : "You're all set up."}
      </p>
      <dl className="summary-list">
        <dt>State</dt>
        <dd>{state?.name ?? profile.state}</dd>
        <dt>Ride company</dt>
        <dd>{profile.rideCompanyName}</dd>
        <dt>Ride company phone</dt>
        <dd><a href={`tel:${profile.rideCompanyPhone}`}>{profile.rideCompanyPhone}</a></dd>
        {profile.healthPlanName && (
          <>
            <dt>Health plan</dt>
            <dd>{profile.healthPlanName}</dd>
          </>
        )}
      </dl>
      <p className="field-hint">Appointments and ride check-ins are coming in the next phases.</p>
    </main>
  );
}
