// ---------------------------------------------------------------------------
// Complaints.tsx — "Complaints you sent": every complaint the rider
// recorded, with where it stands:
//   Waiting for an answer / Got an answer / Problem fixed / Not fixed
// Each one can be updated (status + notes). "Not fixed" shows what to do
// next: a follow-up letter, and contacting the state Medicaid office.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../AppContext';
import { ComplaintStatusBadge, ContactList } from '../components/ComplaintBits';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import {
  COMPLAINT_METHOD_LABELS,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_STATUSES,
  followUpDue,
  reminderDate,
  setComplaintStatus,
  sortComplaints,
} from '../lib/complaints';
import { formatLongDate } from '../lib/dates';
import { askConfirm, showSnackbar } from '../lib/feedback';
import { routeToHash } from '../lib/router';
import { getStateRule, type StateRule } from '../lib/stateRules';
import { useRideData } from '../lib/useRideData';
import type { ComplaintStatus, SentComplaint } from '../types';

export function Complaints({ id }: { id?: string }) {
  const { profile, storage, today } = useApp();
  const { data, reload } = useRideData();
  if (!profile || !data) return <Screen title="Complaints you sent"><p>Loading…</p></Screen>;
  const stateRule = getStateRule(profile.state);
  const complaints = sortComplaints(data.complaints);

  async function remove(complaint: SentComplaint) {
    const ok = await askConfirm({
      title: 'Delete this complaint record?',
      message: `The record of your complaint to ${complaint.sentTo} on ${formatLongDate(complaint.sentDate, true)} will be removed. Your ride records stay.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await storage.deleteComplaint(complaint.id);
    await reload();
    showSnackbar('Complaint record deleted.', {
      label: 'Undo',
      run: async () => {
        await storage.saveComplaint(complaint);
        await reload();
      },
    });
  }

  return (
    <Screen title="Complaints you sent" back={{ to: { name: 'report' }, label: 'Report' }}>
      <p>
        Keep track of each complaint after you send it. RideConnect reminds you to follow up if you haven't heard back
        in 14 days.
      </p>
      <div className="button-stack">
        <a href={routeToHash({ name: 'complaint-sent' })} className="button-secondary">
          <Icon name="plus" /> Record a complaint I sent
        </a>
        <a href={routeToHash({ name: 'complaint' })} className="button-secondary">
          <Icon name="mail" /> Write a new complaint letter
        </a>
      </div>

      {complaints.length === 0 ? (
        <p className="empty-note">
          No complaints recorded yet. After you send a complaint letter, tap "I sent this complaint" so RideConnect can
          remind you to follow up.
        </p>
      ) : (
        <ul className="plain-list complaint-list">
          {complaints.map((c) => (
            <li key={c.id}>
              <ComplaintCard
                complaint={c}
                earlier={c.followUpOf ? data.complaints.find((e) => e.id === c.followUpOf) : undefined}
                startOpen={c.id === id}
                today={today}
                stateRule={stateRule}
                onSave={async (changed) => {
                  await storage.saveComplaint(changed);
                  await reload();
                }}
                onDelete={() => remove(c)}
              />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}

interface CardProps {
  complaint: SentComplaint;
  earlier: SentComplaint | undefined;
  startOpen: boolean;
  today: string;
  stateRule: StateRule | undefined;
  onSave(changed: SentComplaint): Promise<void>;
  onDelete(): void;
}

function ComplaintCard({ complaint: c, earlier, startOpen, today, stateRule, onSave, onDelete }: CardProps) {
  // Opened from Home's "Add notes" link: start with the Update box open.
  // (After "Not fixed", show the next steps instead.)
  const [editing, setEditing] = useState(startOpen && c.status === 'waiting');
  const [status, setStatus] = useState<ComplaintStatus>(c.status);
  const [notes, setNotes] = useState(c.notes);
  const headingId = `complaint-${c.id}`;
  const cardRef = useRef<HTMLElement>(null);
  const due = followUpDue(c, today);

  // Opened from a reminder ("#/complaints/<id>"): scroll to it and move focus there.
  useEffect(() => {
    if (startOpen) cardRef.current?.focus();
  }, [startOpen]);

  function startEditing() {
    setStatus(c.status);
    setNotes(c.notes);
    setEditing(true);
  }

  async function save() {
    const changed = status === c.status ? c : setComplaintStatus(c, status, today);
    await onSave({ ...changed, notes: notes.trim() });
    setEditing(false);
    showSnackbar(status === 'not_fixed' ? 'Updated. See "What you can do next" below.' : 'Complaint updated.');
  }

  return (
    <article className="card complaint-card" aria-labelledby={headingId} ref={cardRef} tabIndex={-1}>
      <h2 id={headingId}>To {c.sentTo}</h2>
      <ComplaintStatusBadge status={c.status} />
      <dl className="complaint-facts">
        <dt>Sent</dt>
        <dd>{formatLongDate(c.sentDate, true)} by {COMPLAINT_METHOD_LABELS[c.method].toLowerCase()}</dd>
        {c.referenceNumber && (
          <>
            <dt>Reference number</dt>
            <dd>{c.referenceNumber}</dd>
          </>
        )}
        {earlier && (
          <>
            <dt>Follow-up to</dt>
            <dd>Your complaint of {formatLongDate(earlier.sentDate, true)}</dd>
          </>
        )}
        {c.status === 'waiting' && (
          <>
            <dt>Follow-up reminder</dt>
            <dd>{due ? 'Now: it has been 14 days or more' : formatLongDate(reminderDate(c), true)}</dd>
          </>
        )}
        {c.statusChangedOn && c.status !== 'waiting' && (
          <>
            <dt>Updated</dt>
            <dd>{formatLongDate(c.statusChangedOn, true)}</dd>
          </>
        )}
        {c.notes && !editing && (
          <>
            <dt>Notes</dt>
            <dd className="complaint-notes">{c.notes}</dd>
          </>
        )}
      </dl>

      {editing ? (
        <div className="complaint-editor">
          <fieldset className="choice-group">
            <legend>What happened?</legend>
            {COMPLAINT_STATUSES.map((s) => (
              <label key={s} className="choice-card">
                <input type="radio" name={`status-${c.id}`} checked={status === s} onChange={() => setStatus(s)} />
                <span className="choice-label">{COMPLAINT_STATUS_LABELS[s]}</span>
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor={`notes-${c.id}`}>Notes (optional)</label>
            <p id={`notes-${c.id}-hint`} className="field-hint">For example: who you talked to, or what they promised.</p>
            <textarea
              id={`notes-${c.id}`}
              rows={3}
              value={notes}
              aria-describedby={`notes-${c.id}-hint`}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="button-stack">
            <button type="button" className="button-primary" onClick={save}>
              <Icon name="check" /> Save
            </button>
            <button type="button" className="button-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="button-stack">
          <button type="button" className="button-secondary" onClick={startEditing}>
            Update status or notes
          </button>
        </div>
      )}

      {c.status === 'waiting' && due && !editing && (
        <p>
          No answer yet?{' '}
          <a href={routeToHash({ name: 'complaint', followUpOf: c.id })}>Write a follow-up letter</a>.
        </p>
      )}

      {c.status === 'not_fixed' && !editing && (
        <section className="next-steps" aria-labelledby={`${headingId}-next`}>
          <h3 id={`${headingId}-next`}>What you can do next</h3>
          <ol>
            <li>
              <p>
                <strong>Send a follow-up letter.</strong> It mentions your complaint of {formatLongDate(c.sentDate, true)}
                {c.referenceNumber ? ` (reference number ${c.referenceNumber})` : ''} and lists the problems since then.
              </p>
              <a href={routeToHash({ name: 'complaint', followUpOf: c.id })} className="button-primary">
                <Icon name="mail" /> Write a follow-up letter
              </a>
            </li>
            <li>
              <p>
                <strong>Contact your state Medicaid office.</strong> They oversee the ride program and can step in when a
                complaint isn't fixed.
              </p>
              <ContactList stateRule={stateRule} />
            </li>
          </ol>
        </section>
      )}

      <button type="button" className="link-button" onClick={onDelete}>
        Delete this record
      </button>
    </article>
  );
}
