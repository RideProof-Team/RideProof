// ---------------------------------------------------------------------------
// CheckInNudge.tsx — "How did today's ride go?" notification.
//
// Two hours after an appointment starts, if there's still no check-in, we
// send one gentle notification (only if the user turned notifications on).
// Like booking reminders, this can only happen while RideConnect is open,
// because there's no server to send it. It draws nothing on screen.
// ---------------------------------------------------------------------------
import { useEffect } from 'react';
import { useApp } from '../AppContext';
import { getNowTime } from '../lib/clock';
import { formatTime } from '../lib/dates';
import { APPOINTMENT_TYPE_LABELS } from '../lib/labels';
import { notifyOncePerDay } from '../lib/notifications';
import type { Trip } from '../lib/recurrence';

/** Minutes after the appointment starts before we ask. */
const NUDGE_AFTER_MINUTES = 120;

/** "09:00" -> 540 (minutes after midnight). */
function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function CheckInNudge({ trips }: { trips: Trip[] }) {
  const { mode, today, profile } = useApp();
  const key = trips.map((t) => t.appointment.id).join(',');

  useEffect(() => {
    if (!profile) return;
    const now = minutesOf(getNowTime(mode));
    for (const trip of trips) {
      if (now < minutesOf(trip.appointment.time) + NUDGE_AFTER_MINUTES) continue;
      const who = profile.role === 'caregiver' ? `${profile.riderFirstName}'s` : 'your';
      notifyOncePerDay(
        mode,
        `checkin:${trip.appointment.id}:${trip.date}`,
        today,
        "How did today's ride go?",
        `Tap to check in on ${who} ${APPOINTMENT_TYPE_LABELS[trip.appointment.type].toLowerCase()} ride at ${formatTime(trip.appointment.time)}.`,
      );
    }
    // `key` stands in for `trips` (a new list is made on every redraw).
  }, [key, mode, today, profile]);

  return null;
}
