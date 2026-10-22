// ---------------------------------------------------------------------------
// Report.tsx — the numbers that prove a pattern of problems:
//   - a one-sentence headline ("5 of 13 rides had a problem...")
//   - big number tiles: total, late, never came, missed appointments
//   - a week-by-week chart
//   - buttons to download a PDF report or create a complaint letter
// ---------------------------------------------------------------------------
import type { Chart as ChartJS } from 'chart.js';
import { useEffect, useRef, useState } from 'react';
import { motionAllowed } from '../lib/motion';
import { useApp } from '../AppContext';
import { Icon, type IconName } from '../components/Icon';
import { RideChart } from '../components/RideChart';
import { Screen } from '../components/Screen';
import { computeStats, findPeriod, headline, plural, reportPeriods, weeklyCounts } from '../lib/reportStats';
import { timeLostHeadline, timeLostNotCounted } from '../lib/timeLost';
import { markReportViewed } from '../lib/onboarding';
import { routeToHash } from '../lib/router';
import { useRideData } from '../lib/useRideData';
import { FAIL_REASON_SHORT } from '../lib/bookingAttempts';
import type { BookingFailReason } from '../types';

export function Report() {
  const { today, profile, mode } = useApp();
  const { data } = useRideData();
  const [periodId, setPeriodId] = useState('past-month');
  // The off-screen, light-colored chart, so the PDF can include a picture of it.
  const chartRef = useRef<ChartJS<'bar'> | undefined>(undefined);
  const [pdfBusy, setPdfBusy] = useState(false);
  // Tick off "See your report" in the Getting started list (real data only).
  useEffect(() => {
    if (mode === 'real') markReportViewed();
  }, [mode]);

  if (!data || !profile) return <Screen title="Report"><p>Loading…</p></Screen>;

  const periods = reportPeriods(today, data.rideLogs);
  const period = findPeriod(periods, periodId);
  const stats = computeStats(data.rideLogs, period.from, period.to, data.bookingAttempts);
  const weeks = weeklyCounts(data.rideLogs, period.from, period.to);
  const waiting = data.complaints.filter((c) => c.status === 'waiting').length;

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      // Load the PDF code only when it's needed, so the app opens faster.
      const { downloadReportPdf } = await import('../lib/pdfReport');
      await downloadReportPdf({
        profile: profile!,
        logs: data!.rideLogs,
        attempts: data!.bookingAttempts,
        period,
        today,
        chartImage: chartRef.current
          ? { dataUrl: chartRef.current.toBase64Image('image/png', 1), width: chartRef.current.width, height: chartRef.current.height }
          : null,
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Screen title="Report">
      <div className="field">
        <label htmlFor="period">Time period</label>
        <select id="period" value={period.id} onChange={(e) => setPeriodId(e.target.value)}>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      <p className="headline">{headline(stats)}</p>
      {timeLostHeadline(stats) && (
        <div className="time-lost">
          <Icon name="clock" size={32} />
          <div>
            <p className="time-lost-main">{timeLostHeadline(stats)}</p>
            {timeLostNotCounted(stats) && <p className="time-lost-note">{timeLostNotCounted(stats)}</p>}
          </div>
        </div>
      )}

      <div className="stat-grid">
        <StatTile label="Total rides" value={stats.totalRides} icon="list" tone="neutral" />
        <StatTile label="Late pickups" value={stats.latePickups} icon="clock" tone="late" />
        <StatTile label="Never came" value={stats.noShows} icon="x" tone="problem" />
        <StatTile label="Missed appointments" value={stats.missedAppointments} icon="warning" tone="problem" />
        {stats.strandedReturns > 0 && (
          <StatTile label="Stranded: ride home never came" value={stats.strandedReturns} icon="home" tone="problem" />
        )}
        {stats.failedBookings > 0 && (
          <StatTile label="Calls to book that failed" value={stats.failedBookings} icon="phone" tone="problem" />
        )}
      </div>

      {stats.latePickups > 0 && (
        <p className="late-breakdown">
          How late: {[
            stats.late15 && `15 min (${stats.late15})`,
            stats.late30 && `30 min (${stats.late30})`,
            stats.late60 && `60+ min (${stats.late60})`,
          ].filter(Boolean).join(', ')}
        </p>
      )}

      {stats.totalRides > 0 && (
        <section aria-labelledby="chart-heading">
          <h2 id="chart-heading">Rides by week</h2>
          <RideChart weeks={weeks} />
          {/* A second copy, off-screen and in light colors, used only for the PDF. */}
          <div className="print-chart" aria-hidden="true">
            <RideChart ref={chartRef} weeks={weeks} forPrint />
          </div>
          {/* <details> is a built-in show/hide box that works with keyboards and screen readers. */}
          <details className="table-toggle">
            <summary>Show as a table</summary>
            {/* tabIndex lets keyboard users scroll the table sideways if it's too wide. */}
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Rides by week table">
            <table className="data-table">
              <thead>
                <tr><th scope="col">Week of</th><th scope="col">On time</th><th scope="col">Late</th><th scope="col">Never came</th></tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.weekStart}>
                    <th scope="row">{w.label}</th><td>{w.onTime}</td><td>{w.late}</td><td>{w.noShow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </details>
        </section>
      )}

      {stats.failedBookings > 0 && (
        <p className="late-breakdown">
          Why booking failed:{' '}
          {(Object.entries(stats.failedBookingsByReason) as [BookingFailReason, number][])
            .filter(([, n]) => n > 0)
            .map(([reason, n]) => `${FAIL_REASON_SHORT[reason]} (${n})`)
            .join(', ')}
        </p>
      )}

      {stats.totalRides === 0 && stats.failedBookings === 0 ? (
        <p className="empty-note">Check in after each ride, and your report will appear here.</p>
      ) : (
        <div className="button-stack">
          <button type="button" className="button-primary" onClick={downloadPdf} disabled={pdfBusy}>
            {pdfBusy ? 'Making PDF…' : 'Download PDF report'}
          </button>
          <a href={routeToHash({ name: 'complaint', periodId: period.id })} className="button-secondary">
            Create complaint letter
          </a>
        </div>
      )}

      <section className="card" aria-labelledby="complaints-heading">
        <h2 id="complaints-heading">Complaints you sent</h2>
        <p>
          {data.complaints.length === 0
            ? 'After you send a complaint, record it here and RideConnect will remind you to follow up.'
            : `${plural(data.complaints.length, 'complaint', 'complaints')} recorded` +
              (waiting > 0 ? `, ${waiting} still waiting for an answer.` : '.')}
        </p>
        <a href={routeToHash({ name: 'complaints' })} className="button-secondary">
          <Icon name="mail" /> {data.complaints.length === 0 ? 'Record a complaint I sent' : 'See my complaints'}
        </a>
      </section>
    </Screen>
  );
}

function StatTile({ label, value, icon, tone }: { label: string; value: number; icon: IconName; tone: string }) {
  const shown = useCountUp(value);
  return (
    <div className={`stat-tile tone-${tone}`}>
      <Icon name={icon} size={28} />
      {/* Screen readers get the final number right away; the counting
          animation is for eyes only (aria-hidden). */}
      <span className="stat-value" aria-hidden="true">{shown}</span>
      <span className="visually-hidden">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

/**
 * Counts from 0 up to `target` over about half a second, so the numbers
 * feel like they're being added up. With animations off, shows the number
 * straight away.
 */
function useCountUp(target: number, durationMs = 600): number {
  const [shown, setShown] = useState(() => (motionAllowed() ? 0 : target));
  useEffect(() => {
    if (!motionAllowed() || target === 0) {
      setShown(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    // requestAnimationFrame runs our code right before the screen redraws,
    // about 60 times a second, which makes the counting smooth.
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3; // fast at first, then slows down
      setShown(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return shown;
}
