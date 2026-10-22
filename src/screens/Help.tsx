// ---------------------------------------------------------------------------
// Help.tsx — what to do when a ride doesn't come, the state's rules, and
// how to install the app. Written in plain, short steps.
// ---------------------------------------------------------------------------
import { useApp } from '../AppContext';
import { Disclaimer } from '../components/Disclaimer';
import { Icon } from '../components/Icon';
import { InstallButton } from '../components/PwaPrompts';
import { Screen } from '../components/Screen';
import { routeToHash } from '../lib/router';
import { getStateRule } from '../lib/stateRules';

export function Help() {
  const { profile } = useApp();
  if (!profile) return null;
  const rule = getStateRule(profile.state);
  const phone = (
    <a href={`tel:${profile.rideCompanyPhone}`} className="button-primary">
      <Icon name="phone" /> Call {profile.rideCompanyName}
    </a>
  );

  return (
    <Screen title="Help">
      <p className="emergency">
        <Icon name="warning" /> <strong>In a medical emergency, call 911.</strong>
      </p>

      <section aria-labelledby="no-ride-heading">
        <h2 id="no-ride-heading">If your ride doesn't come</h2>
        <ol className="help-steps">
          <li>
            <strong>Call the ride company right away.</strong> Ask where the driver is and when they will arrive.
            Write down the name of the person you talk to and any reference number.
          </li>
          <li>
            <strong>Call your clinic.</strong> Tell them you will be late. Some clinics can hold your time.
          </li>
          <li>
            <strong>Log it in RideConnect</strong> with "Check in on today's ride", even if the ride shows up late.
            Each record helps prove a pattern.
          </li>
          <li>
            <strong>If it keeps happening,</strong> open the Report screen and create a complaint letter.
          </li>
        </ol>
        {phone}
      </section>

      <section aria-labelledby="no-return-heading">
        <h2 id="no-return-heading">If your ride home doesn't come</h2>
        <ol className="help-steps">
          <li>Call the ride company and ask when the driver will come.</li>
          <li>Ask the clinic staff for help. Don't wait outside alone if it isn't safe.</li>
          <li>Log it in RideConnect, and write how long you waited in the notes.</li>
        </ol>
      </section>

      <section aria-labelledby="rules-heading">
        <h2 id="rules-heading">{rule ? `${rule.name} rules` : 'Your state\'s rules'}</h2>
        {rule?.isPlaceholder && (
          <p className="placeholder-warning">
            <Icon name="warning" /> These rules are placeholders. Check your state Medicaid website for the real rules.
          </p>
        )}
        {rule ? (
          <>
            <p>
              <strong>Booking:</strong> Book rides at least <strong>{rule.bookingWindowBusinessDays} business days</strong>{' '}
              before the appointment. Weekends and federal holidays don't count. RideConnect reminds you on the Home
              screen.
            </p>
            <p><strong>Where to complain:</strong></p>
            <ul className="plain-list contact-list">
              {rule.complaintContacts.map((c) => (
                <li key={c.name}>
                  <strong>{c.name}</strong>
                  {c.phone && <><br />Phone: {c.phone}</>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>RideConnect doesn't have rules for your state yet. Check your state Medicaid website.</p>
        )}
      </section>

      <section aria-labelledby="tips-heading">
        <h2 id="tips-heading">Tips</h2>
        <ul className="help-steps">
          <li>For regular appointments like dialysis, ask the ride company for a <strong>standing order</strong>, so you don't have to book every ride.</li>
          <li>Save the confirmation number every time you book. Add it to the appointment in RideConnect.</li>
          <li>Check in after every ride, including the good ones. A full record is more convincing.</li>
        </ul>
      </section>

      <section aria-labelledby="install-heading">
        <h2 id="install-heading">Put RideConnect on your home screen</h2>
        <ul className="help-steps">
          <li><strong>iPhone:</strong> In Safari, tap the Share button, then "Add to Home Screen".</li>
          <li><strong>Android:</strong> In Chrome, tap the ⋮ menu, then "Add to Home screen" or "Install app".</li>
        </ul>
        <p>After that, RideConnect opens like a regular app and works without internet.</p>
        <InstallButton />
      </section>

      <a href={routeToHash({ name: 'settings' })} className="button-secondary">Settings and delete data</a>

      <Disclaimer />
    </Screen>
  );
}
