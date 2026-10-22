// ---------------------------------------------------------------------------
// Complaint.tsx — preview, edit, and send the complaint letter.
//   - Shows who to send it to (from the state rules file)
//   - The letter is in a big text box so it can be changed before sending
//   - Copy, Email (opens the email app), Download PDF, and Print buttons
//   - "I sent this complaint" records it, so RideConnect can remind you to
//     follow up
// With `followUpOf`, it writes a FOLLOW-UP letter for a complaint that was
// already sent (no answer, or the problem wasn't fixed).
// The letter can be written in English or Spanish, whatever the app's
// language is (a Spanish-speaking rider may need to send it in English).
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { ContactList, isRealEmail } from '../components/ComplaintBits';
import { Icon } from '../components/Icon';
import { DocumentLanguage } from '../components/LanguageSwitch';
import { Screen } from '../components/Screen';
import { buildComplaintLetter, buildFollowUpLetter, hadProblem } from '../lib/complaintLetter';
import { FOLLOW_UP_AFTER_DAYS } from '../lib/complaints';
import { attemptsInRange } from '../lib/bookingAttempts';
import { formatLongDate } from '../lib/dates';
import { t, tx, useLanguage, withLanguage, type Language } from '../lib/i18n';
import { findPeriod, logsInRange, reportPeriods } from '../lib/reportStats';
import { getStateRule } from '../lib/stateRules';
import { routeToHash, useLeaveWarning } from '../lib/router';
import { useRideData } from '../lib/useRideData';

export function Complaint({ periodId: initialPeriodId, followUpOf }: { periodId?: string; followUpOf?: string }) {
  const { profile, today } = useApp();
  const { data } = useRideData();
  const [periodId, setPeriodId] = useState(initialPeriodId ?? 'past-month');
  const [letter, setLetter] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  // The letter's language starts as the app's language.
  const appLanguage = useLanguage();
  const [docLanguage, setDocLanguage] = useState<Language>(appLanguage);

  const stateRule = profile ? getStateRule(profile.state) : undefined;
  const periods = data ? reportPeriods(today, data.rideLogs) : [];
  const period = data ? findPeriod(periods, periodId) : undefined;
  const earlier = followUpOf ? data?.complaints.find((c) => c.id === followUpOf) : undefined;
  // Written in the document's language, which can differ from the app's.
  const original = !data || !profile || !period
    ? ''
    : withLanguage(docLanguage, () =>
        followUpOf
          ? earlier ? buildFollowUpLetter({ profile, logs: data.rideLogs, complaint: earlier, today, attempts: data.bookingAttempts }) : ''
          : buildComplaintLetter({ profile, logs: data.rideLogs, period, today, stateRule, attempts: data.bookingAttempts }),
      );
  const title = followUpOf ? t('Follow-up letter') : t('Complaint letter');
  const back = followUpOf
    ? { to: { name: 'complaints' as const, id: followUpOf }, label: t('Complaints') }
    : { to: { name: 'report' as const }, label: t('Report') };

  // Fill in the letter once data loads, and rewrite it if the period or language changes.
  useEffect(() => {
    if (original) setLetter(original);
    // Only re-run when the period or loaded data changes, not on every keystroke.
  }, [original]);

  useLeaveWarning(letter !== null && original !== '' && letter !== original, {
    title: t('Leave without saving your edits?'),
    message: t('Your changes to the letter will be lost. Copy it or download it first if you want to keep them.'),
    confirmLabel: t('Leave and lose edits'),
  });

  if (data && followUpOf && !earlier) {
    return (
      <Screen title={title} back={back}>
        <p>{t("That complaint couldn't be found. It may have been deleted.")}</p>
      </Screen>
    );
  }
  if (!data || !profile || !period || letter === null) {
    return <Screen title={title} back={back}><p>{t('Loading…')}</p></Screen>;
  }

  // A follow-up always has something to say (at least: "please answer").
  const problemCount = followUpOf
    ? 1
    : logsInRange(data.rideLogs, period.from, period.to).filter(hadProblem).length +
      attemptsInRange(data.bookingAttempts, period.from, period.to).length;
  const contacts = stateRule?.complaintContacts ?? [];
  const emails = contacts.map((c) => c.email).filter(isRealEmail);
  // The email subject is in the letter's language too.
  const subject = withLanguage(docLanguage, () => {
    const about = t('Complaint about Medicaid non-emergency medical transportation (NEMT)');
    return earlier ? t('Follow-up: {subject} (sent {date})', { subject: about, date: formatLongDate(earlier.sentDate, true) }) : about;
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter!);
      setStatus(t('Letter copied. You can paste it into an email or a form.'));
    } catch {
      // Some browsers block copying; select the text so the user can copy it by hand.
      const box = document.getElementById('letter') as HTMLTextAreaElement | null;
      box?.select();
      setStatus(t('Copying was blocked. The letter is selected, so you can copy it yourself.'));
    }
  }

  // A "mailto:" link opens the phone's email app with the letter filled in.
  const mailto = `mailto:${earlier ? '' : emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letter)}`;

  async function downloadPdf() {
    const pdf = await import('../lib/pdfReport');
    // Build it right away inside withLanguage, so the PDF's footer matches the letter.
    await withLanguage(docLanguage, () => pdf.downloadLetterPdf(letter!, today));
    setStatus(t('PDF downloaded.'));
  }

  return (
    <Screen title={title} back={back}>
      {earlier ? (
        <p>
          {tx('This letter follows up on the complaint you sent to {who} on {date}. It lists the ride problems logged since then.', {
            who: <strong>{earlier.sentTo}</strong>,
            date: formatLongDate(earlier.sentDate, true),
          })}
        </p>
      ) : (
      <div className="field">
        <label htmlFor="letter-period">{t('Time period')}</label>
        <select id="letter-period" value={period.id} onChange={(e) => setPeriodId(e.target.value)}>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p className="field-hint">{t('Changing the time period rewrites the letter.')}</p>
      </div>
      )}

      {problemCount === 0 ? (
        <p className="empty-note">{t("No ride problems were logged in this time period, so there is nothing to complain about. That's good news!")}</p>
      ) : (
        <>
          <section className="card" aria-labelledby="send-to-heading">
            <h2 id="send-to-heading">{t('Who to send it to')}</h2>
            {earlier && (
              <p>
                {tx("Send it to {who} again. If they still don't answer, your state Medicaid office can help:", {
                  who: <strong>{earlier.sentTo}</strong>,
                })}
              </p>
            )}
            <ContactList stateRule={stateRule} />
            <ul className="plain-list contact-list">
              <li>
                {tx('{company} (your ride company): {phone}', {
                  company: <strong>{profile.rideCompanyName}</strong>,
                  phone: <a href={`tel:${profile.rideCompanyPhone}`}>{profile.rideCompanyPhone}</a>,
                })}
              </li>
              {profile.healthPlanName && (
                <li>
                  {tx('{plan} (your health plan): call the member services number on your card.', {
                    plan: <strong>{profile.healthPlanName}</strong>,
                  })}
                </li>
              )}
            </ul>
          </section>

          <DocumentLanguage id="letter-language" value={docLanguage} onChange={setDocLanguage} />

          <div className="field">
            <label htmlFor="letter">{t('Your letter (you can change anything)')}</label>
            <p id="letter-hint" className="field-hint">
              {t('Fill in the part in [brackets] before sending.')}
            </p>
            <textarea
              id="letter"
              className="letter-box"
              rows={22}
              lang={docLanguage}
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              aria-describedby="letter-hint"
            />
            {letter !== original && (
              <button type="button" className="link-button" onClick={() => setLetter(original)}>
                {t('Undo my changes')}
              </button>
            )}
          </div>

          {/* aria-live: screen readers announce messages like "Letter copied." */}
          <p className="action-status" aria-live="polite">{status}</p>

          <div className="button-stack">
            <button type="button" className="button-primary" onClick={copy}>
              <Icon name="copy" /> {t('Copy letter')}
            </button>
            <a href={mailto} className="button-secondary">
              <Icon name="mail" /> {t('Email letter')}
            </a>
            <button type="button" className="button-secondary" onClick={downloadPdf}>
              <Icon name="download" /> {t('Download PDF')}
            </button>
            <button type="button" className="button-secondary" onClick={() => window.print()}>
              <Icon name="print" /> {t('Print')}
            </button>
          </div>

          <section className="card card-info" aria-labelledby="sent-heading">
            <h2 id="sent-heading">{t('After you send it')}</h2>
            <p>
              {t("Tell RideConnect you sent it. In {days} days, if you haven't heard back, it will remind you to follow up.", {
                days: FOLLOW_UP_AFTER_DAYS,
              })}
            </p>
            <a href={routeToHash({ name: 'complaint-sent', followUpOf })} className="button-primary">
              <Icon name="check" /> {earlier ? t('I sent this follow-up') : t('I sent this complaint')}
            </a>
          </section>

          {/* Only shown when printing (see the print styles in styles.css). */}
          <div className="print-only" aria-hidden="true" lang={docLanguage}>{letter}</div>
        </>
      )}
    </Screen>
  );
}
