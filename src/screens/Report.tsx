// ---------------------------------------------------------------------------
// Report.tsx — the numbers that prove a pattern of problems:
//   - a one-sentence headline ("5 of 13 rides had a problem...")
//   - big number tiles: total, late, never came, missed appointments
//   - a week-by-week chart
//   - buttons to download a PDF report or create a complaint letter
// ---------------------------------------------------------------------------
import type { Chart as ChartJS } from 'chart.js';
import { useRef, useState } from 'react';
import { useApp } from '../AppContext';
import { Icon, type IconName } from '../components/Icon';
import { RideChart } from '../components/RideChart';
import { Screen } from '../components/Screen';
import { computeStats, findPeriod, headline, reportPeriods, weeklyCounts } from '../lib/reportStats';
import { routeToHash } from '../lib/router';
import { useRideData } from '../lib/useRideData';

export function Report() {
  const { today, profile } = useApp();
  const { data } = useRideData();
  const [periodId, setPeriodId] = useState('past-month');
  // The chart, so the PDF can include a picture of it (Phase 6).
  const chartRef = useRef<ChartJS<'bar'> | undefined>(undefined);
  const [pdfBusy, setPdfBusy] = useState(false);

  if (!data || !profile) return <Screen title="Report"><p>Loading…</p></Screen>;

  const periods = reportPeriods(today, data.rideLogs);
  const period = findPeriod(periods, periodId);
  const stats = computeStats(data.rideLogs, period.from, period.to);
  const weeks = weeklyCounts(data.rideLogs, period.from, period.to);

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      // Load the PDF code only when it's needed, so the app opens faster.
      const { downloadReportPdf } = await import('../lib/pdfReport');
      await downloadReportPdf({
        profile: profile!,
        logs: data!.rideLogs,
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

      <div className="stat-grid">
        <StatTile label="Total rides" value={stats.totalRides} icon="list" tone="neutral" />
        <StatTile label="Late pickups" value={stats.latePickups} icon="clock" tone="late" />
        <StatTile label="Never came" value={stats.noShows} icon="x" tone="problem" />
        <StatTile label="Missed appointments" value={stats.missedAppointments} icon="warning" tone="problem" />
        {stats.strandedReturns > 0 && (
          <StatTile label="Stranded: ride home never came" value={stats.strandedReturns} icon="home" tone="problem" />
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
          <RideChart ref={chartRef} weeks={weeks} />
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

      {stats.totalRides === 0 ? (
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
    </Screen>
  );
}

function StatTile({ label, value, icon, tone }: { label: string; value: number; icon: IconName; tone: string }) {
  return (
    <div className={`stat-tile tone-${tone}`}>
      <Icon name={icon} size={28} />
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
