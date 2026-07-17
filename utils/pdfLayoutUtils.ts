import { jsPDF } from 'jspdf';

export const PDF_PAGE_W = 210;
export const PDF_PAGE_H = 297;
export const PDF_MARGIN_X = 18;
export const PDF_MARGIN_TOP = 20;
export const PDF_MARGIN_BOTTOM = 22;
export const PDF_CONTENT_W = PDF_PAGE_W - PDF_MARGIN_X * 2;

export const PDF_COLORS = {
  primary: [30, 58, 95] as [number, number, number],
  primaryLight: [232, 238, 246] as [number, number, number],
  accent: [37, 99, 168] as [number, number, number],
  text: [33, 37, 41] as [number, number, number],
  muted: [108, 117, 125] as [number, number, number],
  border: [206, 212, 218] as [number, number, number],
  surface: [248, 249, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/** jsPDF gère mal les espaces insécables / fines de toLocaleString — normalisation obligatoire. */
export function sanitizePdfText(text: string): string {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ')
    .replace(/\u2009/g, ' ')
    .replace(/\u2007/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatPdfAmount(value: number, locale = 'fr-FR'): string {
  const useComma = locale.startsWith('fr');
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimal = decPart === '00' ? '' : useComma ? `,${decPart}` : `.${decPart}`;
  const sign = value < 0 ? '- ' : '';
  return sanitizePdfText(`${sign}${grouped}${decimal} EUR`);
}

export function formatPdfDate(dateString: string, locale = 'fr-FR'): string {
  try {
    const date = new Date(dateString.length === 10 ? `${dateString}T12:00:00` : dateString);
    if (Number.isNaN(date.getTime())) return sanitizePdfText(dateString);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return locale.startsWith('fr') ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
  } catch {
    return sanitizePdfText(dateString);
  }
}

export interface PdfLayoutState {
  y: number;
}

export function ensurePdfSpace(doc: jsPDF, state: PdfLayoutState, needed: number): void {
  if (state.y + needed > PDF_PAGE_H - PDF_MARGIN_BOTTOM) {
    doc.addPage();
    state.y = PDF_MARGIN_TOP;
  }
}

export function writePdfParagraph(
  doc: jsPDF,
  state: PdfLayoutState,
  text: string,
  options: {
    x?: number;
    maxWidth?: number;
    fontSize?: number;
    lineHeight?: number;
    fontStyle?: 'normal' | 'bold' | 'italic';
    color?: [number, number, number];
    indent?: number;
  } = {}
): void {
  const x = options.x ?? PDF_MARGIN_X;
  const maxWidth = options.maxWidth ?? PDF_CONTENT_W - (options.indent ?? 0);
  const fontSize = options.fontSize ?? 9.5;
  const lineHeight = options.lineHeight ?? 4.6;
  const color = options.color ?? PDF_COLORS.text;

  doc.setFont('helvetica', options.fontStyle ?? 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);

  const safe = sanitizePdfText(text);
  const lines = doc.splitTextToSize(safe, maxWidth);
  for (const line of lines) {
    ensurePdfSpace(doc, state, lineHeight);
    doc.text(line, x + (options.indent ?? 0), state.y);
    state.y += lineHeight;
  }
}

export function drawPdfConventionHeader(
  doc: jsPDF,
  state: PdfLayoutState,
  title: string,
  conventionNumber: string,
  issueDate: string
): void {
  const bandH = 28;
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, PDF_PAGE_W, bandH, 'F');

  doc.setTextColor(...PDF_COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(sanitizePdfText(title.toUpperCase()), PDF_MARGIN_X, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Document contractuel', PDF_MARGIN_X, 21);

  const metaX = PDF_PAGE_W - PDF_MARGIN_X;
  doc.setFontSize(8);
  doc.text(`N° ${sanitizePdfText(conventionNumber)}`, metaX, 11, { align: 'right' });
  doc.text(`Date : ${issueDate}`, metaX, 17, { align: 'right' });

  doc.setDrawColor(...PDF_COLORS.accent);
  doc.setLineWidth(0.8);
  doc.line(PDF_MARGIN_X, bandH + 2, PDF_PAGE_W - PDF_MARGIN_X, bandH + 2);

  state.y = bandH + 10;
  doc.setTextColor(...PDF_COLORS.text);
}

export function drawPdfSectionTitle(
  doc: jsPDF,
  state: PdfLayoutState,
  title: string,
  variant: 'main' | 'article' | 'annex' = 'main'
): void {
  ensurePdfSpace(doc, state, 14);

  if (variant === 'main') {
    doc.setFillColor(...PDF_COLORS.primaryLight);
    doc.rect(PDF_MARGIN_X, state.y - 4, PDF_CONTENT_W, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(sanitizePdfText(title), PDF_MARGIN_X + 3, state.y + 2);
    state.y += 12;
  } else if (variant === 'article') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(sanitizePdfText(title), PDF_MARGIN_X, state.y);
    doc.setDrawColor(...PDF_COLORS.accent);
    doc.setLineWidth(0.4);
    doc.line(PDF_MARGIN_X, state.y + 2, PDF_MARGIN_X + 45, state.y + 2);
    state.y += 8;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(sanitizePdfText(title), PDF_MARGIN_X, state.y);
    state.y += 7;
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.text);
}

export function drawPdfPartiesBoxes(
  doc: jsPDF,
  state: PdfLayoutState,
  leftTitle: string,
  leftLines: string[],
  rightTitle: string,
  rightLines: string[]
): void {
  ensurePdfSpace(doc, state, 42);
  const boxW = (PDF_CONTENT_W - 6) / 2;
  const leftX = PDF_MARGIN_X;
  const rightX = PDF_MARGIN_X + boxW + 6;
  const headerH = 7;
  const lineH = 4.2;
  const bodyLines = Math.max(leftLines.length, rightLines.length, 3);
  const boxH = headerH + bodyLines * lineH + 8;

  ensurePdfSpace(doc, state, boxH + 4);

  for (const [x, title, lines] of [
    [leftX, leftTitle, leftLines],
    [rightX, rightTitle, rightLines],
  ] as [number, string, string[]][]) {
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.setFillColor(...PDF_COLORS.surface);
    doc.roundedRect(x, state.y, boxW, boxH, 1.5, 1.5, 'FD');

    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(x, state.y, boxW, headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.white);
    doc.text(sanitizePdfText(title), x + 3, state.y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.text);
    let ly = state.y + headerH + 5;
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(sanitizePdfText(line), boxW - 6);
      for (const wl of wrapped.slice(0, 2)) {
        doc.text(wl, x + 3, ly);
        ly += lineH;
      }
    }
  }

  state.y += boxH + 8;
}

export function drawPdfPreambleBox(doc: jsPDF, state: PdfLayoutState, paragraphs: string[]): void {
  const padding = 4;
  let totalH = padding * 2 + 6;
  const wrapped: string[][] = [];
  doc.setFontSize(9);
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(sanitizePdfText(p), PDF_CONTENT_W - 12);
    wrapped.push(lines);
    totalH += lines.length * 4.5 + 2;
  }

  ensurePdfSpace(doc, state, totalH);

  doc.setFillColor(...PDF_COLORS.surface);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(PDF_MARGIN_X, state.y, PDF_CONTENT_W, totalH, 2, 2, 'FD');

  let py = state.y + padding + 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.text);
  for (const lines of wrapped) {
    for (const line of lines) {
      doc.text(line, PDF_MARGIN_X + 6, py);
      py += 4.5;
    }
    py += 2;
  }

  state.y += totalH + 8;
  doc.setFont('helvetica', 'normal');
}

export function drawPdfArticleBlock(
  doc: jsPDF,
  state: PdfLayoutState,
  articleNumber: number,
  title: string,
  paragraphs: string[]
): void {
  drawPdfSectionTitle(doc, state, `Article ${articleNumber} — ${title}`, 'article');

  for (const p of paragraphs) {
    writePdfParagraph(doc, state, p, { fontSize: 9.5, lineHeight: 4.6, indent: 2 });
    state.y += 2;
  }
  state.y += 3;
}

export function drawPdfBulletList(doc: jsPDF, state: PdfLayoutState, items: string[]): void {
  for (const item of items) {
    const lines = doc.splitTextToSize(sanitizePdfText(item), PDF_CONTENT_W - 10);
    ensurePdfSpace(doc, state, lines.length * 4.5 + 2);
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text('•', PDF_MARGIN_X + 2, state.y);
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], PDF_MARGIN_X + 7, state.y);
      state.y += 4.5;
    }
    state.y += 1;
  }
}

export function drawPdfSignatureBlocks(
  doc: jsPDF,
  state: PdfLayoutState,
  left: { title: string; lines: string[] },
  right: { title: string; lines: string[] }
): void {
  const boxW = (PDF_CONTENT_W - 8) / 2;
  const boxH = 48;
  ensurePdfSpace(doc, state, boxH + 16);

  state.y += 6;
  drawPdfSectionTitle(doc, state, 'Signatures des Parties', 'main');

  const top = state.y;
  for (const [idx, block] of [left, right].entries()) {
    const x = PDF_MARGIN_X + idx * (boxW + 8);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.35);
    doc.setFillColor(...PDF_COLORS.white);
    doc.roundedRect(x, top, boxW, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(sanitizePdfText(block.title), x + 4, top + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.muted);
    let ly = top + 13;
    for (const line of block.lines) {
      if (line.includes('Signature') || line.includes('cachet')) continue;
      doc.text(sanitizePdfText(line), x + 4, ly);
      ly += 4;
    }

    doc.setDrawColor(...PDF_COLORS.border);
    doc.line(x + 4, top + boxH - 14, x + boxW - 4, top + boxH - 14);
    doc.setFontSize(7);
    doc.text('Date et signature', x + 4, top + boxH - 8);
  }

  state.y = top + boxH + 10;
}

export function applyPdfFooters(
  doc: jsPDF,
  footerNote: string,
  documentRef: string
): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const footerY = PDF_PAGE_H - 14;

    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(PDF_MARGIN_X, footerY - 4, PDF_PAGE_W - PDF_MARGIN_X, footerY - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(sanitizePdfText(documentRef), PDF_MARGIN_X, footerY);
    doc.text(`Page ${i} / ${total}`, PDF_PAGE_W - PDF_MARGIN_X, footerY, { align: 'right' });

    doc.setFontSize(6.5);
    doc.text(sanitizePdfText(footerNote), PDF_MARGIN_X, footerY + 4, {
      maxWidth: PDF_CONTENT_W,
    });
  }
}
