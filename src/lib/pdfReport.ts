// ---------------------------------------------------------------------------
// pdfReport.ts — makes the downloadable PDF files:
//   1. the ride report (summary numbers, chart, and every ride in a table)
//   2. the complaint letter
// The PDF is made entirely on the phone; nothing is uploaded anywhere.
// ---------------------------------------------------------------------------
import type { Profile, RideLog } from '../types';
import { formatLongDate } from './dates';
import { APPOINTMENT_TYPE_LABELS, MINUTES_LATE_SHORT, OUTCOME_LABELS, PICKUP_LABELS, RETURN_LABELS } from './labels';
import { PdfWriter, pdfSafe } from './pdfWriter';
import { computeStats, headline, logsInRange, type ReportPeriod } from './reportStats';
import { getStateRule } from './stateRules';

const FOOTER =
  'Created with RideProof. Ride details were recorded by the rider or caregiver. ' +
  'RideProof is not affiliated with any state, health plan, or ride company.';

interface ReportInput {
  profile: Profile;
  logs: RideLog[];
  period: ReportPeriod;
  today: string;
  /** A picture of the chart from the Report screen, with its size, if available. */
  chartImage: { dataUrl: string; width: number; height: number } | null;
}

export async function downloadReportPdf({ profile, logs, period, today, chartImage }: ReportInput) {
  const pdf = new PdfWriter();
  const stats = computeStats(logs, period.from, period.to);
  const rides = logsInRange(logs, period.from, period.to);

  // ----- Title -----
  pdf.text('RideProof Ride Report', { size: 20, bold: true, gapAfter: 2 });
  pdf.text(`${formatLongDate(period.from, true)} to ${formatLongDate(period.to, true)}`, { size: 12, gapAfter: 2 });
  pdf.text(`Created ${formatLongDate(today, true)}`, { size: 10, italic: true, gapAfter: 10 });
  pdf.rule();

  // ----- Who and which company -----
  const state = getStateRule(profile.state);
  pdf.text(`Rider: ${profile.riderFirstName}`, { gapAfter: 2 });
  pdf.text(`State: ${state?.name ?? profile.state}`, { gapAfter: 2 });
  pdf.text(`Ride company: ${profile.rideCompanyName} (${profile.rideCompanyPhone})`, { gapAfter: 2 });
  if (profile.healthPlanName) pdf.text(`Health plan: ${profile.healthPlanName}`, { gapAfter: 2 });
  pdf.y += 8;

  // ----- Summary numbers -----
  pdf.text('Summary', { size: 14, bold: true });
  pdf.text(headline(stats), { bold: true });
  const summaryRows: [string, number][] = [
    ['Total rides logged', stats.totalRides],
    ['Picked up on time', stats.onTime],
    ['Late pickups', stats.latePickups],
    ['   about 15 minutes late', stats.late15],
    ['   about 30 minutes late', stats.late30],
    ['   an hour or more late', stats.late60],
    ['Ride never came', stats.noShows],
    ['Missed appointments', stats.missedAppointments],
    ['Ride home never came (stranded)', stats.strandedReturns],
    ['Ride home was late', stats.lateReturns],
  ];
  pdf.doc.setFontSize(11);
  for (const [label, value] of summaryRows) {
    pdf.ensureSpace(16);
    pdf.doc.setFont('helvetica', label.startsWith(' ') ? 'normal' : 'bold');
    pdf.doc.text(label, pdf.margin, pdf.y + 11);
    pdf.doc.text(String(value), pdf.margin + 260, pdf.y + 11, { align: 'right' });
    pdf.y += 16;
  }
  pdf.y += 10;

  // ----- Chart picture -----
  if (chartImage) {
    // Keep the chart's shape: on a phone it's narrow and tall-ish, so it
    // shouldn't be stretched across the page. Cap its height too.
    const height = Math.min(260, pdf.contentWidth * (chartImage.height / chartImage.width));
    const width = height * (chartImage.width / chartImage.height);
    pdf.ensureSpace(height + 30);
    pdf.text('Rides by week (green = on time, yellow = late, red = never came)', { size: 12, bold: true });
    pdf.doc.addImage(chartImage.dataUrl, 'PNG', pdf.margin, pdf.y, width, height);
    pdf.y += height + 14;
  }

  // ----- Every ride, in a table -----
  pdf.ensureSpace(60);
  pdf.text('Ride log', { size: 14, bold: true });
  const columns = [
    { title: 'Date', x: 0, width: 92 },
    { title: 'Appointment', x: 92, width: 120 },
    { title: 'Pickup', x: 212, width: 90 },
    { title: 'Arrived', x: 302, width: 110 },
    { title: 'Ride home', x: 412, width: 92 },
  ];
  const drawHeader = () => {
    pdf.doc.setFont('helvetica', 'bold');
    pdf.doc.setFontSize(10);
    for (const col of columns) pdf.doc.text(col.title, pdf.margin + col.x, pdf.y + 10);
    pdf.y += 16;
    pdf.rule(4);
  };
  drawHeader();

  for (const ride of rides) {
    const pickup =
      ride.pickupStatus === 'late' && ride.minutesLate
        ? `Late (${MINUTES_LATE_SHORT[ride.minutesLate]})`
        : PICKUP_LABELS[ride.pickupStatus];
    const cells = [
      formatLongDate(ride.rideDate).replace(/^(\w{3})\w*/, '$1'), // "Wed, October 14"
      `${APPOINTMENT_TYPE_LABELS[ride.appointmentType]}, ${ride.clinicName}`,
      pickup,
      OUTCOME_LABELS[ride.appointmentOutcome],
      RETURN_LABELS[ride.returnRideStatus],
    ];
    pdf.doc.setFont('helvetica', 'normal');
    pdf.doc.setFontSize(10);
    // Wrap each cell to its column, and make the row as tall as its tallest cell.
    const wrapped = cells.map((cell, i) => pdf.doc.splitTextToSize(pdfSafe(cell), columns[i].width - 6) as string[]);
    const notes = ride.notes ? (pdf.doc.splitTextToSize(pdfSafe(`Note: "${ride.notes}"`), pdf.contentWidth - 92) as string[]) : [];
    const rowHeight = Math.max(...wrapped.map((w) => w.length)) * 13 + notes.length * 13 + 6;
    if (pdf.y + rowHeight > pdf.pageHeight - pdf.margin - pdf.footerSpace) {
      pdf.doc.addPage();
      pdf.y = pdf.margin;
      drawHeader();
    }
    wrapped.forEach((lines, i) => pdf.doc.text(lines, pdf.margin + columns[i].x, pdf.y + 10, { lineHeightFactor: 1.3 }));
    const cellLines = Math.max(...wrapped.map((w) => w.length));
    if (notes.length > 0) {
      pdf.doc.setFont('helvetica', 'italic');
      pdf.doc.text(notes, pdf.margin + 92, pdf.y + 10 + cellLines * 13, { lineHeightFactor: 1.3 });
    }
    pdf.y += rowHeight;
    pdf.doc.setDrawColor(225);
    pdf.doc.line(pdf.margin, pdf.y - 3, pdf.pageWidth - pdf.margin, pdf.y - 3);
  }

  pdf.addFooters(FOOTER);
  pdf.save(`RideProof-report-${period.from}-to-${period.to}.pdf`);
}

/** Save the (possibly edited) complaint letter as a PDF. */
export async function downloadLetterPdf(letter: string, today: string) {
  const pdf = new PdfWriter();
  for (const paragraph of letter.split('\n')) {
    if (paragraph.trim() === '') {
      pdf.y += 8; // blank line between paragraphs
    } else {
      pdf.text(paragraph, { size: 11.5, gapAfter: 0 });
    }
  }
  pdf.addFooters('Created with RideProof. RideProof is not affiliated with any state, health plan, or ride company.');
  pdf.save(`RideProof-complaint-letter-${today}.pdf`);
}
