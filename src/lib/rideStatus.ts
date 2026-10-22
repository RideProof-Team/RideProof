// ---------------------------------------------------------------------------
// rideStatus.ts — sums up how a ride went, for color-coding History.
//   'good'    = everything on time
//   'late'    = something was late, but nothing failed
//   'problem' = a ride never came, or the appointment was missed
// The screen always shows an icon and words with the color, never color alone.
// ---------------------------------------------------------------------------
import type { RideLog } from '../types';
import type { IconName } from '../components/Icon';
import { msg, t } from './i18n';

export type Severity = 'good' | 'late' | 'problem';

export function rideSeverity(log: RideLog): Severity {
  if (log.pickupStatus === 'never_came' || log.returnRideStatus === 'never_came' || log.appointmentOutcome === 'missed') {
    return 'problem';
  }
  if (log.pickupStatus === 'late' || log.returnRideStatus === 'late' || log.appointmentOutcome === 'late') {
    return 'late';
  }
  return 'good';
}

/** Show the label with t(SEVERITY_DISPLAY[severity].label). */
export const SEVERITY_DISPLAY: Record<Severity, { label: string; icon: IconName }> = {
  good: { label: msg('On time'), icon: 'check' },
  late: { label: msg('Late'), icon: 'clock' },
  problem: { label: msg('Problem'), icon: 'x' },
};

/** A short phrase for the main problem, e.g. "Ride never came" (in the app's language). */
export function severityReason(log: RideLog): string {
  if (log.pickupStatus === 'never_came') return t('Ride never came');
  if (log.appointmentOutcome === 'missed') return t('Missed appointment');
  if (log.returnRideStatus === 'never_came') return t('Ride home never came');
  if (log.pickupStatus === 'late') return t('Late pickup');
  if (log.returnRideStatus === 'late') return t('Ride home was late');
  if (log.appointmentOutcome === 'late') return t('Arrived late');
  return t('On time');
}

// ---------------------------------------------------------------------------
// Filtering History ("show only problems", or search for a word).
// ---------------------------------------------------------------------------
export type HistoryFilter = 'all' | 'problems' | 'late' | 'never_came';

/** Show these with t(HISTORY_FILTER_LABELS[filter]). */
export const HISTORY_FILTER_LABELS: Record<HistoryFilter, string> = {
  all: msg('All rides'),
  problems: msg('Problems only'),
  late: msg('Late'),
  never_came: msg('Never came'),
};

export function filterLogs(logs: RideLog[], filter: HistoryFilter, search: string): RideLog[] {
  const words = search.trim().toLowerCase();
  return logs.filter((log) => {
    if (filter === 'problems' && rideSeverity(log) === 'good') return false;
    if (filter === 'late' && log.pickupStatus !== 'late' && log.returnRideStatus !== 'late') return false;
    if (filter === 'never_came' && log.pickupStatus !== 'never_came' && log.returnRideStatus !== 'never_came') return false;
    // Search the clinic name and notes, ignoring upper/lower case.
    if (words && !`${log.clinicName} ${log.notes}`.toLowerCase().includes(words)) return false;
    return true;
  });
}
