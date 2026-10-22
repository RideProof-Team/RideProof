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
import { motionAllowed } from '../lib/motion';
import { cssColor, useIsDark } from '../lib/theme';

// Chart.js only includes the pieces you "register", which keeps the app smaller.
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);
ChartJS.defaults.font.family = "'Trebuchet MS', 'Segoe UI', sans-serif";

/** Status colors (green / amber / red), also used in the PDF report. */
export const CHART_COLORS = {
  onTime: '#35684a',
  late: '#c99a32',
  noShow: '#ad4a42',
};


/** Light-mode colors, always used for the PDF (paper is white). */
const PRINT = { text: '#1a1a1a', muted: '#4a4a4a', grid: '#e5e7eb', background: '#ffffff' };

interface Props {
  weeks: WeekCounts[];
  /** Draw for the PDF: light colors and no animation, whatever the screen theme. */
  forPrint?: boolean;
}

export const RideChart = forwardRef<ChartJS<'bar'> | undefined, Props>(function RideChart({ weeks, forPrint = false }, ref) {
  // Chart.js draws on a <canvas>, which can't use CSS colors directly, so we
  // read the current text/grid colors and redraw when light/dark changes.
  const dark = useIsDark();
  const text = forPrint ? PRINT.text : cssColor('--color-text') || PRINT.text;
  const muted = forPrint ? PRINT.muted : cssColor('--color-muted') || PRINT.muted;
  const grid = forPrint ? PRINT.grid : cssColor('--color-chart-grid') || PRINT.grid;
  const background = forPrint ? PRINT.background : cssColor('--color-bg') || PRINT.background;
  // Shared look for each colored part of the bars.
  const barStyle = {
    // A 2px border in the background color makes a small gap between stacked pieces.
    borderColor: background,
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
        // A new key when light/dark changes makes Chart.js redraw with new colors.
        key={!forPrint && dark ? 'dark' : 'light'}
        ref={ref}
        data={data}
        role="img"
        aria-label={summary}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          // Bars grow up from the bottom, one week after another (left to right).
          animation:
            forPrint || !motionAllowed()
              ? false
              : { duration: 600, easing: 'easeOutQuart', delay: (context) => (context.type === 'data' ? context.dataIndex * 90 : 0) },
          plugins: {
            legend: {
              position: 'top',
              align: 'start',
              labels: { font: { size: 16 }, color: text, boxWidth: 18, boxHeight: 18, useBorderRadius: true, borderRadius: 4 },
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
                color: muted,
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
              ticks: { precision: 0, color: muted, font: { size: 16 } },
              grid: { color: grid },
              title: { display: true, text: 'Rides', color: muted, font: { size: 16 } },
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
