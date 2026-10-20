// ---------------------------------------------------------------------------
// RideChart.tsx — a stacked bar chart: one bar per week, split into
// on time (green), late (amber), and never came (red).
// Tall red and amber sections show the problem pattern at a glance.
//
// Accessibility: the chart has a legend (words, not just colors), a
// text summary for screen readers, and a "Show as table" option.
// ---------------------------------------------------------------------------
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { forwardRef } from 'react';
import { Bar } from 'react-chartjs-2';
import type { WeekCounts } from '../lib/reportStats';

// Chart.js only includes the pieces you "register", which keeps the app smaller.
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/** Status colors (green / amber / red), also used in the PDF report. */
export const CHART_COLORS = {
  onTime: '#0ca30c',
  late: '#fab219',
  noShow: '#d03b3b',
};

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const RideChart = forwardRef<ChartJS<'bar'> | undefined, { weeks: WeekCounts[] }>(function RideChart({ weeks }, ref) {
  // Shared look for each colored part of the bars.
  const barStyle = {
    // A 2px white border makes a small gap between stacked pieces.
    borderColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 4,
    borderSkipped: false as const,
    maxBarThickness: 48,
  };

  const data = {
    labels: weeks.map((w) => `Week of ${w.label}`),
    datasets: [
      { label: 'On time', data: weeks.map((w) => w.onTime), backgroundColor: CHART_COLORS.onTime, ...barStyle },
      { label: 'Late', data: weeks.map((w) => w.late), backgroundColor: CHART_COLORS.late, ...barStyle },
      { label: 'Never came', data: weeks.map((w) => w.noShow), backgroundColor: CHART_COLORS.noShow, ...barStyle },
    ],
  };

  const totalLate = weeks.reduce((sum, w) => sum + w.late, 0);
  const totalNoShow = weeks.reduce((sum, w) => sum + w.noShow, 0);
  const summary = `Bar chart of rides by week. ${totalLate} late and ${totalNoShow} never came over ${weeks.length} weeks.`;

  return (
    <div className="chart-box">
      <Bar
        ref={ref}
        data={data}
        role="img"
        aria-label={summary}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: reduceMotion ? false : { duration: 600 },
          plugins: {
            legend: {
              position: 'top',
              align: 'start',
              labels: { font: { size: 16 }, color: '#1a1a1a', boxWidth: 18, boxHeight: 18, useBorderRadius: true, borderRadius: 4 },
            },
            tooltip: {
              titleFont: { size: 16 },
              bodyFont: { size: 16 },
              padding: 10,
              // Show all three counts for the week when hovering/tapping a bar.
              mode: 'index',
              intersect: false,
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: {
                color: '#4a4a4a',
                font: { size: 16 },
                // Show just "Sep 28" under each bar to save space.
                callback: (_value, index) => weeks[index]?.label,
                maxRotation: 0,
                autoSkipPadding: 8,
              },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: { precision: 0, color: '#4a4a4a', font: { size: 16 } },
              grid: { color: '#e5e7eb' },
              title: { display: true, text: 'Rides', color: '#4a4a4a', font: { size: 16 } },
            },
          },
        }}
      >
        {/* Shown only if the chart can't be drawn. */}
        <p>{summary}</p>
      </Bar>
    </div>
  );
});
