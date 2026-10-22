// ---------------------------------------------------------------------------
// ComplaintSent.tsx — "I sent this complaint": write down when, to whom,
// and how a complaint was sent, so RideConnect can remind the rider to
// follow up 14 days later if nobody answers.
//
// The rules (what's required, the 14 days) are in lib/complaints.ts.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { useApp } from '../AppContext';
import { complaintRecipients } from '../components/ComplaintBits';
import { ErrorSummary, TextField } from '../components/FormFields';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import {
  COMPLAINT_METHOD_LABELS,
  COMPLAINT_METHODS,
  FOLLOW_UP_AFTER_DAYS,
  newSentComplaint,
  validateSentComplaint,
  type SentComplaintErrors,
  type SentComplaintInput,
} from '../lib/complaints';
import { addDays, formatLongDate } from '../lib/dates';
import { showSnackbar } from '../lib/feedback';
import { t } from '../lib/i18n';
import { allowLeave, navigate, useLeaveWarning } from '../lib/router';
import { getStateRule } from '../lib/stateRules';
import { newId } from '../lib/storage';
import { useRideData } from '../lib/useRideData';

/** The "Someone else" choice: the rider types the name. */
const OTHER = '__other__';

export function ComplaintSent({ followUpOf }: { followUpOf?: string }) {
  const { profile, storage, today } = useApp();
  const { data } = useRideData();
  const earlier = followUpOf ? data?.complaints.find((c) => c.id === followUpOf) : undefined;
  const recipients = profile ? complaintRecipients(profile, getStateRule(profile.state)) : [];

  // Which "who" choice is picked; with OTHER, the typed name is used instead.
  const [whoChoice, setWhoChoice] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [form, setForm] = useState<Omit<SentComplaintInput, 'sentTo'>>({
    sentDate: today,
    method: '',
    referenceNumber: '',
    notes: '',
  });
  const [errors, setErrors] = useState<SentComplaintErrors>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // A follow-up usually goes to the same place as the first complaint.
  const defaultWho = earlier ? (recipients.includes(earlier.sentTo) ? earlier.sentTo : OTHER) : null;
  const who = whoChoice ?? defaultWho;
  const typed = whoChoice === null && defaultWho === OTHER ? earlier!.sentTo : typedName;
  const sentTo = who === OTHER ? typed : (who ?? '');

  const dirty = whoChoice !== null || typedName !== '' || form.method !== '' || form.referenceNumber !== '' || form.notes !== '';
  useLeaveWarning(dirty, {
    title: t('Leave without saving?'),
    message: t('What you entered about this complaint will be lost.'),
    confirmLabel: t('Leave without saving'),
  });

  if (!profile || !data) return <Screen title={t('I sent a complaint')}><p>{t('Loading…')}</p></Screen>;

  const title = earlier ? t('I sent the follow-up') : t('I sent a complaint');

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const input = { ...form, sentTo };
    const found = validateSentComplaint(input, today);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move focus to the list of problems so screen readers read it out.
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }
    const complaint = newSentComplaint(newId(), input, followUpOf);
    await storage.saveComplaint(complaint);
    allowLeave();
    const remind = addDays(complaint.sentDate, FOLLOW_UP_AFTER_DAYS);
    showSnackbar(
      remind > today
        ? t("Saved. If you haven't heard back by {date}, RideConnect will remind you.", { date: formatLongDate(remind) })
        : t('Saved. It has been 14 days already, so you can update what happened right away.'),
    );
    navigate({ name: 'complaints' });
  }

  return (
    <Screen title={title} back={{ to: { name: 'complaints' }, label: t('Complaints') }}>
      <p>
        {t("Write down when and where you sent it. {days} days later, if you're still waiting for an answer, RideConnect will remind you to follow up.", {
          days: FOLLOW_UP_AFTER_DAYS,
        })}
      </p>
      {earlier && (
        <p className="field-hint">
          {t('This is a follow-up to your complaint of {date} to {name}.', {
            date: formatLongDate(earlier.sentDate, true),
            name: earlier.sentTo,
          })}
        </p>
      )}
      <form onSubmit={save} noValidate>
        <ErrorSummary errors={Object.values(errors)} ref={errorSummaryRef} />

        <TextField
          id="sentDate"
          type="date"
          label={t('Date you sent it')}
          value={form.sentDate}
          error={errors.sentDate}
          onChange={(v) => update('sentDate', v)}
        />

        <fieldset className="choice-group" aria-describedby={errors.sentTo ? 'sentTo-error' : undefined}>
          <legend>{t('Who did you send it to?')}</legend>
          {recipients.map((name) => (
            <label key={name} className="choice-card">
              <input type="radio" name="sentTo" checked={who === name} onChange={() => setWhoChoice(name)} />
              <span className="choice-label">{name}</span>
            </label>
          ))}
          <label className="choice-card">
            <input type="radio" name="sentTo" checked={who === OTHER} onChange={() => setWhoChoice(OTHER)} />
            <span className="choice-label">{t('Someone else (type the name)')}</span>
          </label>
          {errors.sentTo && <p id="sentTo-error" className="field-error">{errors.sentTo}</p>}
        </fieldset>
        {who === OTHER && (
          <TextField
            id="sentToName"
            label={t('Name of the person or office')}
            value={typed}
            onChange={(v) => {
              setWhoChoice(OTHER);
              setTypedName(v);
            }}
          />
        )}

        <fieldset className="choice-group" aria-describedby={errors.method ? 'method-error' : undefined}>
          <legend>{t('How did you send it?')}</legend>
          <div className="chip-row">
            {COMPLAINT_METHODS.map((method) => (
              <label key={method} className="chip">
                <input type="radio" name="method" checked={form.method === method} onChange={() => update('method', method)} />
                <span>{t(COMPLAINT_METHOD_LABELS[method])}</span>
              </label>
            ))}
          </div>
          {errors.method && <p id="method-error" className="field-error">{errors.method}</p>}
        </fieldset>

        <TextField
          id="referenceNumber"
          label={t('Reference or case number (optional)')}
          hint={t('If they gave you one. A follow-up letter will mention it.')}
          value={form.referenceNumber}
          onChange={(v) => update('referenceNumber', v)}
        />

        <div className="field">
          <label htmlFor="complaintNotes">{t('Notes (optional)')}</label>
          <textarea
            id="complaintNotes"
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>

        <button type="submit" className="button-primary">
          <Icon name="check" /> {t('Save')}
        </button>
      </form>
    </Screen>
  );
}
