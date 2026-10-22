// ---------------------------------------------------------------------------
// CareTeam.tsx — "Share with my care team": a friendly one-page summary
// for the rider's doctor, nurse, social worker, or case manager.
// Copy, Email (opens the email app), Download PDF, or Print.
// The content is built in lib/careTeamSummary.ts (using computeStats).
// The summary (and its PDF) can be in English even when the app is in Spanish.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { DocumentLanguage } from '../components/LanguageSwitch';
import { Screen } from '../components/Screen';
import { buildCareTeamSummary, summaryToText } from '../lib/careTeamSummary';
import { t, useLanguage, withLanguage, type Language } from '../lib/i18n';
import { findPeriod, reportPeriods } from '../lib/reportStats';
import { useRideData } from '../lib/useRideData';

export function CareTeam({ periodId: initialPeriodId }: { periodId?: string }) {
  const { profile, today } = useApp();
  const { data } = useRideData();
  const [periodId, setPeriodId] = useState(initialPeriodId ?? 'past-month');
  const [status, setStatus] = useState('');
  // The summary's language starts as the app's language.
  const appLanguage = useLanguage();
  const [docLanguage, setDocLanguage] = useState<Language>(appLanguage);
  const back = { to: { name: 'report' as const }, label: t('Report') };
  const title = t('Share with my care team');
  if (!data || !profile) return <Screen title={title} back={back}><p>{t('Loading…')}</p></Screen>;

  const periods = reportPeriods(today, data.rideLogs);
  const period = findPeriod(periods, periodId);
  const lines = withLanguage(docLanguage, () =>
    buildCareTeamSummary({ profile, logs: data.rideLogs, attempts: data.bookingAttempts, period, today }),
  );
  const text = withLanguage(docLanguage, () => summaryToText(lines));
  const subject = lines[0].text;
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(t('Summary copied. You can paste it into a message or a patient portal.'));
    } catch {
      setStatus(t('Copying was blocked. You can use Email or Download PDF instead.'));
    }
  }

  async function downloadPdf() {
    const pdf = await import('../lib/pdfReport');
    // Build it right away inside withLanguage, so the PDF's footer matches the summary.
    await withLanguage(docLanguage, () => pdf.downloadCareTeamPdf(lines, today));
    setStatus(t('PDF downloaded.'));
  }

  return (
    <Screen title={title} back={back}>
      <p>
        {t("A short, friendly summary for {name}'s doctor, nurse, dialysis social worker, or case manager. It explains how ride problems are affecting care.", {
          name: profile.riderFirstName,
        })}
      </p>
      <div className="field">
        <label htmlFor="care-period">{t('Time period')}</label>
        <select id="care-period" value={period.id} onChange={(e) => setPeriodId(e.target.value)}>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <DocumentLanguage id="care-language" value={docLanguage} onChange={setDocLanguage} />

      <article className="card care-summary" aria-label={t('Summary preview')} lang={docLanguage}>
        {lines.map((line, i) => {
          switch (line.kind) {
            case 'title':
              return <h2 key={i}>{line.text}</h2>;
            case 'subtitle':
              return <p key={i} className="field-hint">{line.text}</p>;
            case 'heading':
              return <h3 key={i}>{line.text}</h3>;
            case 'item':
              return <p key={i} className="care-item">{line.text}</p>;
            default:
              return <p key={i}>{line.text}</p>;
          }
        })}
      </article>
      <p className="field-hint">{t('Fill in the part in [brackets] before sending, or after you paste it.')}</p>

      <p className="action-status" aria-live="polite">{status}</p>
      <div className="button-stack">
        <button type="button" className="button-primary" onClick={copy}>
          <Icon name="copy" /> {t('Copy summary')}
        </button>
        <a href={mailto} className="button-secondary">
          <Icon name="mail" /> {t('Email summary')}
        </a>
        <button type="button" className="button-secondary" onClick={downloadPdf}>
          <Icon name="download" /> {t('Download PDF')}
        </button>
        <button type="button" className="button-secondary" onClick={() => window.print()}>
          <Icon name="print" /> {t('Print')}
        </button>
      </div>
      <div className="print-only" aria-hidden="true" lang={docLanguage}>{text}</div>
    </Screen>
  );
}
