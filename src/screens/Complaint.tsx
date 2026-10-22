// ---------------------------------------------------------------------------
// Complaint.tsx — preview, edit, and send the complaint letter.
//   - Shows who to send it to (from the state rules file)
//   - The letter is in a big text box so it can be changed before sending
//   - Copy, Email (opens the email app), Download PDF, and Print buttons
//   - "I sent this complaint" records it, so RideConnect can remind you to
//     follow up
// With `followUpOf`, it writes a FOLLOW-UP letter for a complaint that was
// already sent (no answer, or the problem wasn't fixed).
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { ContactList, isRealEmail } from '../components/ComplaintBits';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { buildComplaintLetter, buildFollowUpLetter, hadProblem } from '../lib/complaintLetter';
import { FOLLOW_UP_AFTER_DAYS } from '../lib/complaints';
import { formatLongDate } from '../lib/dates';
import { findPeriod, logsInRange, reportPeriods } from '../lib/reportStats';
import { getStateRule } from '../lib/stateRules';
import { routeToHash, useLeaveWarning } from '../lib/router';
import { useRideData } from '../lib/useRideData';

const SUBJECT = 'Complaint about Medicaid non-emergency medical transportation (NEMT)';

export function Complaint({ periodId: initialPeriodId, followUpOf }: { periodId?: string; followUpOf?: string }) {
  const { profile, today } = useApp();
  const { data } = useRideData();
  const [periodId, setPeriodId] = useState(initialPeriodId ?? 'past-month');
  const [letter, setLetter] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const stateRule = profile ? getStateRule(profile.state) : undefined;
  const periods = data ? reportPeriods(today, data.rideLogs) : [];
  const period = data ? findPeriod(periods, periodId) : undefined;
  const earlier = followUpOf ? data?.complaints.find((c) => c.id === followUpOf) : undefined;
  const original = !data || !profile || !period
    ? ''
    : followUpOf
      ? earlier ? buildFollowUpLetter({ profile, logs: data.rideLogs, complaint: earlier, today }) : ''
      : buildComplaintLetter({ profile, logs: data.rideLogs, period, today, stateRule });
  const title = followUpOf ? 'Follow-up letter' : 'Complaint letter';
  const back = followUpOf
    ? { to: { name: 'complaints' as const, id: followUpOf }, label: 'Complaints' }
    : { to: { name: 'report' as const }, label: 'Report' };

  // Fill in the letter once data loads, and rewrite it if the period changes.
  useEffect(() => {
    if (original) setLetter(original);
    // Only re-run when the period or loaded data changes, not on every keystroke.
  }, [original]);

  useLeaveWarning(letter !== null && original !== '' && letter !== original, {
    title: 'Leave without saving your edits?',
    message: 'Your changes to the letter will be lost. Copy it or download it first if you want to keep them.',
    confirmLabel: 'Leave and lose edits',
  });

  if (data && followUpOf && !earlier) {
    return (
      <Screen title={title} back={back}>
        <p>That complaint couldn't be found. It may have been deleted.</p>
      </Screen>
    );
  }
  if (!data || !profile || !period || letter === null) {
    return <Screen title={title} back={back}><p>Loading…</p></Screen>;
  }

  // A follow-up always has something to say (at least: "please answer").
  const problemCount = followUpOf ? 1 : logsInRange(data.rideLogs, period.from, period.to).filter(hadProblem).length;
  const contacts = stateRule?.complaintContacts ?? [];
  const emails = contacts.map((c) => c.email).filter(isRealEmail);
  const subject = earlier ? `Follow-up: ${SUBJECT} (sent ${formatLongDate(earlier.sentDate, true)})` : SUBJECT;

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter!);
      setStatus('Letter copied. You can paste it into an email or a form.');
    } catch {
      // Some browsers block copying; select the text so the user can copy it by hand.
      const box = document.getElementById('letter') as HTMLTextAreaElement | null;
      box?.select();
      setStatus('Copying was blocked. The letter is selected, so you can copy it yourself.');
    }
  }

  // A "mailto:" link opens the phone's email app with the letter filled in.
  const mailto = `mailto:${earlier ? '' : emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letter)}`;

  async function downloadPdf() {
    const { downloadLetterPdf } = await import('../lib/pdfReport');
    await downloadLetterPdf(letter!, today);
    setStatus('PDF downloaded.');
  }

  return (
    <Screen title={title} back={back}>
      {earlier ? (
        <p>
          This letter follows up on the complaint you sent to <strong>{earlier.sentTo}</strong> on{' '}
          {formatLongDate(earlier.sentDate, true)}. It lists the ride problems logged since then.
        </p>
      ) : (
      <div className="field">
        <label htmlFor="letter-period">Time period</label>
        <select id="letter-period" value={period.id} onChange={(e) => setPeriodId(e.target.value)}>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p className="field-hint">Changing the time period rewrites the letter.</p>
      </div>
      )}

      {problemCount === 0 ? (
        <p className="empty-note">No ride problems were logged in this time period, so there is nothing to complain about. That's good news!</p>
      ) : (
        <>
          <section className="card" aria-labelledby="send-to-heading">
            <h2 id="send-to-heading">Who to send it to</h2>
            {earlier && (
              <p>
                Send it to <strong>{earlier.sentTo}</strong> again. If they still don't answer, your state Medicaid office
                can help:
              </p>
            )}
            <ContactList stateRule={stateRule} />
            <ul className="plain-list contact-list">
              <li>
                <strong>{profile.rideCompanyName}</strong> (your ride company):{' '}
                <a href={`tel:${profile.rideCompanyPhone}`}>{profile.rideCompanyPhone}</a>
              </li>
              {profile.healthPlanName && (
                <li><strong>{profile.healthPlanName}</strong> (your health plan): call the member services number on your card.</li>
              )}
            </ul>
          </section>

          <div className="field">
            <label htmlFor="letter">Your letter (you can change anything)</label>
            <p id="letter-hint" className="field-hint">
              Fill in the part in [brackets] before sending.
            </p>
            <textarea
              id="letter"
              className="letter-box"
              rows={22}
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              aria-describedby="letter-hint"
            />
            {letter !== original && (
              <button type="button" className="link-button" onClick={() => setLetter(original)}>
                Undo my changes
              </button>
            )}
          </div>

          {/* aria-live: screen readers announce messages like "Letter copied." */}
          <p className="action-status" aria-live="polite">{status}</p>

          <div className="button-stack">
            <button type="button" className="button-primary" onClick={copy}>
              <Icon name="copy" /> Copy letter
            </button>
            <a href={mailto} className="button-secondary">
              <Icon name="mail" /> Email letter
            </a>
            <button type="button" className="button-secondary" onClick={downloadPdf}>
              <Icon name="download" /> Download PDF
            </button>
            <button type="button" className="button-secondary" onClick={() => window.print()}>
              <Icon name="print" /> Print
            </button>
          </div>

          <section className="card card-info" aria-labelledby="sent-heading">
            <h2 id="sent-heading">After you send it</h2>
            <p>
              Tell RideConnect you sent it. In {FOLLOW_UP_AFTER_DAYS} days, if you haven't heard back, it will remind you to follow up.
            </p>
            <a href={routeToHash({ name: 'complaint-sent', followUpOf })} className="button-primary">
              <Icon name="check" /> I sent this {earlier ? 'follow-up' : 'complaint'}
            </a>
          </section>

          {/* Only shown when printing (see the print styles in styles.css). */}
          <div className="print-only" aria-hidden="true">{letter}</div>
        </>
      )}
    </Screen>
  );
}
