import { jsPDF } from 'jspdf';
import { ExpenseReceipt, RaceEvent } from '../types';
import { formatFinancialAmount, formatFinancialDate, buildEventNameMap } from './financialUtils';

const PDF_MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

function drawSummaryTable(
  doc: jsPDF,
  receipts: ExpenseReceipt[],
  eventNames: Map<string, string>,
  locale: string,
  startY: number
): number {
  let y = startY;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Synthèse des justificatifs', PDF_MARGIN, y);
  y += 7;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const cols = [PDF_MARGIN, 28, 58, 88, 118, 148, 175];
  const headers = ['Date', 'Libellé', 'Compte', 'Montant', 'Statut', 'Événement'];
  headers.forEach((h, i) => doc.text(h, cols[i], y));
  y += 5;
  doc.setFont('helvetica', 'normal');

  let total = 0;
  for (const r of receipts) {
    if (y > PAGE_H - 40) {
      doc.addPage();
      y = PDF_MARGIN + 5;
    }
    total += r.amount;
    const eventLabel = r.eventId ? eventNames.get(r.eventId) || r.eventId : '—';
    const row = [
      formatFinancialDate(r.receiptDate, locale),
      (r.merchant || r.description || '—').slice(0, 22),
      r.accountingCode,
      formatFinancialAmount(r.amount, locale),
      r.status,
      eventLabel.slice(0, 18),
    ];
    row.forEach((cell, i) => doc.text(cell, cols[i], y));
    y += 4.5;
  }

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total : ${formatFinancialAmount(total, locale)}`, PDF_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  return y + 8;
}

function fitImageRect(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  const ratio = imgW / imgH;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { w, h };
}

export interface ExpenseReceiptPdfOptions {
  teamName: string;
  raceEvents?: RaceEvent[];
  locale?: string;
  eventId?: string;
  includeImages?: boolean;
}

/** Génère un PDF regroupant tous les justificatifs (synthèse + scans). */
export async function exportExpenseReceiptsPdf(
  receipts: ExpenseReceipt[],
  options: ExpenseReceiptPdfOptions
): Promise<void> {
  const { teamName, raceEvents, locale = 'fr-FR', eventId, includeImages = true } = options;
  const filtered = eventId ? receipts.filter((r) => r.eventId === eventId) : receipts;
  if (filtered.length === 0) return;

  const eventNames = buildEventNameMap(raceEvents);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Dossier justificatifs de frais', PDF_MARGIN, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Équipe : ${teamName}`, PDF_MARGIN, 26);
  doc.text(`Généré le : ${new Date().toLocaleDateString(locale)}`, PDF_MARGIN, 32);
  doc.text(`${filtered.length} pièce(s)`, PDF_MARGIN, 38);

  let y = drawSummaryTable(doc, filtered, eventNames, locale, 46);

  if (includeImages) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Scans des justificatifs', PDF_MARGIN, PDF_MARGIN + 4);
    y = PDF_MARGIN + 12;

    const contentW = PAGE_W - PDF_MARGIN * 2;
    const maxImgH = 120;

    for (let i = 0; i < filtered.length; i++) {
      const receipt = filtered[i];
      const img = await loadImageAsDataUrl(receipt.imageUrl);
      const headerH = 14;
      const needed = headerH + (img ? fitImageRect(img.width, img.height, contentW, maxImgH).h : 10) + 8;

      if (y + needed > PAGE_H - PDF_MARGIN) {
        doc.addPage();
        y = PDF_MARGIN;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${i + 1}. ${receipt.merchant || receipt.description || 'Justificatif'} — ${formatFinancialAmount(receipt.amount, locale)}`,
        PDF_MARGIN,
        y
      );
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(
        `${formatFinancialDate(receipt.receiptDate, locale)} | Compte ${receipt.accountingCode} | ${receipt.submittedByName || ''}`,
        PDF_MARGIN,
        y
      );
      y += 5;

      if (img) {
        const { w, h } = fitImageRect(img.width, img.height, contentW, maxImgH);
        const format = img.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(img.dataUrl, format, PDF_MARGIN, y, w, h);
        y += h + 8;
      } else {
        doc.text('(Image non disponible)', PDF_MARGIN, y);
        y += 10;
      }
    }
  }

  const suffix = eventId ? `_event_${eventId.slice(0, 8)}` : '';
  doc.save(
    `LogiCycle_Justificatifs_${teamName.replace(/\s+/g, '_')}${suffix}_${new Date().toISOString().slice(0, 10)}.pdf`
  );
}
