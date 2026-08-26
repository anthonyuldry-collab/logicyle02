import { jsPDF } from 'jspdf';
import type { Mission, MissionApplication, MissionPayment } from '../types';
import {
  computeMissionCommissionEur,
  estimateMissionGmvEur,
} from '../constants/missionMarketplace';
import {
  formatPdfAmount,
  formatPdfDate,
  sanitizePdfText,
} from './pdfLayoutUtils';
import {
  buildTeamMissionInvoice,
  buildVacataireDraftMissionInvoice,
  type MissionInvoiceDocument,
} from './missionInvoiceUtils';

const MARGIN = 14;

function drawMissionInvoicePdf(doc: jsPDF, invoice: MissionInvoiceDocument, language: 'fr' | 'en'): void {
  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  const labels =
    language === 'en'
      ? {
          title: invoice.isDraftTemplate ? 'INVOICE DRAFT (TEMPLATE)' : 'INVOICE',
          number: 'No.',
          date: 'Date',
          paid: 'Paid on',
          issuer: 'Issuer',
          client: 'Client',
          description: 'Description',
          amount: 'Amount',
          vat: 'VAT',
          total: 'Total',
          commission: 'Platform fee',
          net: 'Net to freelancer',
          paymentRef: 'Payment ref.',
          notes: 'Notes',
        }
      : {
          title: invoice.isDraftTemplate ? 'FACTURE — MODÈLE À FINALISER' : 'FACTURE',
          number: 'N°',
          date: 'Date',
          paid: 'Payée le',
          issuer: 'Émetteur',
          client: 'Client',
          description: 'Description',
          amount: 'Montant',
          vat: 'TVA',
          total: 'Total',
          commission: 'Commission plateforme',
          net: 'Net vacataire',
          paymentRef: 'Réf. paiement',
          notes: 'Notes',
        };

  let y = MARGIN;

  if (invoice.isDraftTemplate) {
    doc.setFillColor(255, 243, 205);
    doc.rect(MARGIN, y - 4, 182, 10, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text(
      sanitizePdfText(
        language === 'en'
          ? 'DRAFT — complete SIRET / address / VAT before issuing'
          : 'BROUILLON — complétez SIRET / adresse / TVA avant émission',
      ),
      MARGIN + 2,
      y + 2,
    );
    doc.setTextColor(0, 0, 0);
    y += 12;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(sanitizePdfText(labels.title), MARGIN, y);
  doc.setFontSize(11);
  doc.text(sanitizePdfText(`${labels.number} ${invoice.invoiceNumber}`), 120, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(sanitizePdfText(`${labels.date} : ${formatPdfDate(invoice.issueDate, locale)}`), 120, y);
  y += 5;
  if (invoice.paidAt) {
    doc.text(
      sanitizePdfText(`${labels.paid} : ${formatPdfDate(invoice.paidAt.slice(0, 10), locale)}`),
      120,
      y,
    );
    y += 5;
  }
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(labels.issuer, MARGIN, y);
  doc.text(labels.client, 110, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const issuerLines = [
    invoice.issuer.name,
    invoice.issuer.note,
    invoice.issuer.address,
    invoice.issuer.siret ? `SIRET : ${invoice.issuer.siret}` : '',
    invoice.issuer.vatNumber ? `TVA : ${invoice.issuer.vatNumber}` : '',
    invoice.issuer.email || '',
  ]
    .filter(Boolean)
    .map((l) => sanitizePdfText(String(l)));

  const clientLines = [
    invoice.client.name,
    invoice.client.note,
    invoice.client.address,
    invoice.client.siret ? `SIRET : ${invoice.client.siret}` : '',
    invoice.client.vatNumber ? `TVA : ${invoice.client.vatNumber}` : '',
    invoice.client.email || '',
  ]
    .filter(Boolean)
    .map((l) => sanitizePdfText(String(l)));

  const maxLines = Math.max(issuerLines.length, clientLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (issuerLines[i]) doc.text(issuerLines[i], MARGIN, y);
    if (clientLines[i]) doc.text(clientLines[i], 110, y);
    y += 4.5;
  }
  y += 8;

  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text(labels.description, MARGIN + 2, y + 5);
  doc.text(labels.amount, 165, y + 5);
  y += 10;

  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(sanitizePdfText(invoice.line.description), 145);
  doc.text(descLines, MARGIN + 2, y);
  doc.text(formatPdfAmount(invoice.line.amountEur, locale), 165, y);
  y += Math.max(descLines.length * 4.5, 6) + 4;

  if (invoice.kind === 'team' && invoice.line.commissionEur != null) {
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(
      sanitizePdfText(
        `${labels.commission} : ${formatPdfAmount(invoice.line.commissionEur, locale)} · ${labels.net} : ${formatPdfAmount(invoice.line.netToVacataireEur || 0, locale)}`,
      ),
      MARGIN + 2,
      y,
    );
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  doc.setFontSize(9);
  const vatMention = language === 'en' ? invoice.vatMentionEn : invoice.vatMentionFr;
  const vatLines = doc.splitTextToSize(sanitizePdfText(`${labels.vat} : ${vatMention}`), 180);
  doc.text(vatLines, MARGIN, y);
  y += vatLines.length * 4.5 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    sanitizePdfText(`${labels.total} : ${formatPdfAmount(invoice.line.amountEur, locale)}`),
    120,
    y,
  );
  y += 10;

  if (invoice.paymentRef) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(sanitizePdfText(`${labels.paymentRef} : ${invoice.paymentRef}`), MARGIN, y);
    y += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(labels.notes, MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const note = language === 'en' ? invoice.legalNoteEn : invoice.legalNoteFr;
  const noteLines = doc.splitTextToSize(sanitizePdfText(note), 182);
  doc.text(noteLines, MARGIN, y);
}

function saveMissionInvoice(invoice: MissionInvoiceDocument, prefix: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawMissionInvoicePdf(doc, invoice, 'fr');
  const safe = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${prefix}_${safe}.pdf`);
}

export function exportTeamMissionInvoicePdf(input: {
  mission: Mission;
  payment: MissionPayment;
  teamName: string;
  teamAddress?: string;
  accepted?: MissionApplication | null;
  isProTeam?: boolean;
  teamBilling?: {
    name?: string;
    address?: string;
    siret?: string;
    vatNumber?: string;
    email?: string;
  };
}): void {
  const gmvEur = estimateMissionGmvEur(input.mission);
  const commissionEur = computeMissionCommissionEur(gmvEur, { isProTeam: input.isProTeam });
  const invoice = buildTeamMissionInvoice({
    mission: input.mission,
    payment: input.payment,
    teamName: input.teamName,
    teamAddress: input.teamAddress,
    teamBilling: input.teamBilling || input.payment.teamBillingSnapshot,
    accepted: input.accepted,
    gmvEur,
    commissionEur,
    language: 'fr',
  });
  saveMissionInvoice(invoice, 'Rovik_Facture_Mission');
}

export function exportVacataireDraftMissionInvoicePdf(input: {
  mission: Mission;
  payment: MissionPayment;
  teamName: string;
  accepted: MissionApplication;
  isProTeam?: boolean;
  business?: import('../types').IndependentBusinessProfile | null;
}): void {
  const gmvEur = estimateMissionGmvEur(input.mission);
  const commissionEur = computeMissionCommissionEur(gmvEur, { isProTeam: input.isProTeam });
  const invoice = buildVacataireDraftMissionInvoice({
    mission: input.mission,
    payment: input.payment,
    teamName: input.teamName,
    accepted: input.accepted,
    gmvEur,
    commissionEur,
    language: 'fr',
    business: input.business || input.payment.vacataireBusinessSnapshot,
  });
  saveMissionInvoice(
    invoice,
    invoice.isDraftTemplate ? 'Modele_Facture_Vacataire' : 'Facture_Vacataire',
  );
}
