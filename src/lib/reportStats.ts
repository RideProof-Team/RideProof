// ---------------------------------------------------------------------------
// reportStats.ts — counts up ride problems for the Report screen, the PDF,
// and the complaint letter. All three use these same functions, so the
// numbers always match everywhere.
// ---------------------------------------------------------------------------
import type { RideLog } from '../types';
import { addDays, formatShortDate, parseDate, toDateString, weekdayOf } from './dates';
import { totalWait, type WaitPrecision } from './timeLost';

export interface RideStats {
  totalRides: number;
  onTime: number;
  /** Pickups that were late (any amount). */
  latePickups: number;
  late15: number;
  late30: number;
  late60: number;
  /** Pickups where the ride never came. */
  noShows: number;
  missedAppointments: number;
  /** Rides home that never came (rider was stranded). */
  strandedReturns: number;
  lateReturns: number;
  /** Minutes spent waiting for late (or timed never-came) rides. See timeLost.ts. */
  waitMinutes: number;
  /** 'at_least' if an "hour or more" answer was counted as 60. */
  waitPrecision: WaitPrecision;
  /** Rides that never came with no measured wait (not in waitMinutes). */
  untimedNeverCame: number;
  /** Late rides home with no minutes recorded (older check-ins). */
  untimedLate: number;
  /** First and last ride dates in the period (null if no rides). */
  firstDate: string | null;
  lastDate: string | null;
}

/** Ride logs between two dates (both included), oldest first. */
export function logsInRange(logs: RideLog[], from: string, to: string): RideLog[] {
  return logs
    .filter((log) => log.rideDate >= from && log.rideDate <= to)
    .sort((a, b) => a.rideDate.localeCompare(b.rideDate));
}

export function computeStats(logs: RideLog[], from: string, to: string): RideStats {
  const inRange = logsInRange(logs, from, to);
  // A small helper: count the logs that match a test.
  const count = (test: (log: RideLog) => boolean) => inRange.filter(test).length;

  return {
    totalRides: inRange.length,
    onTime: count((l) => l.pickupStatus === 'on_time'),
    latePickups: count((l) => l.pickupStatus === 'late'),
    late15: count((l) => l.pickupStatus === 'late' && l.minutesLate === 15),
    late30: count((l) => l.pickupStatus === 'late' && l.minutesLate === 30),
    late60: count((l) => l.pickupStatus === 'late' && l.minutesLate === 60),
    noShows: count((l) => l.pickupStatus === 'never_came'),
    missedAppointments: count((l) => l.appointmentOutcome === 'missed'),
    strandedReturns: count((l) => l.returnRideStatus === 'never_came'),
    lateReturns: count((l) => l.returnRideStatus === 'late'),
    ...totalWait(inRange),
    firstDate: inRange[0]?.rideDate ?? null,
    lastDate: inRange[inRange.length - 1]?.rideDate ?? null,
  };
}

// ---------------------------------------------------------------------------
// Report periods: "Past month" plus each calendar month that has rides.
// ---------------------------------------------------------------------------

export interface ReportPeriod {
  /** "past-month" or a month like "2026-10". Used in web addresses. */
  id: string;
  label: string;
  from: string;
  to: string;
}

/** The same day one month earlier, e.g. Oct 30 -> Sep 30 (Mar 31 -> Feb 28). */
export function oneMonthBefore(date: string): string {
  const d = parseDate(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  // Don't overflow into the next month when the earlier month is shorter.
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toDateString(d);
}

export function reportPeriods(today: string, logs: RideLog[]): ReportPeriod[] {
  const pastMonthFrom = oneMonthBefore(today);
  const periods: ReportPeriod[] = [
    {
      id: 'past-month',
      label: `Past month (${formatShortDate(pastMonthFrom)} – ${formatShortDate(today)})`,
      from: pastMonthFrom,
      to: today,
    },
  ];
  // Every month that has at least one ride, newest first.
  const months = [...new Set(logs.map((l) => l.rideDate.slice(0, 7)))].sort().reverse();
  for (const month of months) {
    const first = `${month}-01`;
    const d = parseDate(first);
    const last = toDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    periods.push({
      id: month,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      from: first,
      to: last,
    });
  }
  return periods;
}

/** Find a period by its id, falling back to "Past month". */
export function findPeriod(periods: ReportPeriod[], id: string | undefined): ReportPeriod {
  return periods.find((p) => p.id === id) ?? periods[0];
}

// ---------------------------------------------------------------------------
// Week-by-week counts for the chart.
// ---------------------------------------------------------------------------

export interface WeekCounts {
  /** The Monday that starts the week. */
  weekStart: string;
  /** e.g. "Sep 28" */
  label: string;
  onTime: number;
  late: number;
  noShow: number;
}

/** The Monday on or before a date. */
export function mondayOf(date: string): string {
  const day = weekdayOf(date); // 0 = Sunday
  return addDays(date, day === 0 ? -6 : 1 - day);
}

export function weeklyCounts(logs: RideLog[], from: string, to: string): WeekCounts[] {
  const inRange = logsInRange(logs, from, to);
  const weeks: WeekCounts[] = [];
  // One entry for every week in the period, even weeks with no rides,
  // so the chart's time axis has no gaps.
  for (let week = mondayOf(from); week <= to; week = addDays(week, 7)) {
    const weekEnd = addDays(week, 6);
    const inWeek = inRange.filter((l) => l.rideDate >= week && l.rideDate <= weekEnd);
    weeks.push({
      weekStart: week,
      label: formatShortDate(week),
      onTime: inWeek.filter((l) => l.pickupStatus === 'on_time').length,
      late: inWeek.filter((l) => l.pickupStatus === 'late').length,
      noShow: inWeek.filter((l) => l.pickupStatus === 'never_came').length,
    });
  }
  return weeks;
}

/** "1 time" / "5 times" — small helper for plain-language sentences. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** A one-sentence summary, e.g. "5 of 13 rides were late, and 2 never came." */
export function headline(stats: RideStats): string {
  if (stats.totalRides === 0) return 'No rides logged in this period.';
  const problems: string[] = [];
  if (stats.latePickups > 0) problems.push(`${stats.latePickups} ${stats.latePickups === 1 ? 'was' : 'were'} late`);
  if (stats.noShows > 0) problems.push(`${stats.noShows} never came`);
  if (problems.length === 0) return `All ${plural(stats.totalRides, 'ride', 'rides')} picked up on time.`;
  return `${stats.latePickups + stats.noShows} of ${plural(stats.totalRides, 'ride', 'rides')} had a problem: ${problems.join(', and ')}.`;
}
