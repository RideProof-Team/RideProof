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
import { formatDateInSentence, formatLongDate } from './dates';
import { computeStats, hadProblem, logsInRange, plural, type ReportPeriod } from './reportStats';
import { rideWait, timeLostHeadline, timeLostNotCounted } from './timeLost';

/** How many of the worst incidents to list (keeps it to one page). */
export const WORST_INCIDENTS = 3;

export type SummaryLineKind = 'title' | 'subtitle' | 'heading' | 'text' | 'item';
export interface SummaryLine {
  kind: SummaryLineKind;
  text: string;
}

const TYPE_WORDS: Record<RideLog['appointmentType'], string> = {
  dialysis: 'dialysis',
  checkup: 'a checkup',
  specialist: 'a specialist appointment',
  therapy: 'therapy',
  other: 'an appointment',
};

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
    exact !== undefined ? plural(exact, 'minute', 'minutes') : bucket === 60 ? 'an hour or more' : `about ${bucket ?? 15} minutes`;
  if (log.pickupStatus === 'never_came') parts.push('the ride never came');
  if (log.pickupStatus === 'late') parts.push(`the pickup was ${minutes(log.pickupWaitMinutes, log.minutesLate)} late`);
  if (log.appointmentOutcome === 'missed') parts.push(`${rider} missed ${TYPE_WORDS[log.appointmentType]}`);
  if (log.appointmentOutcome === 'late') parts.push(`${rider} arrived late`);
  if (log.returnRideStatus === 'never_came') parts.push(`the ride home never came`);
  if (log.returnRideStatus === 'late') parts.push(`the ride home was ${minutes(log.returnWaitMinutes, log.returnMinutesLate)} late`);
  const sentence = parts.join(', ');
  const line = `${formatLongDate(log.rideDate, true)}: ${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
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

  add('title', `Ride summary for ${rider}'s care team`);
  add('subtitle', `${formatDateInSentence(period.from)} to ${formatDateInSentence(period.to)} (prepared ${formatDateInSentence(today)})`);
  add(
    'text',
    `This is a short summary of ${rider}'s rides to medical appointments through Medicaid transportation` +
      ` (${profile.rideCompanyName}). Each ride was recorded on the day by ` +
      `${profile.role === 'caregiver' ? `${profile.caregiverName || "the rider's caregiver"}` : rider}.`,
  );

  add('heading', 'At a glance');
  if (stats.totalRides === 0) {
    add('item', 'No rides were logged in this period.');
  } else {
    // Same split as the Report headline (which counts pickups), so the numbers line up.
    const pickupProblems = stats.latePickups + stats.noShows;
    const otherProblems = stats.problemRides - pickupProblems;
    add(
      'item',
      `${plural(stats.totalRides, 'ride', 'rides')} logged. ${pickupProblems} of the pickups were late or never came` +
        (otherProblems > 0 ? `, and ${otherProblems} more ${otherProblems === 1 ? 'ride' : 'rides'} had a problem later (like the ride home).` : '.'),
    );
    const kinds = [
      stats.latePickups > 0 && plural(stats.latePickups, 'late pickup', 'late pickups'),
      stats.noShows > 0 && plural(stats.noShows, 'ride that never came', 'rides that never came'),
      stats.strandedReturns > 0 && plural(stats.strandedReturns, 'ride home that never came', 'rides home that never came'),
      stats.lateReturns > 0 && plural(stats.lateReturns, 'late ride home', 'late rides home'),
    ].filter(Boolean);
    if (kinds.length > 0) add('item', `${kinds.join(', ')}.`.replace(/^./, (c) => c.toUpperCase()));
  }
  const missed = inRange.filter((l) => l.appointmentOutcome === 'missed');
  add(
    'item',
    stats.missedAppointments === 0
      ? 'No appointments were missed because of a ride.'
      : `Missed appointments: ${stats.missedAppointments} (${missed.map((l) => `${TYPE_WORDS[l.appointmentType]} on ${formatDateInSentence(l.rideDate)}`).join('; ')}).`,
  );
  if (timeLostHeadline(stats)) {
    add('item', `${timeLostHeadline(stats)}.${timeLostNotCounted(stats) ? ` ${timeLostNotCounted(stats)}` : ''}`);
  }
  if (stats.failedBookings > 0) {
    add('item', `${plural(stats.failedBookings, 'call', 'calls')} to book a ride didn't work.`);
  }

  const worst = worstIncidents(inRange);
  if (worst.length > 0) {
    add('heading', worst.length === 1 ? 'The worst problem' : `The ${worst.length} worst problems`);
    for (const log of worst) add('item', describeIncident(log, rider));
  }

  add('heading', 'How you can help');
  add(
    'text',
    stats.problemRides > 0 || stats.failedBookings > 0
      ? `Please keep these ride problems in mind when planning ${rider}'s care, and note any missed or shortened treatments in the chart. ` +
          `If you can, a note from you saying that ${rider} needs reliable rides to these appointments would help when we ask the ride company and health plan to fix this.`
      : `${rider}'s rides have been working well. Thank you for checking in.`,
  );
  add('text', `Questions? Please contact ${profile.role === 'caregiver' ? `${profile.caregiverName || 'me'} or ${rider}` : rider}. [Add your phone number]`);
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
