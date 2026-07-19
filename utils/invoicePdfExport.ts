import { jsPDF } from 'jspdf';
import { IncomeItem, TeamInvoiceSettings } from '../types';
import { buildInvoiceFromIncome } from './invoiceUtils';
import { formatFinancialAmount, formatFinancialDate } from './financialUtils';

const PDF_MARGIN = 14;

export function exportInvoicePdf(
  item: IncomeItem,
  settings: TeamInvoiceSettings,
  teamName: string,
  language: 'fr' | 'en' = 'fr'
): void {
  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  const invoice = buildInvoiceFromIncome(item, settings, teamName, language);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const labels = {
    title: language === 'en' ? 'INVOICE' : 'FACTURE',
    number: language === 'en' ? 'No.' : 'N°',
    date: language === 'en' ? 'Date' : 'Date',
    dueDate: language === 'en' ? 'Due date' : 'Échéance',
    issuer: language === 'en' ? 'Issuer' : 'Émetteur',
    client: language === 'en' ? 'Client' : 'Client',
    description: language === 'en' ? 'Description' : 'Description',
    account: language === 'en' ? 'Account' : 'Compte comptable',
    amountHT: language === 'en' ? 'Amount excl. VAT' : 'Montant HT',
    vat: language === 'en' ? 'VAT' : 'TVA',
    amountTTC: language === 'en' ? 'Amount incl. VAT' : 'Montant TTC',
    total: language === 'en' ? 'Total due' : 'Total à payer',
    notes: language === 'en' ? 'Notes' : 'Notes',
    payment: language === 'en' ? 'Payment by bank transfer' : 'Paiement par virement bancaire',
    siret: 'SIRET',
    vatNumber: language === 'en' ? 'VAT No.' : 'N° TVA',
    iban: 'IBAN',
  };

  let y = PDF_MARGIN;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(labels.title, PDF_MARGIN, y);
  doc.setFontSize(11);
  doc.text(`${labels.number} ${invoice.invoiceNumber}`, 140, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${labels.date} : ${formatFinancialDate(String(invoice.issueDate).slice(0, 10), locale)}`, 140, y);
  y += 5;
  doc.text(`${labels.dueDate} : ${formatFinancialDate(String(invoice.dueDate).slice(0, 10), locale)}`, 140, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(labels.issuer, PDF_MARGIN, y);
  doc.text(labels.client, 110, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const issuerLines = [
    invoice.issuer.name,
    invoice.issuer.address,
    invoice.issuer.siret ? `${labels.siret} : ${invoice.issuer.siret}` : '',
    invoice.issuer.vatNumber ? `${labels.vatNumber} : ${invoice.issuer.vatNumber}` : '',
    invoice.issuer.iban ? `${labels.iban} : ${invoice.issuer.iban}` : '',
  ].filter(Boolean);

  const clientLines = [
    invoice.client.name,
    invoice.client.address,
    invoice.client.vatNumber ? `${labels.vatNumber} : ${invoice.client.vatNumber}` : '',
    invoice.client.email || '',
    invoice.client.phone || '',
  ].filter(Boolean);

  const maxLines = Math.max(issuerLines.length, clientLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (issuerLines[i]) doc.text(issuerLines[i], PDF_MARGIN, y);
    if (clientLines[i]) doc.text(clientLines[i], 110, y);
    y += 4.5;
  }
  y += 8;

  doc.setFillColor(240, 240, 240);
  doc.rect(PDF_MARGIN, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text(labels.description, PDF_MARGIN + 2, y + 5);
  doc.text(labels.amountHT, 120, y + 5);
  doc.text(labels.vat, 150, y + 5);
  doc.text(labels.amountTTC, 170, y + 5);
  y += 10;

  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(invoice.line.description, 100);
  doc.text(descLines, PDF_MARGIN + 2, y);
  doc.text(formatFinancialAmount(invoice.line.amountHT, locale), 120, y);
  doc.text(`${invoice.line.vatRate}%`, 150, y);
  doc.text(formatFinancialAmount(invoice.line.amountTTC, locale), 170, y);
  y += Math.max(descLines.length * 4.5, 6);

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`${labels.account} : ${invoice.line.accountingCode} — ${invoice.line.accountingLabel}`, PDF_MARGIN + 2, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${labels.total} : ${formatFinancialAmount(invoice.line.amountTTC, locale)}`, 120, y);
  y += 10;

  if (invoice.issuer.iban) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(labels.payment, PDF_MARGIN, y);
    y += 5;
    doc.text(`${labels.iban} : ${invoice.issuer.iban}`, PDF_MARGIN, y);
    y += 8;
  }

  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text(labels.notes, PDF_MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(invoice.notes, 180);
    doc.text(noteLines, PDF_MARGIN, y);
  }

  const safeNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`LogiCycle_Facture_${safeNumber}.pdf`);
}

export function exportInvoicesSummaryPdf(
  items: IncomeItem[],
  settings: TeamInvoiceSettings,
  teamName: string,
  language: 'fr' | 'en' = 'fr'
): void {
  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = PDF_MARGIN;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(language === 'en' ? 'Invoices summary' : 'Synthèse des factures', PDF_MARGIN, y);
  y += 10;

  doc.setFontSize(8);
  const cols = [PDF_MARGIN, 40, 85, 110, 135, 160];
  const headers =
    language === 'en'
      ? ['No.', 'Date', 'Client', 'Account', 'Amount', 'Status']
      : ['N°', 'Date', 'Client', 'Compte', 'Montant', 'Statut'];
  headers.forEach((h, i) => doc.text(h, cols[i], y));
  y += 5;
  doc.setFont('helvetica', 'normal');

  let total = 0;
  for (const item of items) {
    if (y > 280) {
      doc.addPage();
      y = PDF_MARGIN;
    }
    const inv = buildInvoiceFromIncome(item, settings, teamName, language);
    total += inv.line.amountTTC;
    const row = [
      inv.invoiceNumber.slice(0, 12),
      formatFinancialDate(String(inv.issueDate).slice(0, 10), locale),
      (inv.client.name || '—').slice(0, 20),
      inv.line.accountingCode,
      formatFinancialAmount(inv.line.amountTTC, locale),
      String(inv.status).slice(0, 10),
    ];
    row.forEach((cell, i) => doc.text(cell, cols[i], y));
    y += 4.5;
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(
    `${language === 'en' ? 'Total' : 'Total'} : ${formatFinancialAmount(total, locale)}`,
    PDF_MARGIN,
    y
  );

  doc.save(`LogiCycle_Factures_${teamName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
