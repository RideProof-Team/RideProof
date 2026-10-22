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
import { atTime, onePeriod } from './callScript';
import { daysSinceSent } from './complaints';
import { addDays, capitalize, formatDateInSentence, formatLongDate, parseDate } from './dates';
import { getLanguage, locale, msg, t, tn } from './i18n';
import { computeStats, hadProblem, logsInRange, type ReportPeriod } from './reportStats';

// Kept here too, for screens that already import it from this file.
export { hadProblem };
import type { StateRule } from './stateRules';
import { timeLostLetterSentence } from './timeLost';

/** "October 14" or "October 14, 2026" (Spanish: "14 de octubre de 2026"). */
function monthDay(date: string, withYear: boolean): string {
  return parseDate(date).toLocaleDateString(locale(), {
    month: 'long',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** Join words like a person would: "A", "A and B", "A, B, and C" (Spanish: "A, B y C"). */
export function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  if (words.length === 2) return t('{first} and {last}', { first: words[0], last: words[1] });
  return t('{list}, and {last}', { list: words.slice(0, -1).join(', '), last: words[words.length - 1] });
}

/**
 * A list of dates in plain English. When they're all in the same year,
 * the year is said once at the end:
 *   ["2026-10-14"]               -> "October 14, 2026"
 *   ["2026-10-14", "2026-10-21"] -> "October 14 and October 21, 2026"
 * Spanish also says the month once when it's the same:
 *   "14 y 21 de octubre de 2026".
 */
export function joinDates(dates: string[]): string {
  if (getLanguage() === 'es') return joinDatesSpanish(dates);
  const sameYear = new Set(dates.map((d) => d.slice(0, 4))).size === 1;
  if (!sameYear) return joinWords(dates.map((d) => monthDay(d, true)));
  const parts = dates.map((d, i) => monthDay(d, i === dates.length - 1));
  return joinWords(parts);
}

/** "14 y 21 de octubre de 2026", "30 de septiembre y 14 de octubre de 2026". */
function joinDatesSpanish(dates: string[]): string {
  // Group the dates by year (keeping their order); each year is said once, at the end of its group.
  const years: string[][] = [];
  for (const date of dates) {
    const group = years[years.length - 1];
    if (group && group[0].slice(0, 4) === date.slice(0, 4)) group.push(date);
    else years.push([date]);
  }
  return joinWords(
    years.map((group) => {
      const last = group[group.length - 1];
      const sameMonth = new Set(group.map((d) => d.slice(0, 7))).size === 1;
      const parts = sameMonth
        ? [...group.slice(0, -1).map((d) => String(parseDate(d).getDate())), monthDay(last, true)]
        : group.map((d, i) => monthDay(d, i === group.length - 1));
      return joinWords(parts);
    }),
  );
}

/** "on October 14, 2026" / "on October 14 and October 21, 2026" (Spanish: "el ..." / "los días ..."). */
export function onDates(dates: string[]): string {
  return dates.length === 1 ? t('on {day}', { day: joinDates(dates) }) : t('on {days}', { days: joinDates(dates) });
}

/** "Between September 30 and October 28, 2026," (or "On October 14, 2026,"). */
export function dateRangePhrase(first: string, last: string): string {
  if (first === last) return t('On {date},', { date: monthDay(first, true) });
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  return t('Between {first} and {last},', { first: monthDay(first, !sameYear), last: monthDay(last, true) });
}

/** "my dialysis appointment" / "my dialysis appointments", by kind of appointment. */
const MY_APPOINTMENTS: Record<AppointmentType, [string, string]> = {
  dialysis: [msg('my dialysis appointment'), msg('my dialysis appointments')],
  checkup: [msg('my checkup appointment'), msg('my checkup appointments')],
  specialist: [msg('my specialist appointment'), msg('my specialist appointments')],
  therapy: [msg('my therapy appointment'), msg('my therapy appointments')],
  other: [msg('my medical appointment'), msg('my medical appointments')],
};

/** "my dialysis appointment" / "my dialysis appointments" / "my medical appointments". */
function appointmentWords(logs: RideLog[]): string {
  const types = new Set(logs.map((l) => l.appointmentType));
  const [one, many] = MY_APPOINTMENTS[types.size === 1 ? logs[0].appointmentType : 'other'];
  return t(logs.length === 1 ? one : many);
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
  if (late > 0) problems.push(tn(late, 'were late {n} time', 'were late {n} times'));
  if (noShow > 0) problems.push(tn(noShow, 'did not arrive {n} time', 'did not arrive {n} times'));

  const missedPart = missed.length > 0 ? `${appointmentWords(missed)} ${onDates(missed.map((l) => l.rideDate))}` : '';

  if (problems.length > 0) {
    const causing = missedPart ? t(', causing me to miss {missed}', { missed: missedPart }) : '';
    return t('{when} my scheduled rides {problems}{causing}.', {
      when: dateRangePhrase(first, last),
      problems: joinWords(problems),
      causing,
    });
  }
  // No pickup problems: the missed dates already say when, so no date range is needed.
  if (missedPart) return t('I missed {missed}.', { missed: missedPart });
  return '';
}

/** Extra sentences about the ride home and very late pickups. */
export function extraSentences(logs: RideLog[]): string[] {
  const sentences: string[] = [];
  const stranded = logs.filter((l) => l.returnRideStatus === 'never_came').map((l) => l.rideDate).sort();
  const lateReturns = logs.filter((l) => l.returnRideStatus === 'late').length;
  const veryLate = logs.filter((l) => l.pickupStatus === 'late' && l.minutesLate === 60).length;

  if (veryLate > 0) {
    sentences.push(tn(veryLate, 'One of these pickups was an hour or more late.', '{n} of these pickups were an hour or more late.'));
  }
  if (stranded.length > 0) {
    sentences.push(t('My ride home never came {when}, leaving me stranded after my appointment.', { when: onDates(stranded) }));
  }
  if (lateReturns > 0) {
    sentences.push(tn(lateReturns, 'My ride home was also late {n} time.', 'My ride home was also late {n} times.'));
  }
  return sentences;
}

/** "Scheduled for 8:15 AM; the driver came at 9:20 AM." (or '' if no times). */
export function pickupTimesText(log: RideLog): string {
  const parts: string[] = [];
  if (log.scheduledPickup) parts.push(t('Scheduled for {time}', { time: atTime(log.scheduledPickup) }));
  if (log.actualPickup) {
    const time = atTime(log.actualPickup);
    parts.push(parts.length ? t('the driver came at {time}', { time }) : t('The driver came at {time}', { time }));
  }
  return parts.length ? onePeriod(`${parts.join('; ')}.`) : '';
}

/** One line describing what went wrong on one ride. */
export function describeProblem(log: RideLog): string {
  const parts: string[] = [];
  if (log.pickupStatus === 'never_came') parts.push(t('The ride never came'));
  if (log.pickupStatus === 'late') {
    parts.push(
      log.minutesLate === 60
        ? t('Pickup was an hour or more late')
        : t('Pickup was about {minutes} minutes late', { minutes: log.minutesLate ?? 15 }),
    );
  }
  if (log.appointmentOutcome === 'missed') parts.push(t('I missed {appointment}', { appointment: t(MY_APPOINTMENTS[log.appointmentType][0]) }));
  if (log.appointmentOutcome === 'late') parts.push(t('I arrived late to my appointment'));
  if (log.returnRideStatus === 'never_came') parts.push(t('My ride home never came'));
  if (log.returnRideStatus === 'late') {
    parts.push(
      log.returnMinutesLate === 60
        ? t('My ride home was an hour or more late')
        : log.returnMinutesLate
          ? t('My ride home was about {minutes} minutes late', { minutes: log.returnMinutesLate })
          : t('My ride home was late'),
    );
  }
  let line = parts.join('. ') + '.';
  const times = pickupTimesText(log);
  if (times) line += ` ${t('Pickup was {times}', { times: `${times.charAt(0).toLowerCase()}${times.slice(1)}` })}`;
  if (log.notes) line += ` ${t('Note: "{note}"', { note: log.notes })}`;
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
  return tn(
    attempts.length,
    'I also called to book a ride {n} time and could not get one booked ({when}).',
    'I also called to book a ride {n} times and could not get one booked ({when}).',
    { when: onDates(days) },
  );
}

/** "- Wednesday, October 14, 2026: ..." (capitalized, since Spanish weekdays are lowercase). */
function dateLine(date: string, text: string): string {
  return `- ${capitalize(formatLongDate(date, true))}: ${text}`;
}

/** The "- date: what happened" lines for failed booking calls. */
function attemptLines(attempts: FailedBooking[]): string[] {
  if (attempts.length === 0) return [];
  return [
    '',
    t('Calls to book a ride that did not work:'),
    '',
    ...attempts.map((a) => dateLine(a.attemptedOn, describeAttempt(a))),
  ];
}

/** "1 ride had a problem" / "3 rides had a problem". */
function ridesWithProblems(count: number): string {
  return tn(count, '{n} ride had a problem', '{n} rides had a problem');
}

/** "My name is ... I am a Medicaid member ..., and I depend on ... for rides ..." */
function introduction(profile: Profile): string {
  const plan = profile.healthPlanName ? t(' enrolled in {plan}', { plan: profile.healthPlanName }) : '';
  return t('My name is {name}. I am a Medicaid member{plan}, and I depend on {company} for rides to my medical appointments.', {
    name: profile.riderFirstName,
    plan,
    company: profile.rideCompanyName,
  });
}

/** The whole letter as plain text, ready to edit, copy, email, or print. */
export function buildComplaintLetter({ profile, logs, period, today, stateRule, attempts = [] }: LetterInput): string {
  const inRange = logsInRange(logs, period.from, period.to);
  const problems = inRange.filter(hadProblem);
  const stats = computeStats(logs, period.from, period.to, attempts);
  const failed = attemptsInRange(attempts, period.from, period.to);
  const recipients = stateRule?.complaintContacts.map((c) => c.name) ?? [];
  const anyDialysis = problems.some((l) => l.appointmentType === 'dialysis');

  const lines: string[] = [];
  lines.push(capitalize(formatLongDate(today, true)));
  lines.push('');
  if (recipients.length > 0) lines.push(t('To: {recipients}', { recipients: recipients.join('; ') }));
  lines.push(t('Re: Complaint about Medicaid non-emergency medical transportation (NEMT)'));
  lines.push('');
  lines.push(t('To whom it may concern:'));
  lines.push('');
  lines.push(`${introduction(profile)} ${t('I am writing to file a formal complaint about repeated problems with these rides.')}`);
  lines.push('');
  lines.push(
    [summarySentence(inRange), ...extraSentences(inRange), timeLostLetterSentence(stats), attemptsLetterSentence(failed)]
      .filter(Boolean)
      .join(' '),
  );
  lines.push('');
  if (problems.length > 0) {
    lines.push(
      t('In total, I logged {rides} during this time, and {problems}. Here is my record of each one:', {
        rides: tn(stats.totalRides, '{n} ride', '{n} rides'),
        problems: ridesWithProblems(problems.length),
      }),
    );
    lines.push('');
    for (const log of problems) {
      lines.push(dateLine(log.rideDate, describeProblem(log)));
    }
  }
  lines.push(...attemptLines(failed));
  lines.push('');
  lines.push(
    anyDialysis
      ? t('Dialysis is a life-sustaining treatment. Missing or shortening a session puts my health at serious risk.')
      : t('These problems make it hard for me to get the medical care I need.'),
  );
  lines.push('');
  lines.push(t('I am asking you to:'));
  lines.push(t('1. Investigate these incidents.'));
  lines.push(t('2. Take steps to make sure my future rides arrive on time.'));
  lines.push(t('3. Respond to me in writing about what will be done.'));
  lines.push('');
  lines.push(t('I kept a record of each ride with its date. I can share the full record if needed.'));
  lines.push('');
  lines.push(...signOff(profile));
  return lines.join('\n');
}

/** "Sincerely," and the name, plus who helped (caregiver mode). */
function signOff(profile: Profile): string[] {
  const lines = [t('Sincerely,'), '', profile.riderFirstName, t('[Your full name, Medicaid ID number, and phone number]')];
  if (profile.role === 'caregiver') {
    lines.push('');
    lines.push(
      profile.caregiverName
        ? t('This letter was prepared with help from my caregiver, {name}.', { name: profile.caregiverName })
        : t('This letter was prepared with help from my caregiver.'),
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
      return t('sent a complaint to {to} by email', { to });
    case 'mail':
      return t('mailed a complaint to {to}', { to });
    case 'phone':
      return t('made a complaint to {to} by phone', { to });
    case 'online_form':
      return t('sent a complaint to {to} through their online form', { to });
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
  const reference = complaint.referenceNumber ? t(' (reference number {number})', { number: complaint.referenceNumber }) : '';
  const days = daysSinceSent(complaint, today);

  const lines: string[] = [];
  lines.push(capitalize(formatLongDate(today, true)));
  lines.push('');
  lines.push(t('To: {recipients}', { recipients: complaint.sentTo }));
  lines.push(
    t('Re: Follow-up to my complaint of {date}{reference} about Medicaid non-emergency medical transportation (NEMT)', {
      date: sentOn,
      reference,
    }),
  );
  lines.push('');
  lines.push(t('To whom it may concern:'));
  lines.push('');
  lines.push(introduction(profile));
  lines.push('');

  const statusSentence =
    complaint.status === 'waiting'
      ? tn(days, 'As of today, {n} day later, I have not received an answer.', 'As of today, {n} days later, I have not received an answer.')
      : complaint.status === 'answered'
        ? t('I received an answer, but I am still waiting for the problems to be fixed.')
        : complaint.status === 'fixed'
          ? t('I was told the problems were fixed, but new problems have happened since then.')
          : t('The problems I reported have not been fixed.');
  lines.push(
    t('On {date}, I {sent} about repeated problems with these rides{reference}. {status}', {
      date: sentOn,
      sent: sentPhrase(complaint.method, complaint.sentTo),
      reference: complaint.referenceNumber ? t('. The reference number is {number}', { number: complaint.referenceNumber }) : '',
      status: statusSentence,
    }),
  );
  lines.push('');

  if (problems.length > 0 || failed.length > 0) {
    lines.push(
      [
        t('Since my complaint, the problems have continued.'),
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
        t('Since {date}, I logged {rides}, and {problems}. Here is my record of each new one:', {
          date: sentOn,
          rides: tn(stats.totalRides, '{n} ride', '{n} rides'),
          problems: ridesWithProblems(problems.length),
        }),
      );
      lines.push('');
      for (const log of problems) lines.push(dateLine(log.rideDate, describeProblem(log)));
    }
    lines.push(...attemptLines(failed));
  } else {
    lines.push(
      stats.totalRides > 0
        ? t('I have not logged any new ride problems since {date}, but my original complaint still needs an answer.', { date: sentOn })
        : t('I have not logged any rides since {date}, but my original complaint still needs an answer.', { date: sentOn }),
    );
  }
  lines.push('');
  lines.push(t('I am asking you to:'));
  lines.push(t('1. Respond in writing to my complaint of {date}{reference}.', { date: sentOn, reference }));
  const anyNew = problems.length > 0 || failed.length > 0;
  if (anyNew) lines.push(t('2. Investigate the new incidents listed above.'));
  lines.push(t('{number}. Tell me what will be done to make sure my rides arrive on time.', { number: anyNew ? 3 : 2 }));
  lines.push('');
  lines.push(
    t('If this is not resolved, I plan to contact my state Medicaid office. I kept a dated record of each ride and can share it if needed.'),
  );
  lines.push('');
  lines.push(...signOff(profile));
  return lines.join('\n');
}
