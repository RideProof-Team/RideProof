// Tests for "Share with my care team". Run with: npm test
import { describe, expect, it } from 'vitest';
import { buildCareTeamSummary, describeIncident, summaryToText, worstIncidents } from './careTeamSummary';
import { DEMO_TODAY } from './clock';
import { DEMO_BOOKING_ATTEMPTS, DEMO_PROFILE, DEMO_RIDE_LOGS } from './demoData';
import { buildCareTeamPdf } from './pdfReport';
import { computeStats, findPeriod, reportPeriods } from './reportStats';
import { timeLostHeadline } from './timeLost';
import type { Profile, RideLog } from '../types';

const period = findPeriod(reportPeriods(DEMO_TODAY, DEMO_RIDE_LOGS), 'past-month');
const summary = (logs: RideLog[] = DEMO_RIDE_LOGS, profile: Profile = DEMO_PROFILE) =>
  summaryToText(buildCareTeamSummary({ profile, logs, attempts: DEMO_BOOKING_ATTEMPTS, period, today: DEMO_TODAY }));

describe('the care team summary', () => {
  it('uses the same numbers as computeStats (and so the Report, PDF, and letter)', () => {
    const stats = computeStats(DEMO_RIDE_LOGS, period.from, period.to, DEMO_BOOKING_ATTEMPTS);
    const text = summary();
    expect(text).toContain(
      `- ${stats.totalRides} rides logged. ${stats.latePickups + stats.noShows} of the pickups were late or never came, ` +
        `and ${stats.problemRides - stats.latePickups - stats.noShows} more rides had a problem later (like the ride home).`,
    );
    expect(text).toContain('- 13 rides logged. 7 of the pickups were late or never came, and 2 more rides');
    expect(text).toContain(`${stats.latePickups} late pickups, ${stats.noShows} rides that never came`);
    expect(text).toContain(`Missed appointments: ${stats.missedAppointments} (dialysis on October 14, 2026).`);
    expect(text).toContain(`${timeLostHeadline(stats)}.`);
    expect(text).toContain(`${stats.failedBookings} call to book a ride didn't work.`);

    // Change the data: the summary changes with computeStats.
    const fewer = DEMO_RIDE_LOGS.filter((l) => l.rideDate !== '2026-10-14');
    const fewerStats = computeStats(fewer, period.from, period.to, DEMO_BOOKING_ATTEMPTS);
    expect(summary(fewer)).toContain(`- ${fewerStats.totalRides} rides logged. ${fewerStats.latePickups + fewerStats.noShows} of the pickups`);
    expect(summary(fewer)).toContain('No appointments were missed because of a ride.');
  });

  it('has the period, a friendly intro, and a "how you can help" line', () => {
    const text = summary();
    expect(text.split('\n')[0]).toBe("Ride summary for Rosa's care team");
    expect(text).toContain('September 30, 2026 to October 30, 2026 (prepared October 30, 2026)');
    expect(text).toContain('Each ride was recorded on the day by Maria.');
    expect(text).toContain('HOW YOU CAN HELP');
    expect(text).toContain("a note from you saying that Rosa needs reliable rides");
    expect(text).toContain('Questions? Please contact Maria or Rosa. [Add your phone number]');
  });

  it('lists the 3 worst incidents, worst first', () => {
    const worst = worstIncidents(DEMO_RIDE_LOGS);
    expect(worst.map((l) => l.rideDate)).toEqual(['2026-10-14', '2026-10-21', '2026-10-19']);
    expect(describeIncident(worst[0], 'Rosa')).toBe(
      'Wednesday, October 14, 2026: The ride never came, Rosa missed dialysis. "Called the ride company twice. No driver came. Missed dialysis."',
    );
    expect(summary()).toContain('THE 3 WORST PROBLEMS');
  });

  it('uses exact timer minutes when there are some', () => {
    const log = { ...DEMO_RIDE_LOGS[1], pickupWaitMinutes: 22, notes: '' };
    expect(describeIncident(log, 'Rosa')).toBe('Friday, October 2, 2026: The pickup was 22 minutes late.');
  });

  it('says something kind when the rides went well', () => {
    const good = DEMO_RIDE_LOGS.filter((l) => l.pickupStatus === 'on_time' && l.returnRideStatus === 'on_time' && l.appointmentOutcome === 'made_it');
    const text = summaryToText(buildCareTeamSummary({ profile: DEMO_PROFILE, logs: good, period, today: DEMO_TODAY }));
    expect(text).toContain("Rosa's rides have been working well.");
    expect(text).not.toContain('WORST');
  });

  it('works in rider mode', () => {
    const rider: Profile = { ...DEMO_PROFILE, role: 'rider', caregiverName: '' };
    expect(summary(DEMO_RIDE_LOGS, rider)).toContain('Each ride was recorded on the day by Rosa.');
  });

  it('fits on one page as a PDF, with the same text', () => {
    const lines = buildCareTeamSummary({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, attempts: DEMO_BOOKING_ATTEMPTS, period, today: DEMO_TODAY });
    const pdf = buildCareTeamPdf(lines);
    expect(pdf.doc.getNumberOfPages()).toBe(1);
    const pdfText = [...pdf.doc.output().matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((m) => m[1].replace(/\\([()\\])/g, '$1')).join(' ');
    expect(pdfText).toContain("Ride summary for Rosa's care team");
    expect(pdfText).toContain('How you can help');
  });
});
