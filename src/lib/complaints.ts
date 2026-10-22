// ---------------------------------------------------------------------------
// complaints.ts — keeping track of complaints after they're sent.
//
// Sending a complaint is only half the job: the rider also needs to know
// whether anyone answered, and what to do if nothing changed. This file
// holds the rules (no screen code), so they can be unit tested:
//   - 14 days after sending, if there's still no answer, remind the rider
//     ("Did you hear back?"). "Remind me later" pushes it back 7 days.
//   - Changing the status (Waiting / Got an answer / Problem fixed / Not fixed)
//   - Checking the "I sent this complaint" form
// The follow-up letter itself is written in complaintLetter.ts.
// ---------------------------------------------------------------------------
import type { ComplaintMethod, ComplaintStatus, SentComplaint } from '../types';
import { addDays, formatDateInSentence, parseDate } from './dates';
import { msg, t, tn } from './i18n';

/** Ask "Did you hear back?" this many days after the complaint was sent. */
export const FOLLOW_UP_AFTER_DAYS = 14;
/** "Remind me later" waits this many more days. */
export const REMIND_AGAIN_DAYS = 7;

export const COMPLAINT_METHOD_LABELS: Record<ComplaintMethod, string> = {
  email: msg('Email'),
  mail: msg('Mail'),
  phone: msg('Phone call'),
  online_form: msg('Online form'),
};

export const COMPLAINT_METHODS: ComplaintMethod[] = ['email', 'mail', 'phone', 'online_form'];

/** The words for each status. (Screens add an icon and a color too.) */
export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  waiting: msg('Waiting for an answer'),
  answered: msg('Got an answer'),
  fixed: msg('Problem fixed'),
  not_fixed: msg('Not fixed'),
};

export const COMPLAINT_STATUSES: ComplaintStatus[] = ['waiting', 'answered', 'fixed', 'not_fixed'];

/** The day the "Did you hear back?" reminder should appear. */
export function reminderDate(complaint: SentComplaint): string {
  return complaint.remindOn ?? addDays(complaint.sentDate, FOLLOW_UP_AFTER_DAYS);
}

/**
 * Should Home ask "Did you hear back?" today? Only while the rider is still
 * waiting for an answer, and only once the reminder day has come.
 * (Dates are "YYYY-MM-DD" text, so they compare correctly as text.)
 */
export function followUpDue(complaint: SentComplaint, today: string): boolean {
  return complaint.status === 'waiting' && today >= reminderDate(complaint);
}

/** All complaints that need a "Did you hear back?" reminder, oldest first. */
export function dueFollowUps(complaints: SentComplaint[], today: string): SentComplaint[] {
  return sortComplaints(complaints.filter((c) => followUpDue(c, today))).reverse();
}

/** Newest first (the order the Complaints list uses). */
export function sortComplaints(complaints: SentComplaint[]): SentComplaint[] {
  return [...complaints].sort((a, b) => b.sentDate.localeCompare(a.sentDate) || b.id.localeCompare(a.id));
}

/** Whole days between the day it was sent and today. */
export function daysSinceSent(complaint: SentComplaint, today: string): number {
  return Math.round((parseDate(today).getTime() - parseDate(complaint.sentDate).getTime()) / 86_400_000);
}

/** Change the status. Going back to "Waiting" restarts the reminder from today. */
export function setComplaintStatus(complaint: SentComplaint, status: ComplaintStatus, today: string): SentComplaint {
  const changed: SentComplaint = { ...complaint, status, statusChangedOn: today };
  if (status === 'waiting' && complaint.status !== 'waiting') changed.remindOn = addDays(today, REMIND_AGAIN_DAYS);
  return changed;
}

/** "Still waiting — remind me later": ask again in 7 days. */
export function remindLater(complaint: SentComplaint, today: string): SentComplaint {
  return { ...complaint, remindOn: addDays(today, REMIND_AGAIN_DAYS) };
}

/** The words for the Home reminder and the phone notification. */
export function followUpReminderText(complaint: SentComplaint, today: string): { title: string; body: string } {
  const days = daysSinceSent(complaint, today);
  return {
    title: t('Did you hear back from {to}?', { to: complaint.sentTo }),
    body: tn(days, 'You sent a complaint on {date} ({n} day ago){reference}.', 'You sent a complaint on {date} ({n} days ago){reference}.', {
      date: formatDateInSentence(complaint.sentDate),
      reference: complaint.referenceNumber ? t(', reference number {number}', { number: complaint.referenceNumber }) : '',
    }),
  };
}

// ----- The "I sent this complaint" form -----

export interface SentComplaintInput {
  sentDate: string;
  sentTo: string;
  method: ComplaintMethod | '';
  referenceNumber: string;
  notes: string;
}

export type SentComplaintErrors = Partial<Record<'sentDate' | 'sentTo' | 'method', string>>;

/** Check the form. Returns plain-language messages for anything that's wrong. */
export function validateSentComplaint(input: SentComplaintInput, today: string): SentComplaintErrors {
  const errors: SentComplaintErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sentDate)) errors.sentDate = t('Enter the date you sent the complaint.');
  else if (input.sentDate > today) errors.sentDate = t("The date sent can't be in the future.");
  if (!input.sentTo.trim()) errors.sentTo = t('Choose or type who you sent the complaint to.');
  if (!input.method) errors.method = t('Choose how you sent the complaint.');
  return errors;
}

/** Turn a checked form into a complaint record (status starts as "Waiting"). */
export function newSentComplaint(id: string, input: SentComplaintInput, followUpOf?: string): SentComplaint {
  return {
    id,
    sentDate: input.sentDate,
    sentTo: input.sentTo.trim(),
    method: input.method as ComplaintMethod,
    referenceNumber: input.referenceNumber.trim(),
    status: 'waiting',
    notes: input.notes.trim(),
    ...(followUpOf ? { followUpOf } : {}),
  };
}
