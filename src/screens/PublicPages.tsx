import { useEffect, useRef } from 'react';
import type { Profile } from '../types';
import { Brand } from '../components/Brand';
import './public.css';

function PublicHeader() {
  return <header className="rp-nav"><Brand /><nav aria-label="Website"><a href="#/signin">Sign in <span aria-hidden="true">↗</span></a></nav></header>;
}

function usePageTitle(title: string) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { document.title = `${title} · RideProof`; window.scrollTo(0, 0); heading.current?.focus(); }, [title]);
  return heading;
}

export function Landing({ onDemo }: { onDemo(autoPlay?: boolean): void }) {
  const heading = usePageTitle('Keep a record. Have a voice.');
  return <div className="rp-public">
    <PublicHeader />
    <main id="main">
      <section className="rp-hero">
        <div className="rp-hero-copy">
          <p className="rp-kicker">For people who count on medical rides</p>
          <h1 ref={heading} tabIndex={-1}>Your care matters.<br />So does the ride<br /><em>that gets you there.</em></h1>
          <p className="rp-intro">A late pickup. A missed appointment. Another call to explain what happened. Keep the details together, so you don’t have to start from scratch.</p>
          <div className="rp-actions"><a className="rp-button" href="#/setup">Start your ride record <span aria-hidden="true">→</span></a></div>
          <div className="rp-demo-options" aria-label="Try RideProof"><button className="rp-button" onClick={() => onDemo(true)}>Watch the auto-demo</button><button className="rp-text-button" onClick={() => onDemo(false)}>Take a guided tour</button></div>
          <p className="rp-caption">About two minutes. Sample rides only, no setup needed. Watch it run or go at your own pace.</p>
        </div>
        <div className="rp-record-wrap">
          <article className="rp-record" aria-label="Example ride record">
            <div className="rp-record-top"><span>YOUR RIDE RECORD</span><span>EXAMPLE</span></div>
            <h2>One trip.<br />The whole story.</h2>
            <p>Monday, October 12 <span>Dialysis appointment</span></p>
            <ol className="rp-timeline">
              <li><time>8:00 AM</time><div><strong>Pickup scheduled</strong><span>Confirmation RP-1042</span></div></li>
              <li className="rp-late"><time>8:30 AM</time><div><strong>Still waiting</strong><span>Called the ride company</span></div></li>
              <li><time>8:45 AM</time><div><strong>Driver arrived</strong><span>45 minutes after pickup time</span></div></li>
            </ol>
            <div className="rp-record-note"><span>RIDER’S NOTE</span><p>“I called the clinic to let them know I’d be late.”</p></div>
            <div className="rp-record-bottom">Details remembered. Ready to share.<span aria-hidden="true">↗</span></div>
          </article>
          <p className="rp-caption">An illustrative record. Your reports use the details you enter.</p>
        </div>
      </section>
      <section className="rp-process" aria-labelledby="process-title">
        <div className="rp-section-heading"><p className="rp-kicker">Before, during, and after the ride</p><h2 id="process-title">A little less to keep in your head.</h2></div>
        <div className="rp-steps">
          <article><span className="rp-step-label">BEFORE YOU GO</span><h3>Keep the plan handy.</h3><p>Save appointments, booking details, and your ride company’s number. See what’s coming up in one place.</p></article>
          <article><span className="rp-step-label">WHEN IT HAPPENS</span><h3>Write it down once.</h3><p>Record a late pickup, a no-show, or a trip home that never came. Add the details while they’re fresh.</p></article>
          <article><span className="rp-step-label">WHEN YOU NEED HELP</span><h3>Bring the full picture.</h3><p>Turn your history into a report and an editable complaint letter to share with the right person.</p></article>
        </div>
      </section>
      <section className="rp-care"><div><p className="rp-kicker">For you. Or someone you care for.</p><h2>You can be the rider.<br />You can be their backup.</h2></div><div><p>Helping a parent keep track of dialysis rides? Managing your own appointments? RideProof gives you one place for the schedule, the calls, and what actually happened.</p><a href="#/setup">Set up your ride record <span aria-hidden="true">→</span></a></div></section>
      <section className="rp-questions" aria-labelledby="questions-title"><h2 id="questions-title">A few things to know.</h2><div>
        <details><summary>Does RideProof book or send a ride?</summary><p>No. You still book through your transportation provider. RideProof helps you organize the booking details and record the outcome.</p></details>
        <details><summary>Where does my information go?</summary><p>This version saves your records in this browser on this device. There is no online account or automatic syncing. Use the backup tools in Settings to save a copy.</p></details>
        <details><summary>Can I try it before setting anything up?</summary><p>Yes. The sample dashboard has fictional rides you can explore. Sample records stay separate from your own records.</p><button className="rp-text-button" onClick={() => onDemo(false)}>Open the guided tour →</button></details>
      </div></section>
    </main>
    <footer className="rp-footer"><Brand /><p>A record of your rides. A clearer way to speak up.</p><span>Independent of Medicaid and transportation providers.</span></footer>
  </div>;
}

export function SignIn({ profile, loading, error, onRetry, onContinue, onDemo }: { profile?: Profile; loading: boolean; error?: string | null; onRetry?(): void; onContinue(): void; onDemo(): void }) {
  const heading = usePageTitle('Sign in');
  return <div className="rp-public rp-access-page"><PublicHeader /><main id="main" className="rp-access">
    <aside className="rp-access-aside"><p className="rp-kicker">Your next ride starts here</p><h2>Less remembering.<br />More getting<br /><em>where you need to go.</em></h2><p>Appointments, ride details, and your history. Together in one place.</p><div className="rp-access-line" aria-hidden="true"><span /> <hr /> <span /></div><small>From the first booking to the ride home.</small></aside>
    <section className="rp-access-form"><a className="rp-back" href="#/landing">← Back to RideProof</a><p className="rp-kicker">Device access</p><h1 ref={heading} tabIndex={-1}>Welcome back.</h1><p>Open your ride record on this device.</p>
      <div className="rp-local-notice"><strong>No password needed for this version.</strong><p>Your records live in this browser. This opens your local profile; it does not sign you into an online account or lock your records.</p></div>
      {error ? <><p role="alert">{error}</p><button className="rp-button" onClick={onRetry}>Try again</button></> : loading ? <p role="status">Looking for your saved profile…</p> : profile ? <><div className="rp-saved-profile"><span className="rp-avatar" aria-hidden="true">{profile.riderFirstName.slice(0, 1).toUpperCase()}</span><div><strong>{profile.riderFirstName}’s ride record</strong><span>Saved on this device</span></div></div><button className="rp-button" onClick={onContinue}>Continue to my dashboard →</button></> : <><p className="rp-empty">There isn’t a saved profile in this browser yet. Set one up to start keeping your ride record.</p><a className="rp-button" href="#/setup">Set up my ride record →</a></>}
      <div className="rp-access-demo"><span>Just taking a look?</span><button className="rp-text-button" onClick={onDemo}>Try the sample dashboard ↗</button></div>
      <p className="rp-caption">Using a different device? You can restore an exported backup during setup.</p>
    </section>
  </main><footer className="rp-footer"><Brand /><span>Your records stay here until you choose to export them.</span></footer></div>;
}
