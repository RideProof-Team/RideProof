// ---------------------------------------------------------------------------
// pdfReport.ts — makes the downloadable PDF files:
//   1. the ride report (summary numbers, chart, and every ride in a table)
//   2. the complaint letter
// The PDF is made entirely on the phone; nothing is uploaded anywhere.
// ---------------------------------------------------------------------------
import type { FailedBooking, Profile, RideLog } from '../types';
import { attemptsInRange, describeAttempt } from './bookingAttempts';
import { capitalize, formatLongDate, parseDate } from './dates';
import { locale, t } from './i18n';
import { APPOINTMENT_TYPE_LABELS, MINUTES_LATE_SHORT, OUTCOME_LABELS, PICKUP_LABELS, RETURN_LABELS } from './labels';
import { pickupTimesText } from './complaintLetter';
import { PdfWriter, pdfSafe } from './pdfWriter';
import { computeStats, headline, logsInRange, type ReportPeriod } from './reportStats';
import { timeLostHeadline, timeLostNotCounted } from './timeLost';
import { stateName } from './stateRules';
import type { SummaryLine } from './careTeamSummary';

/** The footer on every page (a function, so it's in the language of the moment). */
function footer(): string {
  return t(
    'Created with RideConnect. Ride details were recorded by the rider or caregiver. RideConnect is not affiliated with any state, health plan, or ride company.',
  );
}

/** "Wed, October 14" (Spanish: "mié, 14 de octubre"), for the ride table. */
function tableDate(date: string): string {
  return capitalize(parseDate(date).toLocaleDateString(locale(), { weekday: 'short', month: 'long', day: 'numeric' }));
}

/** "Late (15 min)". */
function lateText(minutes: keyof typeof MINUTES_LATE_SHORT): string {
  return t('Late ({minutes})', { minutes: t(MINUTES_LATE_SHORT[minutes]) });
}

interface ReportInput {
  profile: Profile;
  logs: RideLog[];
  period: ReportPeriod;
  today: string;
  /** Calls to book a ride that didn't work (optional). */
  attempts?: FailedBooking[];
  /** A picture of the chart from the Report screen, with its size, if available. */
  chartImage: { dataUrl: string; width: number; height: number } | null;
}

/** Make and save the report PDF. (Synchronous on purpose, so withLanguage() covers all of its text.) */
export function downloadReportPdf(input: ReportInput) {
  buildReportPdf(input).save(`RideConnect-report-${input.period.from}-to-${input.period.to}.pdf`);
}

/** Make the report PDF (without saving it), so tests can check what's in it. */
export function buildReportPdf({ profile, logs, period, today, chartImage, attempts = [] }: ReportInput): PdfWriter {
  const pdf = new PdfWriter();
  const stats = computeStats(logs, period.from, period.to, attempts);
  const rides = logsInRange(logs, period.from, period.to);

  // ----- Title -----
  pdf.text(t('RideConnect Ride Report'), { size: 20, bold: true, gapAfter: 2 });
  pdf.text(t('{from} to {to}', { from: formatLongDate(period.from, true), to: formatLongDate(period.to, true) }), { size: 12, gapAfter: 2 });
  pdf.text(t('Created {date}', { date: formatLongDate(today, true) }), { size: 10, italic: true, gapAfter: 10 });
  pdf.rule();

  // ----- Who and which company -----
  pdf.text(t('Rider: {name}', { name: profile.riderFirstName }), { gapAfter: 2 });
  pdf.text(t('State: {state}', { state: stateName(profile.state) }), { gapAfter: 2 });
  pdf.text(t('Ride company: {company} ({phone})', { company: profile.rideCompanyName, phone: profile.rideCompanyPhone }), { gapAfter: 2 });
  if (profile.healthPlanName) pdf.text(t('Health plan: {plan}', { plan: profile.healthPlanName }), { gapAfter: 2 });
  pdf.y += 8;

  // ----- Summary numbers -----
  pdf.text(t('Summary'), { size: 14, bold: true });
  pdf.text(headline(stats), { bold: true });
  // Time lost: the same sentence the Report screen shows.
  if (timeLostHeadline(stats)) {
    pdf.text(`${timeLostHeadline(stats)}.`, { bold: true, gapAfter: 2 });
    if (timeLostNotCounted(stats)) pdf.text(timeLostNotCounted(stats), { size: 10, italic: true });
  }
  // The indented rows (the kinds of late pickups) are in normal type, the rest in bold.
  const indent = '   ';
  const summaryRows: [string, number][] = [
    [t('Total rides logged'), stats.totalRides],
    [t('Picked up on time'), stats.onTime],
    [t('Late pickups'), stats.latePickups],
    [indent + t('about 15 minutes late'), stats.late15],
    [indent + t('about 30 minutes late'), stats.late30],
    [indent + t('an hour or more late'), stats.late60],
    [t('Ride never came'), stats.noShows],
    [t('Missed appointments'), stats.missedAppointments],
    [t('Ride home never came (stranded)'), stats.strandedReturns],
    [t('Ride home was late'), stats.lateReturns],
    [t('Calls to book a ride that failed'), stats.failedBookings],
  ];
  pdf.doc.setFontSize(11);
  for (const [label, value] of summaryRows) {
    pdf.ensureSpace(16);
    pdf.doc.setFont('helvetica', label.startsWith(' ') ? 'normal' : 'bold');
    pdf.doc.text(pdfSafe(label), pdf.margin, pdf.y + 11);
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
    pdf.text(t('Rides by week (green = on time, yellow = late, red = never came)'), { size: 12, bold: true });
    pdf.doc.addImage(chartImage.dataUrl, 'PNG', pdf.margin, pdf.y, width, height);
    pdf.y += height + 14;
  }

  // ----- Every ride, in a table -----
  pdf.ensureSpace(60);
  pdf.text(t('Ride log'), { size: 14, bold: true });
  const columns = [
    { title: t('Date'), x: 0, width: 92 },
    { title: t('Appointment'), x: 92, width: 120 },
    { title: t('Pickup'), x: 212, width: 90 },
    { title: t('Arrived'), x: 302, width: 110 },
    { title: t('Ride home'), x: 412, width: 92 },
  ];
  const drawHeader = () => {
    pdf.doc.setFont('helvetica', 'bold');
    pdf.doc.setFontSize(10);
    for (const col of columns) pdf.doc.text(pdfSafe(col.title), pdf.margin + col.x, pdf.y + 10);
    pdf.y += 16;
    pdf.rule(4);
  };
  drawHeader();

  for (const ride of rides) {
    const pickup = ride.pickupStatus === 'late' && ride.minutesLate ? lateText(ride.minutesLate) : t(PICKUP_LABELS[ride.pickupStatus]);
    const cells = [
      tableDate(ride.rideDate), // "Wed, October 14"
      `${t(APPOINTMENT_TYPE_LABELS[ride.appointmentType])}, ${ride.clinicName}`,
      [pickup, pickupTimesText(ride)].filter(Boolean).join(' '),
      t(OUTCOME_LABELS[ride.appointmentOutcome]),
      ride.returnRideStatus === 'late' && ride.returnMinutesLate
        ? lateText(ride.returnMinutesLate)
        : t(RETURN_LABELS[ride.returnRideStatus]),
    ];
    pdf.doc.setFont('helvetica', 'normal');
    pdf.doc.setFontSize(10);
    // Wrap each cell to its column, and make the row as tall as its tallest cell.
    const wrapped = cells.map((cell, i) => pdf.doc.splitTextToSize(pdfSafe(cell), columns[i].width - 6) as string[]);
    const notes = ride.notes ? (pdf.doc.splitTextToSize(pdfSafe(t('Note: "{note}"', { note: ride.notes })), pdf.contentWidth - 92) as string[]) : [];
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

  // ----- Booking calls that didn't work -----
  const failed = attemptsInRange(attempts, period.from, period.to);
  if (failed.length > 0) {
    pdf.y += 10;
    pdf.ensureSpace(60);
    pdf.text(t('Calls to book a ride that did not work'), { size: 14, bold: true });
    for (const attempt of failed) {
      pdf.text(`${capitalize(formatLongDate(attempt.attemptedOn, true))}: ${describeAttempt(attempt)}`, { size: 10, gapAfter: 4 });
    }
  }

  pdf.addFooters(footer());
  return pdf;
}

/** Save the (possibly edited) complaint letter as a PDF. */
export function downloadLetterPdf(letter: string, today: string) {
  buildLetterPdf(letter).save(`RideConnect-complaint-letter-${today}.pdf`);
}

/** Make the letter PDF (without saving it), so tests can check what's in it. */
export function buildLetterPdf(letter: string): PdfWriter {
  const pdf = new PdfWriter();
  for (const paragraph of letter.split('\n')) {
    if (paragraph.trim() === '') {
      pdf.y += 8; // blank line between paragraphs
    } else {
      pdf.text(paragraph, { size: 11.5, gapAfter: 0 });
    }
  }
  pdf.addFooters(t('Created with RideConnect. RideConnect is not affiliated with any state, health plan, or ride company.'));
  return pdf;
}

/**
 * The "Share with my care team" summary as a one-page PDF. Uses the same
 * PdfWriter as the report, with headings in bold.
 */
export function buildCareTeamPdf(lines: SummaryLine[]): PdfWriter {
  const pdf = new PdfWriter();
  for (const line of lines) {
    if (line.kind === 'title') pdf.text(line.text, { size: 18, bold: true, gapAfter: 2 });
    else if (line.kind === 'subtitle') pdf.text(line.text, { size: 11, italic: true, gapAfter: 10 });
    else if (line.kind === 'heading') {
      pdf.y += 6;
      pdf.text(line.text, { size: 13, bold: true, gapAfter: 4 });
    } else if (line.kind === 'item') pdf.text(`-  ${line.text}`, { size: 11, indent: 6, gapAfter: 4 });
    else pdf.text(line.text, { size: 11, gapAfter: 6 });
  }
  pdf.addFooters(footer());
  return pdf;
}

export function downloadCareTeamPdf(lines: SummaryLine[], today: string) {
  buildCareTeamPdf(lines).save(`RideConnect-care-team-summary-${today}.pdf`);
}
