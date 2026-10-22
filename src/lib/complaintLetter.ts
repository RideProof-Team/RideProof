// ---------------------------------------------------------------------------
// complaintLetter.ts — writes a formal complaint letter from the ride logs.
//
// The letter is written in the rider's voice ("my rides"), because the
// rider is the Medicaid member filing the complaint. In caregiver mode,
// a line at the end says who helped prepare it.
//
// The hardest part is making sentences read naturally for ANY data:
// "1 time" vs "5 times", one missed date vs several, dates in different
// years, and so on. Each of those is its own small function below.
// ---------------------------------------------------------------------------
import type { AppointmentType, ComplaintMethod, FailedBooking, Profile, RideLog, SentComplaint } from '../types';
import { attemptsInRange, describeAttempt } from './bookingAttempts';
import { daysSinceSent } from './complaints';
import { addDays, formatDateInSentence, formatLongDate, formatTime, parseDate } from './dates';
import { computeStats, hadProblem, logsInRange, plural, type ReportPeriod } from './reportStats';

// Kept here too, for screens that already import it from this file.
export { hadProblem };
import type { StateRule } from './stateRules';
import { timeLostLetterSentence } from './timeLost';

/** "October 14" or "October 14, 2026". */
function monthDay(date: string, withYear: boolean): string {
  return parseDate(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** Join words like a person would: "A", "A and B", "A, B, and C". */
export function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`;
}

/**
 * A list of dates in plain English. When they're all in the same year,
 * the year is said once at the end:
 *   ["2026-10-14"]               -> "October 14, 2026"
 *   ["2026-10-14", "2026-10-21"] -> "October 14 and October 21, 2026"
 */
export function joinDates(dates: string[]): string {
  const sameYear = new Set(dates.map((d) => d.slice(0, 4))).size === 1;
  if (!sameYear) return joinWords(dates.map((d) => monthDay(d, true)));
  const parts = dates.map((d, i) => monthDay(d, i === dates.length - 1));
  return joinWords(parts);
}

/** "Between September 30 and October 28, 2026," (or "On October 14, 2026,"). */
export function dateRangePhrase(first: string, last: string): string {
  if (first === last) return `On ${monthDay(first, true)},`;
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  return `Between ${monthDay(first, !sameYear)} and ${monthDay(last, true)},`;
}

/** The kind of appointment, as it fits in "my ___ appointment". */
const TYPE_WORDS: Record<AppointmentType, string> = {
  dialysis: 'dialysis',
  checkup: 'checkup',
  specialist: 'specialist',
  therapy: 'therapy',
  other: 'medical',
};

/** "my dialysis appointment" / "my dialysis appointments" / "my medical appointments". */
function appointmentWords(logs: RideLog[]): string {
  const types = new Set(logs.map((l) => l.appointmentType));
  const word = types.size === 1 ? TYPE_WORDS[logs[0].appointmentType] : 'medical';
  return `my ${word} ${logs.length === 1 ? 'appointment' : 'appointments'}`;
}

/**
 * The key sentence, built from ALL rides logged in the period (so the date
 * range covers every logged ride, not just the bad ones). For example:
 * "Between September 30 and October 28, 2026, my scheduled rides were late
 *  5 times and did not arrive 2 times, causing me to miss my dialysis
 *  appointment on October 14, 2026."
 */
export function summarySentence(logs: RideLog[]): string {
  if (logs.length === 0) return '';
  const sorted = [...logs].sort((a, b) => a.rideDate.localeCompare(b.rideDate));
  const first = sorted[0].rideDate;
  const last = sorted[sorted.length - 1].rideDate;
  const late = sorted.filter((l) => l.pickupStatus === 'late').length;
  const noShow = sorted.filter((l) => l.pickupStatus === 'never_came').length;
  const missed = sorted.filter((l) => l.appointmentOutcome === 'missed');

  const problems: string[] = [];
  if (late > 0) problems.push(`were late ${plural(late, 'time', 'times')}`);
  if (noShow > 0) problems.push(`did not arrive ${plural(noShow, 'time', 'times')}`);

  const missedPart = missed.length > 0 ? `${appointmentWords(missed)} on ${joinDates(missed.map((l) => l.rideDate))}` : '';

  if (problems.length > 0) {
    const causing = missedPart ? `, causing me to miss ${missedPart}` : '';
    return `${dateRangePhrase(first, last)} my scheduled rides ${problems.join(' and ')}${causing}.`;
  }
  // No pickup problems: the missed dates already say when, so no date range is needed.
  if (missedPart) return `I missed ${missedPart}.`;
  return '';
}

/** Extra sentences about the ride home and very late pickups. */
export function extraSentences(logs: RideLog[]): string[] {
  const sentences: string[] = [];
  const stranded = logs.filter((l) => l.returnRideStatus === 'never_came').map((l) => l.rideDate).sort();
  const lateReturns = logs.filter((l) => l.returnRideStatus === 'late').length;
  const veryLate = logs.filter((l) => l.pickupStatus === 'late' && l.minutesLate === 60).length;

  if (veryLate > 0) {
    sentences.push(
      veryLate === 1
        ? 'One of these pickups was an hour or more late.'
        : `${veryLate} of these pickups were an hour or more late.`,
    );
  }
  if (stranded.length > 0) {
    sentences.push(`My ride home never came on ${joinDates(stranded)}, leaving me stranded after my appointment.`);
  }
  if (lateReturns > 0) {
    sentences.push(`My ride home was also late ${plural(lateReturns, 'time', 'times')}.`);
  }
  return sentences;
}

/** "Scheduled for 8:15 AM; the driver came at 9:20 AM." (or '' if no times). */
export function pickupTimesText(log: RideLog): string {
  const parts: string[] = [];
  if (log.scheduledPickup) parts.push(`Scheduled for ${formatTime(log.scheduledPickup)}`);
  if (log.actualPickup) parts.push(`${parts.length ? 'the driver' : 'The driver'} came at ${formatTime(log.actualPickup)}`);
  return parts.length ? `${parts.join('; ')}.` : '';
}

/** One line describing what went wrong on one ride. */
export function describeProblem(log: RideLog): string {
  const parts: string[] = [];
  if (log.pickupStatus === 'never_came') parts.push('The ride never came');
  if (log.pickupStatus === 'late') {
    parts.push(log.minutesLate === 60 ? 'Pickup was an hour or more late' : `Pickup was about ${log.minutesLate ?? 15} minutes late`);
  }
  if (log.appointmentOutcome === 'missed') parts.push(`I missed my ${TYPE_WORDS[log.appointmentType]} appointment`);
  if (log.appointmentOutcome === 'late') parts.push('I arrived late to my appointment');
  if (log.returnRideStatus === 'never_came') parts.push('My ride home never came');
  if (log.returnRideStatus === 'late') {
    parts.push(
      log.returnMinutesLate === 60
        ? 'My ride home was an hour or more late'
        : log.returnMinutesLate
          ? `My ride home was about ${log.returnMinutesLate} minutes late`
          : 'My ride home was late',
    );
  }
  let line = parts.join('. ') + '.';
  const times = pickupTimesText(log);
  if (times) line += ` Pickup was ${times.charAt(0).toLowerCase()}${times.slice(1)}`;
  if (log.notes) line += ` Note: "${log.notes}"`;
  return line;
}


export interface LetterInput {
  profile: Profile;
  logs: RideLog[];
  period: ReportPeriod;
  today: string;
  stateRule: StateRule | undefined;
  /** Calls to book a ride that didn't work (optional). */
  attempts?: FailedBooking[];
}

/** "I also called to book a ride 1 time and could not get one booked (on October 29, 2026)." */
export function attemptsLetterSentence(attempts: FailedBooking[]): string {
  if (attempts.length === 0) return '';
  const days = [...new Set(attempts.map((a) => a.attemptedOn))].sort();
  return `I also called to book a ride ${plural(attempts.length, 'time', 'times')} and could not get one booked (on ${joinDates(days)}).`;
}

/** The "- date: what happened" lines for failed booking calls. */
function attemptLines(attempts: FailedBooking[]): string[] {
  if (attempts.length === 0) return [];
  return [
    '',
    'Calls to book a ride that did not work:',
    '',
    ...attempts.map((a) => `- ${formatLongDate(a.attemptedOn, true)}: ${describeAttempt(a)}`),
  ];
}

/** The whole letter as plain text, ready to edit, copy, email, or print. */
export function buildComplaintLetter({ profile, logs, period, today, stateRule, attempts = [] }: LetterInput): string {
  const inRange = logsInRange(logs, period.from, period.to);
  const problems = inRange.filter(hadProblem);
  const stats = computeStats(logs, period.from, period.to, attempts);
  const failed = attemptsInRange(attempts, period.from, period.to);
  const recipients = stateRule?.complaintContacts.map((c) => c.name) ?? [];
  const plan = profile.healthPlanName ? ` enrolled in ${profile.healthPlanName}` : '';
  const anyDialysis = problems.some((l) => l.appointmentType === 'dialysis');

  const lines: string[] = [];
  lines.push(formatLongDate(today, true));
  lines.push('');
  if (recipients.length > 0) lines.push(`To: ${recipients.join('; ')}`);
  lines.push('Re: Complaint about Medicaid non-emergency medical transportation (NEMT)');
  lines.push('');
  lines.push('To whom it may concern:');
  lines.push('');
  lines.push(
    `My name is ${profile.riderFirstName}. I am a Medicaid member${plan}, and I depend on ${profile.rideCompanyName} ` +
      'for rides to my medical appointments. I am writing to file a formal complaint about repeated problems with these rides.',
  );
  lines.push('');
  lines.push(
    [summarySentence(inRange), ...extraSentences(inRange), timeLostLetterSentence(stats), attemptsLetterSentence(failed)]
      .filter(Boolean)
      .join(' '),
  );
  lines.push('');
  if (problems.length > 0) {
    lines.push(
      `In total, I logged ${plural(stats.totalRides, 'ride', 'rides')} during this time, and ` +
        `${plural(problems.length, 'ride', 'rides')} had a problem. Here is my record of each one:`,
    );
    lines.push('');
    for (const log of problems) {
      lines.push(`- ${formatLongDate(log.rideDate, true)}: ${describeProblem(log)}`);
    }
  }
  lines.push(...attemptLines(failed));
  lines.push('');
  lines.push(
    anyDialysis
      ? 'Dialysis is a life-sustaining treatment. Missing or shortening a session puts my health at serious risk.'
      : 'These problems make it hard for me to get the medical care I need.',
  );
  lines.push('');
  lines.push('I am asking you to:');
  lines.push('1. Investigate these incidents.');
  lines.push('2. Take steps to make sure my future rides arrive on time.');
  lines.push('3. Respond to me in writing about what will be done.');
  lines.push('');
  lines.push('I kept a record of each ride with its date. I can share the full record if needed.');
  lines.push('');
  lines.push(...signOff(profile));
  return lines.join('\n');
}

/** "Sincerely," and the name, plus who helped (caregiver mode). */
function signOff(profile: Profile): string[] {
  const lines = ['Sincerely,', '', profile.riderFirstName, '[Your full name, Medicaid ID number, and phone number]'];
  if (profile.role === 'caregiver') {
    lines.push('');
    lines.push(
      profile.caregiverName
        ? `This letter was prepared with help from my caregiver, ${profile.caregiverName}.`
        : 'This letter was prepared with help from my caregiver.',
    );
  }
  return lines;
}

// ---------------------------------------------------------------------------
// The follow-up letter: for when a complaint wasn't answered or the problem
// wasn't fixed. It points back to the first complaint (its date and
// reference number) and lists the NEW problems logged since that day.
// ---------------------------------------------------------------------------

/** "sent a complaint to X by email", "mailed a complaint to X", ... */
export function sentPhrase(method: ComplaintMethod, to: string): string {
  switch (method) {
    case 'email':
      return `sent a complaint to ${to} by email`;
    case 'mail':
      return `mailed a complaint to ${to}`;
    case 'phone':
      return `made a complaint to ${to} by phone`;
    case 'online_form':
      return `sent a complaint to ${to} through their online form`;
  }
}

export interface FollowUpInput {
  profile: Profile;
  logs: RideLog[];
  /** The complaint this letter follows up on. */
  complaint: SentComplaint;
  today: string;
  attempts?: FailedBooking[];
}

export function buildFollowUpLetter({ profile, logs, complaint, today, attempts = [] }: FollowUpInput): string {
  // "Since then" = from the day after the complaint was sent, up to today.
  // Counted with computeStats, like every other number in the app.
  const from = addDays(complaint.sentDate, 1);
  const inRange = logsInRange(logs, from, today);
  const stats = computeStats(logs, from, today, attempts);
  const problems = inRange.filter(hadProblem);
  const failed = attemptsInRange(attempts, from, today);
  const sentOn = formatDateInSentence(complaint.sentDate);
  const reference = complaint.referenceNumber ? ` (reference number ${complaint.referenceNumber})` : '';
  const plan = profile.healthPlanName ? ` enrolled in ${profile.healthPlanName}` : '';
  const days = daysSinceSent(complaint, today);

  const lines: string[] = [];
  lines.push(formatLongDate(today, true));
  lines.push('');
  lines.push(`To: ${complaint.sentTo}`);
  lines.push(`Re: Follow-up to my complaint of ${sentOn}${reference} about Medicaid non-emergency medical transportation (NEMT)`);
  lines.push('');
  lines.push('To whom it may concern:');
  lines.push('');
  lines.push(
    `My name is ${profile.riderFirstName}. I am a Medicaid member${plan}, and I depend on ${profile.rideCompanyName} ` +
      'for rides to my medical appointments.',
  );
  lines.push('');

  const statusSentence =
    complaint.status === 'waiting'
      ? `As of today, ${days} ${days === 1 ? 'day' : 'days'} later, I have not received an answer.`
      : complaint.status === 'answered'
        ? 'I received an answer, but I am still waiting for the problems to be fixed.'
        : complaint.status === 'fixed'
          ? 'I was told the problems were fixed, but new problems have happened since then.'
          : 'The problems I reported have not been fixed.';
  lines.push(
    `On ${sentOn}, I ${sentPhrase(complaint.method, complaint.sentTo)} about repeated problems with these rides` +
      `${complaint.referenceNumber ? `. The reference number is ${complaint.referenceNumber}` : ''}. ${statusSentence}`,
  );
  lines.push('');

  if (problems.length > 0 || failed.length > 0) {
    lines.push(
      [
        'Since my complaint, the problems have continued.',
        summarySentence(inRange),
        ...extraSentences(inRange),
        timeLostLetterSentence(stats),
        attemptsLetterSentence(failed),
      ]
        .filter(Boolean)
        .join(' '),
    );
    if (problems.length > 0) {
      lines.push('');
      lines.push(
        `Since ${sentOn}, I logged ${plural(stats.totalRides, 'ride', 'rides')}, and ` +
          `${plural(problems.length, 'ride', 'rides')} had a problem. Here is my record of each new one:`,
      );
      lines.push('');
      for (const log of problems) lines.push(`- ${formatLongDate(log.rideDate, true)}: ${describeProblem(log)}`);
    }
    lines.push(...attemptLines(failed));
  } else {
    lines.push(
      stats.totalRides > 0
        ? `I have not logged any new ride problems since ${sentOn}, but my original complaint still needs an answer.`
        : `I have not logged any rides since ${sentOn}, but my original complaint still needs an answer.`,
    );
  }
  lines.push('');
  lines.push('I am asking you to:');
  lines.push(`1. Respond in writing to my complaint of ${sentOn}${reference}.`);
  const anyNew = problems.length > 0 || failed.length > 0;
  if (anyNew) lines.push('2. Investigate the new incidents listed above.');
  lines.push(`${anyNew ? 3 : 2}. Tell me what will be done to make sure my rides arrive on time.`);
  lines.push('');
  lines.push(
    'If this is not resolved, I plan to contact my state Medicaid office. I kept a dated record of each ride and can share it if needed.',
  );
  lines.push('');
  lines.push(...signOff(profile));
  return lines.join('\n');
}
