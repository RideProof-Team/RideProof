// ---------------------------------------------------------------------------
// Complaint.tsx — preview, edit, and send the complaint letter.
//   - Shows who to send it to (from the state rules file)
//   - The letter is in a big text box so it can be changed before sending
//   - Copy, Email (opens the email app), Download PDF, and Print buttons
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { buildComplaintLetter, hadProblem } from '../lib/complaintLetter';
import { findPeriod, logsInRange, reportPeriods } from '../lib/reportStats';
import { getStateRule, type ComplaintContact } from '../lib/stateRules';
import { useLeaveWarning } from '../lib/router';
import { useRideData } from '../lib/useRideData';

const SUBJECT = 'Complaint about Medicaid non-emergency medical transportation (NEMT)';

export function Complaint({ periodId: initialPeriodId }: { periodId?: string }) {
  const { profile, today } = useApp();
  const { data } = useRideData();
  const [periodId, setPeriodId] = useState(initialPeriodId ?? 'past-month');
  const [letter, setLetter] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const stateRule = profile ? getStateRule(profile.state) : undefined;
  const periods = data ? reportPeriods(today, data.rideLogs) : [];
  const period = data ? findPeriod(periods, periodId) : undefined;
  const original =
    data && profile && period ? buildComplaintLetter({ profile, logs: data.rideLogs, period, today, stateRule }) : '';

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

  if (!data || !profile || !period || letter === null) {
    return <Screen title="Complaint letter" back={{ to: { name: 'report' }, label: 'Report' }}><p>Loading…</p></Screen>;
  }

  const problemCount = logsInRange(data.rideLogs, period.from, period.to).filter(hadProblem).length;
  const contacts = stateRule?.complaintContacts ?? [];
  const emails = contacts.map((c) => c.email).filter(isRealEmail);

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
  const mailto = `mailto:${emails.join(',')}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(letter)}`;

  async function downloadPdf() {
    const { downloadLetterPdf } = await import('../lib/pdfReport');
    await downloadLetterPdf(letter!, today);
    setStatus('PDF downloaded.');
  }

  return (
    <Screen title="Complaint letter" back={{ to: { name: 'report' }, label: 'Report' }}>
      <div className="field">
        <label htmlFor="letter-period">Time period</label>
        <select id="letter-period" value={period.id} onChange={(e) => setPeriodId(e.target.value)}>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p className="field-hint">Changing the time period rewrites the letter.</p>
      </div>

      {problemCount === 0 ? (
        <p className="empty-note">No ride problems were logged in this time period, so there is nothing to complain about. That's good news!</p>
      ) : (
        <>
          <section className="card" aria-labelledby="send-to-heading">
            <h2 id="send-to-heading">Who to send it to</h2>
            {stateRule?.isPlaceholder && (
              <p className="placeholder-warning">
                <Icon name="warning" /> These contacts are placeholders. Check your state Medicaid website for the
                right place to send complaints.
              </p>
            )}
            <ul className="plain-list contact-list">
              {contacts.map((c) => <ContactItem key={c.name} contact={c} />)}
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

          {/* Only shown when printing (see the print styles in styles.css). */}
          <div className="print-only" aria-hidden="true">{letter}</div>
        </>
      )}
    </Screen>
  );
}

/** A placeholder value (e.g. "PLACEHOLDER - look up") isn't a real address. */
function isRealEmail(email: string): boolean {
  return email.includes('@') && !email.toUpperCase().includes('PLACEHOLDER');
}

function ContactItem({ contact }: { contact: ComplaintContact }) {
  const phoneIsReal = contact.phone && !contact.phone.toUpperCase().includes('PLACEHOLDER');
  return (
    <li>
      <strong>{contact.name}</strong>
      {contact.phone && (
        <>
          <br />
          Phone: {phoneIsReal ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : contact.phone}
        </>
      )}
      {isRealEmail(contact.email) && <><br />Email: {contact.email}</>}
      {contact.website && (
        <>
          <br />
          <a href={contact.website} target="_blank" rel="noreferrer">Website</a>
        </>
      )}
    </li>
  );
}
