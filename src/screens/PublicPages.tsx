import { useEffect, useRef } from 'react';
import type { Profile } from '../types';
import { Brand } from '../components/Brand';
import { LanguageButton } from '../components/LanguageSwitch';
import { capitalize, formatLongDate, formatTime } from '../lib/dates';
import { t, tx } from '../lib/i18n';
import './public.css';

function PublicHeader() {
  return <header className="rp-nav"><Brand /><nav aria-label={t('Website')}><a href="#/signin">{t('Sign in')} <span aria-hidden="true">↗</span></a><LanguageButton /></nav></header>;
}

function usePageTitle(title: string) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { document.title = `${title} · RideConnect`; window.scrollTo(0, 0); heading.current?.focus(); }, [title]);
  return heading;
}

export function Landing({ onDemo }: { onDemo(autoPlay?: boolean): void }) {
  const heading = usePageTitle(t('Keep a record. Have a voice.'));
  return <div className="rp-public">
    <PublicHeader />
    <main id="main">
      <section className="rp-hero">
        <div className="rp-hero-copy">
          <p className="rp-kicker">{t('For people who count on medical rides')}</p>
          <h1 ref={heading} tabIndex={-1}>{tx('Your care matters.{br}So does the ride{br}{end}', { br: <br />, end: <em>{t('that gets you there.')}</em> })}</h1>
          <p className="rp-intro">{t('A late pickup. A missed appointment. Another call to explain what happened. Keep the details together, so you don’t have to start from scratch.')}</p>
          <div className="rp-actions"><a className="rp-button" href="#/setup">{t('Start your ride record')} <span aria-hidden="true">→</span></a></div>
          <div className="rp-demo-options" aria-label={t('Try RideConnect')}><button className="rp-button" onClick={() => onDemo(true)}>{t('Watch the auto-demo')}</button><button className="rp-text-button" onClick={() => onDemo(false)}>{t('Take a guided tour')}</button></div>
          <p className="rp-caption">{t('About two minutes. Sample rides only, no setup needed. Watch it run or go at your own pace.')}</p>
        </div>
        <div className="rp-record-wrap">
          <article className="rp-record" aria-label={t('Example ride record')}>
            <div className="rp-record-top"><span>{t('YOUR RIDE RECORD')}</span><span>{t('EXAMPLE')}</span></div>
            <h2>{tx('One trip.{br}The whole story.', { br: <br /> })}</h2>
            <p>{capitalize(formatLongDate('2026-10-12'))} <span>{t('Dialysis appointment')}</span></p>
            <ol className="rp-timeline">
              <li><time>{formatTime('08:00')}</time><div><strong>{t('Pickup scheduled')}</strong><span>{t('Confirmation {number}', { number: 'RP-1042' })}</span></div></li>
              <li className="rp-late"><time>{formatTime('08:30')}</time><div><strong>{t('Still waiting')}</strong><span>{t('Called the ride company')}</span></div></li>
              <li><time>{formatTime('08:45')}</time><div><strong>{t('Driver arrived')}</strong><span>{t('{n} minutes after pickup time', { n: 45 })}</span></div></li>
            </ol>
            <div className="rp-record-note"><span>{t('RIDER’S NOTE')}</span><p>{t('“I called the clinic to let them know I’d be late.”')}</p></div>
            <div className="rp-record-bottom">{t('Details remembered. Ready to share.')}<span aria-hidden="true">↗</span></div>
          </article>
          <p className="rp-caption">{t('An illustrative record. Your reports use the details you enter.')}</p>
        </div>
      </section>
      <section className="rp-process" aria-labelledby="process-title">
        <div className="rp-section-heading"><p className="rp-kicker">{t('Before, during, and after the ride')}</p><h2 id="process-title">{t('A little less to keep in your head.')}</h2></div>
        <div className="rp-steps">
          <article><span className="rp-step-label">{t('BEFORE YOU GO')}</span><h3>{t('Keep the plan handy.')}</h3><p>{t('Save appointments, booking details, and your ride company’s number. See what’s coming up in one place.')}</p></article>
          <article><span className="rp-step-label">{t('WHEN IT HAPPENS')}</span><h3>{t('Write it down once.')}</h3><p>{t('Record a late pickup, a no-show, or a trip home that never came. Add the details while they’re fresh.')}</p></article>
          <article><span className="rp-step-label">{t('WHEN YOU NEED HELP')}</span><h3>{t('Bring the full picture.')}</h3><p>{t('Turn your history into a report and an editable complaint letter to share with the right person.')}</p></article>
        </div>
      </section>
      <section className="rp-care"><div><p className="rp-kicker">{t('For you. Or someone you care for.')}</p><h2>{tx('You can be the rider.{br}You can be their backup.', { br: <br /> })}</h2></div><div><p>{t('Helping a parent keep track of dialysis rides? Managing your own appointments? RideConnect gives you one place for the schedule, the calls, and what actually happened.')}</p><a href="#/setup">{t('Set up your ride record')} <span aria-hidden="true">→</span></a></div></section>
      <section className="rp-questions" aria-labelledby="questions-title"><h2 id="questions-title">{t('A few things to know.')}</h2><div>
        <details><summary>{t('Does RideConnect book or send a ride?')}</summary><p>{t('No. You still book through your transportation provider. RideConnect helps you organize the booking details and record the outcome.')}</p></details>
        <details><summary>{t('Where does my information go?')}</summary><p>{t('This version saves your records in this browser on this device. There is no online account or automatic syncing. Use the backup tools in Settings to save a copy.')}</p></details>
        <details><summary>{t('Can I try it before setting anything up?')}</summary><p>{t('Yes. The sample dashboard has fictional rides you can explore. Sample records stay separate from your own records.')}</p><button className="rp-text-button" onClick={() => onDemo(false)}>{t('Open the guided tour →')}</button></details>
      </div></section>
    </main>
    <footer className="rp-footer"><Brand /><p>{t('A record of your rides. A clearer way to speak up.')}</p><span>{t('Independent of Medicaid and transportation providers.')}</span></footer>
  </div>;
}

export function SignIn({ profile, loading, error, onRetry, onContinue, onDemo }: { profile?: Profile; loading: boolean; error?: string | null; onRetry?(): void; onContinue(): void; onDemo(): void }) {
  const heading = usePageTitle(t('Sign in'));
  return <div className="rp-public rp-access-page"><PublicHeader /><main id="main" className="rp-access">
    <aside className="rp-access-aside"><p className="rp-kicker">{t('Your next ride starts here')}</p><h2>{tx('Less remembering.{br}More getting{br}{end}', { br: <br />, end: <em>{t('where you need to go.')}</em> })}</h2><p>{t('Appointments, ride details, and your history. Together in one place.')}</p><div className="rp-access-line" aria-hidden="true"><span /> <hr /> <span /></div><small>{t('From the first booking to the ride home.')}</small></aside>
    <section className="rp-access-form"><a className="rp-back" href="#/landing">← {t('Back to {label}', { label: 'RideConnect' })}</a><p className="rp-kicker">{t('Device access')}</p><h1 ref={heading} tabIndex={-1}>{t('Welcome back.')}</h1><p>{t('Open your ride record on this device.')}</p>
      <div className="rp-local-notice"><strong>{t('No password needed for this version.')}</strong><p>{t('Your records live in this browser. This opens your local profile; it does not sign you into an online account or lock your records.')}</p></div>
      {error ? <><p role="alert">{error}</p><button className="rp-button" onClick={onRetry}>{t('Try again')}</button></> : loading ? <p role="status">{t('Looking for your saved profile…')}</p> : profile ? <><div className="rp-saved-profile"><span className="rp-avatar" aria-hidden="true">{profile.riderFirstName.slice(0, 1).toUpperCase()}</span><div><strong>{t('{name}’s ride record', { name: profile.riderFirstName })}</strong><span>{t('Saved on this device')}</span></div></div><button className="rp-button" onClick={onContinue}>{t('Continue to my dashboard →')}</button></> : <><p className="rp-empty">{t('There isn’t a saved profile in this browser yet. Set one up to start keeping your ride record.')}</p><a className="rp-button" href="#/setup">{t('Set up my ride record →')}</a></>}
      <div className="rp-access-demo"><span>{t('Just taking a look?')}</span><button className="rp-text-button" onClick={onDemo}>{t('Try the sample dashboard ↗')}</button></div>
      <p className="rp-caption">{t('Using a different device? You can restore an exported backup during setup.')}</p>
    </section>
  </main><footer className="rp-footer"><Brand /><span>{t('Your records stay here until you choose to export them.')}</span></footer></div>;
}
