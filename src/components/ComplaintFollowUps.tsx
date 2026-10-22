// ---------------------------------------------------------------------------
// ComplaintFollowUps.tsx — the "Did you hear back?" box on Home.
//
// 14 days after a complaint was sent, if it's still "Waiting", this asks
// what happened, with one-tap answers. (The timing rules are in
// lib/complaints.ts.) If allowed, the same reminder is sent as a phone
// notification once a day (real mode only, like the booking reminders).
// ---------------------------------------------------------------------------
import { useEffect } from 'react';
import { useApp } from '../AppContext';
import { followUpReminderText, remindLater, REMIND_AGAIN_DAYS, setComplaintStatus } from '../lib/complaints';
import { showSnackbar } from '../lib/feedback';
import { notificationPermission, notifyOncePerDay } from '../lib/notifications';
import { navigate, routeToHash } from '../lib/router';
import type { ComplaintStatus, SentComplaint } from '../types';
import { Icon } from './Icon';

interface Props {
  due: SentComplaint[];
  onChange(): Promise<void>;
}

export function ComplaintFollowUps({ due, onChange }: Props) {
  const { storage, mode, today } = useApp();

  const key = due.map((c) => c.id).join(',');
  useEffect(() => {
    if (mode !== 'real' || notificationPermission() !== 'granted') return;
    for (const complaint of due) {
      const { title, body } = followUpReminderText(complaint, today);
      notifyOncePerDay(mode, `complaint:${complaint.id}`, today, title, `${body} Open RideConnect to update what happened.`);
    }
    // `key` changes only when the list of due complaints really changes.
  }, [key, mode, today]);

  if (due.length === 0) return null;

  async function save(before: SentComplaint, after: SentComplaint, message: string) {
    await storage.saveComplaint(after);
    await onChange();
    showSnackbar(message, {
      label: 'Undo',
      run: async () => {
        await storage.saveComplaint(before);
        await onChange();
      },
    });
  }

  async function answer(complaint: SentComplaint, status: ComplaintStatus) {
    await save(complaint, setComplaintStatus(complaint, status, today), 'Complaint updated.');
    // "Not fixed": go straight to the next steps.
    if (status === 'not_fixed') navigate({ name: 'complaints', id: complaint.id });
  }

  return (
    <section className="card card-reminder" aria-labelledby="followup-heading">
      <h2 id="followup-heading">
        <Icon name="mail" /> Complaint follow-up
      </h2>
      <ul className="plain-list">
        {due.map((complaint) => {
          const { title, body } = followUpReminderText(complaint, today);
          return (
            <li key={complaint.id} className="reminder-item">
              <p className="reminder-title">{title}</p>
              <p>{body}</p>
              <div className="button-stack">
                <button type="button" className="button-secondary" onClick={() => answer(complaint, 'answered')}>
                  <Icon name="mail" /> Got an answer
                </button>
                <button type="button" className="button-secondary" onClick={() => answer(complaint, 'fixed')}>
                  <Icon name="check" /> Problem fixed
                </button>
                <button type="button" className="button-secondary" onClick={() => answer(complaint, 'not_fixed')}>
                  <Icon name="x" /> Not fixed
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => save(complaint, remindLater(complaint, today), `OK. RideConnect will ask again in ${REMIND_AGAIN_DAYS} days.`)}
                >
                  <Icon name="clock" /> Still waiting: remind me in {REMIND_AGAIN_DAYS} days
                </button>
                <a href={routeToHash({ name: 'complaints', id: complaint.id })} className="link-button">
                  Add notes or see details
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
