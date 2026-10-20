// ---------------------------------------------------------------------------
// rideStatus.ts — sums up how a ride went, for color-coding History.
//   'good'    = everything on time
//   'late'    = something was late, but nothing failed
//   'problem' = a ride never came, or the appointment was missed
// The screen always shows an icon and words with the color, never color alone.
// ---------------------------------------------------------------------------
import type { RideLog } from '../types';
import type { IconName } from '../components/Icon';

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

export const SEVERITY_DISPLAY: Record<Severity, { label: string; icon: IconName }> = {
  good: { label: 'On time', icon: 'check' },
  late: { label: 'Late', icon: 'clock' },
  problem: { label: 'Problem', icon: 'x' },
};

/** A short phrase for the main problem, e.g. "Ride never came". */
export function severityReason(log: RideLog): string {
  if (log.pickupStatus === 'never_came') return 'Ride never came';
  if (log.appointmentOutcome === 'missed') return 'Missed appointment';
  if (log.returnRideStatus === 'never_came') return 'Ride home never came';
  if (log.pickupStatus === 'late') return 'Late pickup';
  if (log.returnRideStatus === 'late') return 'Ride home was late';
  if (log.appointmentOutcome === 'late') return 'Arrived late';
  return 'On time';
}
