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
import { businessDaysText, effectiveBookingWindow } from '../lib/bookingWindow';
import { getStateRule, stateName } from '../lib/stateRules';
import { t, tx } from '../lib/i18n';

export function Help() {
  const { profile } = useApp();
  if (!profile) return null;
  const rule = getStateRule(profile.state);
  const bookingWindow = effectiveBookingWindow(profile, rule);
  const phone = (
    <a href={`tel:${profile.rideCompanyPhone}`} className="button-primary">
      <Icon name="phone" /> {t('Call {name}', { name: profile.rideCompanyName })}
    </a>
  );
  const settingsLink = <a href="#/settings">{t('Settings')}</a>;

  return (
    <Screen title={t('Help')}>
      <p className="emergency">
        <Icon name="warning" /> <strong>{t('In a medical emergency, call 911.')}</strong>
      </p>

      <section aria-labelledby="no-ride-heading">
        <h2 id="no-ride-heading">{t("If your ride doesn't come")}</h2>
        <ol className="help-steps">
          <li>
            <strong>{t('Call the ride company right away.')}</strong>{' '}
            {t('Ask where the driver is and when they will arrive. Write down the name of the person you talk to and any reference number.')}
          </li>
          <li>
            <strong>{t('Call your clinic.')}</strong> {t('Tell them you will be late. Some clinics can hold your time.')}
          </li>
          <li>
            {tx('{start} with "Check in on today\'s ride", even if the ride shows up late. Each record helps prove a pattern.', {
              start: <strong>{t('Log it in RideConnect')}</strong>,
            })}
          </li>
          <li>
            {tx('{start} open the Report screen and create a complaint letter.', {
              start: <strong>{t('If it keeps happening,')}</strong>,
            })}
          </li>
        </ol>
        {phone}
      </section>

      <section aria-labelledby="no-return-heading">
        <h2 id="no-return-heading">{t("If your ride home doesn't come")}</h2>
        <ol className="help-steps">
          <li>{t('Call the ride company and ask when the driver will come.')}</li>
          <li>{t("Ask the clinic staff for help. Don't wait outside alone if it isn't safe.")}</li>
          <li>{t('Log it in RideConnect, and write how long you waited in the notes.')}</li>
        </ol>
      </section>

      <section aria-labelledby="rules-heading">
        <h2 id="rules-heading">{t('{state} rules', { state: stateName(profile.state) })}</h2>
        {rule?.isPlaceholder && (
          <p className="placeholder-warning">
            <Icon name="warning" /> {t('These rules are placeholders. Check your state Medicaid website for the real rules.')}
          </p>
        )}
        {rule ? (
          <>
            <p>
              {tx("{label} Book rides at least {days} before the appointment. Weekends and federal holidays don't count. RideConnect reminds you on the Home screen.", {
                label: <strong>{t('Booking:')}</strong>,
                days: <strong>{businessDaysText(rule.bookingWindowBusinessDays)}</strong>,
              })}
            </p>
            {bookingWindow.source === 'rider' && (
              <p>
                {tx('You told RideConnect your ride company needs {days}, so reminders use your number instead. You can change it in {settings}.', {
                  days: <strong>{businessDaysText(bookingWindow.days!)}</strong>,
                  settings: settingsLink,
                })}
              </p>
            )}
            <p><strong>{t('Where to complain:')}</strong></p>
            <ul className="plain-list contact-list">
              {rule.complaintContacts.map((c) => (
                <li key={c.name}>
                  <strong>{c.name}</strong>
                  {c.phone && <><br />{t('Phone: {phone}', { phone: c.phone })}</>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p>
              {t("RideConnect doesn't have {state}'s rules yet. Check your state Medicaid website or ask your ride company how far ahead rides must be booked.", { state: stateName(profile.state) })}
            </p>
            {bookingWindow.source === 'rider' ? (
              <p>
                {tx('You told RideConnect your ride company needs {days}, so booking reminders are on. You can change it in {settings}.', {
                  days: <strong>{businessDaysText(bookingWindow.days!)}</strong>,
                  settings: settingsLink,
                })}
              </p>
            ) : (
              <p>
                {tx("{label} in {settings}, enter how many business days ahead your ride company requires you to book (for example, 2 business days). Weekends and federal holidays won't be counted.", {
                  label: <strong>{t('You can still get booking reminders:')}</strong>,
                  settings: settingsLink,
                })}
              </p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="tips-heading">
        <h2 id="tips-heading">{t('Tips')}</h2>
        <ul className="help-steps">
          <li>
            {tx("For regular appointments like dialysis, ask the ride company for a {term}, so you don't have to book every ride.", {
              term: <strong>{t('standing order')}</strong>,
            })}
          </li>
          <li>{t('Save the confirmation number every time you book. Add it to the appointment in RideConnect.')}</li>
          <li>{t('Check in after every ride, including the good ones. A full record is more convincing.')}</li>
        </ul>
      </section>

      <section aria-labelledby="install-heading">
        <h2 id="install-heading">{t('Put RideConnect on your home screen')}</h2>
        <ul className="help-steps">
          <li><strong>iPhone:</strong> {t('In Safari, tap the Share button, then "Add to Home Screen".')}</li>
          <li><strong>Android:</strong> {t('In Chrome, tap the ⋮ menu, then "Add to Home screen" or "Install app".')}</li>
        </ul>
        <p>{t('After that, RideConnect opens like a regular app and works without internet.')}</p>
        <InstallButton />
      </section>

      <a href={routeToHash({ name: 'settings' })} className="button-secondary">{t('Settings and delete data')}</a>

      <Disclaimer />
    </Screen>
  );
}
