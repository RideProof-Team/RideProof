// ---------------------------------------------------------------------------
// pdfWriter.ts — a small helper around jsPDF.
//
// jsPDF can draw text at an exact spot, but it doesn't wrap long lines or
// start a new page by itself. This helper keeps track of where we are on
// the page (`y`), wraps text to fit, and adds pages as needed.
// Measurements are in "points": 72 points = 1 inch.
// ---------------------------------------------------------------------------
import { jsPDF } from 'jspdf';
import { t } from './i18n';

/**
 * jsPDF's built-in fonts only know basic Western characters. Swap fancy
 * punctuation for plain versions so nothing prints as a strange symbol.
 */
export function pdfSafe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

export class PdfWriter {
  doc = new jsPDF({ unit: 'pt', format: 'letter' });
  margin = 54; // three-quarters of an inch
  y = this.margin;
  pageWidth = this.doc.internal.pageSize.getWidth();
  pageHeight = this.doc.internal.pageSize.getHeight();
  contentWidth = this.pageWidth - this.margin * 2;
  /** Space kept free at the bottom of each page for the footer. */
  footerSpace = 40;

  /** Start a new page if there isn't `height` points of room left. */
  ensureSpace(height: number) {
    if (this.y + height > this.pageHeight - this.margin - this.footerSpace) {
      this.doc.addPage();
      this.y = this.margin;
    }
  }

  /** Write wrapped text and move down. */
  text(text: string, options: { size?: number; bold?: boolean; italic?: boolean; gapAfter?: number; indent?: number } = {}) {
    const { size = 11, bold = false, italic = false, gapAfter = 6, indent = 0 } = options;
    this.doc.setFont('helvetica', bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal');
    this.doc.setFontSize(size);
    const lineHeight = size * 1.35;
    const lines: string[] = this.doc.splitTextToSize(pdfSafe(text), this.contentWidth - indent);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      // jsPDF places text by its baseline, so move down by the font size first.
      this.doc.text(line, this.margin + indent, this.y + size);
      this.y += lineHeight;
    }
    this.y += gapAfter;
  }

  /** A thin gray line across the page. */
  rule(gapAfter = 10) {
    this.ensureSpace(gapAfter + 2);
    this.doc.setDrawColor(180);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += gapAfter;
  }

  /** Put the same footer text and page numbers on every page. */
  addFooters(footer: string) {
    const pages = this.doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      this.doc.setPage(page);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(90);
      const lines: string[] = this.doc.splitTextToSize(pdfSafe(footer), this.contentWidth - 60);
      this.doc.text(lines, this.margin, this.pageHeight - this.margin + 4);
      this.doc.text(t('Page {page} of {pages}', { page, pages }), this.pageWidth - this.margin, this.pageHeight - this.margin + 4, {
        align: 'right',
      });
      this.doc.setTextColor(0);
    }
  }

  save(filename: string) {
    this.doc.save(filename);
  }
}
