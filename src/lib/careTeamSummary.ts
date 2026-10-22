// ---------------------------------------------------------------------------
// careTeamSummary.ts — "Share with my care team": a short, friendly,
// one-page summary for a doctor, nurse, dialysis social worker, or case
// manager. It's not a complaint; it explains how ride problems are
// affecting care, and asks for help.
//
// It covers: the time period, the totals, time lost waiting, missed
// appointments, the worst few incidents, and a "how you can help" line.
// Every number comes from computeStats, so it always matches the Report,
// the PDF, and the complaint letter.
//
// The summary is a list of lines with a "kind" (title, heading, ...), so
// the same content can be shown on screen, copied as text, or made into
// a PDF with headings in bold.
// ---------------------------------------------------------------------------
import type { FailedBooking, Profile, RideLog } from '../types';
import { joinWords } from './complaintLetter';
import { capitalize, formatDateInSentence, formatLongDate } from './dates';
import { getLanguage, msg, t, tn } from './i18n';
import { computeStats, hadProblem, logsInRange, type ReportPeriod } from './reportStats';
import { rideWait, timeLostHeadline, timeLostNotCounted } from './timeLost';

/** How many of the worst incidents to list (keeps it to one page). */
export const WORST_INCIDENTS = 3;

export type SummaryLineKind = 'title' | 'subtitle' | 'heading' | 'text' | 'item';
export interface SummaryLine {
  kind: SummaryLineKind;
  text: string;
}

/** "Rosa missed dialysis", by kind of appointment. */
const MISSED_WORDS: Record<RideLog['appointmentType'], string> = {
  dialysis: msg('{name} missed dialysis'),
  checkup: msg('{name} missed a checkup'),
  specialist: msg('{name} missed a specialist appointment'),
  therapy: msg('{name} missed therapy'),
  other: msg('{name} missed an appointment'),
};

/** "dialysis on October 14, 2026", by kind of appointment. */
const MISSED_ON_WORDS: Record<RideLog['appointmentType'], string> = {
  dialysis: msg('dialysis on {date}'),
  checkup: msg('a checkup on {date}'),
  specialist: msg('a specialist appointment on {date}'),
  therapy: msg('therapy on {date}'),
  other: msg('an appointment on {date}'),
};

/** English lists these with commas ("A, B, C"); Spanish joins the last one with "y". */
function listParts(parts: string[]): string {
  return getLanguage() === 'es' ? joinWords(parts) : parts.join(', ');
}

/**
 * How bad was one ride? Bigger = worse. A missed appointment is worst,
 * then a ride that never came, then being stranded, then the longest waits.
 */
export function incidentScore(log: RideLog): number {
  let score = rideWait(log).minutes;
  if (log.appointmentOutcome === 'missed') score += 1000;
  if (log.pickupStatus === 'never_came') score += 500;
  if (log.returnRideStatus === 'never_came') score += 400;
  if (log.appointmentOutcome === 'late') score += 20;
  return score;
}

/** The worst rides, worst first (newest first when tied). */
export function worstIncidents(logs: RideLog[], count = WORST_INCIDENTS): RideLog[] {
  return logs
    .filter(hadProblem)
    .sort((a, b) => incidentScore(b) - incidentScore(a) || b.rideDate.localeCompare(a.rideDate))
    .slice(0, count);
}

/** One incident in plain words, about the rider (third person). */
export function describeIncident(log: RideLog, rider: string): string {
  const parts: string[] = [];
  const minutes = (exact: number | undefined, bucket: number | null | undefined) =>
    exact !== undefined
      ? tn(exact, '{n} minute', '{n} minutes')
      : bucket === 60
        ? t('an hour or more')
        : t('about {minutes} minutes', { minutes: bucket ?? 15 });
  if (log.pickupStatus === 'never_came') parts.push(t('the ride never came'));
  if (log.pickupStatus === 'late') parts.push(t('the pickup was {time} late', { time: minutes(log.pickupWaitMinutes, log.minutesLate) }));
  if (log.appointmentOutcome === 'missed') parts.push(t(MISSED_WORDS[log.appointmentType], { name: rider }));
  if (log.appointmentOutcome === 'late') parts.push(t('{name} arrived late', { name: rider }));
  if (log.returnRideStatus === 'never_came') parts.push(t('the ride home never came'));
  if (log.returnRideStatus === 'late') {
    parts.push(t('the ride home was {time} late', { time: minutes(log.returnWaitMinutes, log.returnMinutesLate) }));
  }
  const sentence = listParts(parts);
  const line = `${capitalize(formatLongDate(log.rideDate, true))}: ${capitalize(sentence)}.`;
  return log.notes ? `${line} "${shorten(log.notes, 120)}"` : line;
}

function shorten(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export interface CareTeamInput {
  profile: Profile;
  logs: RideLog[];
  attempts?: FailedBooking[];
  period: ReportPeriod;
  today: string;
}

export function buildCareTeamSummary({ profile, logs, attempts = [], period, today }: CareTeamInput): SummaryLine[] {
  const stats = computeStats(logs, period.from, period.to, attempts);
  const inRange = logsInRange(logs, period.from, period.to);
  const rider = profile.riderFirstName;
  const lines: SummaryLine[] = [];
  const add = (kind: SummaryLineKind, text: string) => lines.push({ kind, text });

  add('title', t("Ride summary for {name}'s care team", { name: rider }));
  add(
    'subtitle',
    t('{from} to {to} (prepared {today})', {
      from: formatDateInSentence(period.from),
      to: formatDateInSentence(period.to),
      today: formatDateInSentence(today),
    }),
  );
  add(
    'text',
    t(
      "This is a short summary of {name}'s rides to medical appointments through Medicaid transportation ({company}). Each ride was recorded on the day by {recorder}.",
      {
        name: rider,
        company: profile.rideCompanyName,
        recorder: profile.role === 'caregiver' ? profile.caregiverName || t("the rider's caregiver") : rider,
      },
    ),
  );

  add('heading', t('At a glance'));
  if (stats.totalRides === 0) {
    add('item', t('No rides were logged in this period.'));
  } else {
    // Same split as the Report headline (which counts pickups), so the numbers line up.
    const pickupProblems = stats.latePickups + stats.noShows;
    const otherProblems = stats.problemRides - pickupProblems;
    add(
      'item',
      `${tn(stats.totalRides, '{n} ride logged.', '{n} rides logged.')} ` +
        t('{count} of the pickups were late or never came', { count: pickupProblems }) +
        (otherProblems > 0
          ? tn(
              otherProblems,
              ', and {n} more ride had a problem later (like the ride home).',
              ', and {n} more rides had a problem later (like the ride home).',
            )
          : '.'),
    );
    const kinds = [
      stats.latePickups > 0 && tn(stats.latePickups, '{n} late pickup', '{n} late pickups'),
      stats.noShows > 0 && tn(stats.noShows, '{n} ride that never came', '{n} rides that never came'),
      stats.strandedReturns > 0 && tn(stats.strandedReturns, '{n} ride home that never came', '{n} rides home that never came'),
      stats.lateReturns > 0 && tn(stats.lateReturns, '{n} late ride home', '{n} late rides home'),
    ].filter((kind): kind is string => Boolean(kind));
    if (kinds.length > 0) add('item', capitalize(`${listParts(kinds)}.`));
  }
  const missed = inRange.filter((l) => l.appointmentOutcome === 'missed');
  add(
    'item',
    stats.missedAppointments === 0
      ? t('No appointments were missed because of a ride.')
      : t('Missed appointments: {count} ({list}).', {
          count: stats.missedAppointments,
          list: missed.map((l) => t(MISSED_ON_WORDS[l.appointmentType], { date: formatDateInSentence(l.rideDate) })).join('; '),
        }),
  );
  if (timeLostHeadline(stats)) {
    add('item', `${timeLostHeadline(stats)}.${timeLostNotCounted(stats) ? ` ${timeLostNotCounted(stats)}` : ''}`);
  }
  if (stats.failedBookings > 0) {
    add('item', tn(stats.failedBookings, "{n} call to book a ride didn't work.", "{n} calls to book a ride didn't work."));
  }

  const worst = worstIncidents(inRange);
  if (worst.length > 0) {
    add('heading', tn(worst.length, 'The worst problem', 'The {n} worst problems'));
    for (const log of worst) add('item', describeIncident(log, rider));
  }

  add('heading', t('How you can help'));
  add(
    'text',
    stats.problemRides > 0 || stats.failedBookings > 0
      ? t(
          "Please keep these ride problems in mind when planning {name}'s care, and note any missed or shortened treatments in the chart. If you can, a note from you saying that {name} needs reliable rides to these appointments would help when we ask the ride company and health plan to fix this.",
          { name: rider },
        )
      : t("{name}'s rides have been working well. Thank you for checking in.", { name: rider }),
  );
  add(
    'text',
    profile.role !== 'caregiver'
      ? t('Questions? Please contact {who}. [Add your phone number]', { who: rider })
      : profile.caregiverName
        ? t('Questions? Please contact {who}. [Add your phone number]', {
            who: t('{caregiver} or {rider}', { caregiver: profile.caregiverName, rider }),
          })
        : t('Questions? Please contact me or {rider}. [Add your phone number]', { rider }),
  );
  return lines;
}

/** The summary as plain text, for Copy and Email. */
export function summaryToText(lines: SummaryLine[]): string {
  const out: string[] = [];
  for (const line of lines) {
    if (line.kind === 'heading') out.push('', line.text.toUpperCase());
    else if (line.kind === 'item') out.push(`- ${line.text}`);
    else if (line.kind === 'text') out.push('', line.text);
    else out.push(line.text);
  }
  return out.join('\n').trim();
}
