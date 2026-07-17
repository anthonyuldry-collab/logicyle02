import { jsPDF } from 'jspdf';
import { IncomeCategory, IncomeItem, TeamInvoiceSettings } from '../types';
import {
  buildCerfaReceiptData,
  buildPartnershipConventionData,
  getConventionTitle,
} from './partnershipDocumentUtils';
import {
  buildCerfa11580Sections,
  buildCerfa16216Sections,
  buildCerfaSignatureBlocks,
  buildConventionAnnexes,
  buildConventionArticles,
  buildConventionPreamble,
  buildPartnerPartyLines,
  buildSignatureBlocks,
  buildTeamPartyLines,
  CerfaSection,
} from './partnershipLegalContent';
import {
  applyPdfFooters,
  drawPdfArticleBlock,
  drawPdfBulletList,
  drawPdfConventionHeader,
  drawPdfPartiesBoxes,
  drawPdfPreambleBox,
  drawPdfSectionTitle,
  drawPdfSignatureBlocks,
  ensurePdfSpace,
  formatPdfDate,
  PDF_COLORS,
  PDF_MARGIN_TOP,
  PDF_PAGE_H,
  PdfLayoutState,
  sanitizePdfText,
} from './pdfLayoutUtils';

const CERFA_MARGIN = 14;
const CERFA_CONTENT_W = 210 - CERFA_MARGIN * 2;

function getPartyTitles(category: IncomeCategory): { left: string; right: string } {
  if (category === IncomeCategory.SUBVENTIONS) {
    return { left: 'Le Bénéficiaire', right: 'Le Financeur' };
  }
  if (category === IncomeCategory.MECENAT) {
    return { left: 'Le Bénéficiaire', right: 'Le Mécène' };
  }
  return { left: "L'Équipe", right: 'Le Partenaire' };
}

function getSignatureTitles(category: IncomeCategory): { left: string; right: string } {
  if (category === IncomeCategory.SUBVENTIONS) {
    return { left: 'Pour le Bénéficiaire', right: 'Pour le Financeur' };
  }
  if (category === IncomeCategory.MECENAT) {
    return { left: 'Pour le Bénéficiaire', right: 'Pour le Mécène' };
  }
  return { left: "Pour l'Équipe", right: 'Pour le Partenaire' };
}

function ensureCerfaSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PDF_PAGE_H - CERFA_MARGIN) {
    doc.addPage();
    return CERFA_MARGIN;
  }
  return y;
}

function writeCerfaParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 4.8,
  fontSize = 9
): number {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(sanitizePdfText(text), maxWidth);
  for (const line of lines) {
    y = ensureCerfaSpace(doc, y, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function writeCerfaSectionTitle(doc: jsPDF, title: string, y: number, size = 10): number {
  y = ensureCerfaSpace(doc, y, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(sanitizePdfText(title), CERFA_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.text);
  return y + 6;
}

function drawCerfaFieldBox(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  fullWidth = false
): number {
  const boxW = fullWidth ? CERFA_CONTENT_W : CERFA_CONTENT_W / 2 - 2;
  const x = CERFA_MARGIN;
  y = ensureCerfaSpace(doc, y, 14);
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(sanitizePdfText(label), x, y);
  doc.setTextColor(...PDF_COLORS.text);
  y += 3.5;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.setFillColor(...PDF_COLORS.surface);
  doc.roundedRect(x, y, boxW, 8, 1, 1, 'FD');
  doc.setFontSize(8.5);
  const valLines = doc.splitTextToSize(sanitizePdfText(value), boxW - 4);
  doc.text(valLines.slice(0, 2), x + 2, y + 5);
  return y + 10;
}

function renderCerfaSection(doc: jsPDF, section: CerfaSection, y: number): number {
  y = writeCerfaSectionTitle(doc, section.title, y);
  if (section.intro) {
    y = writeCerfaParagraph(doc, section.intro, CERFA_MARGIN, y, CERFA_CONTENT_W, 4.5, 8);
    y += 2;
  }
  for (const field of section.fields) {
    y = drawCerfaFieldBox(doc, field.label, field.value, y, field.fullWidth);
  }
  if (section.checkboxes) {
    y += 2;
    for (const cb of section.checkboxes) {
      y = ensureCerfaSpace(doc, y, 5);
      doc.setFontSize(8);
      doc.text(cb.checked ? '[x]' : '[ ]', CERFA_MARGIN, y);
      doc.text(sanitizePdfText(cb.label), CERFA_MARGIN + 6, y);
      y += 4.5;
    }
  }
  if (section.paragraphs) {
    y += 2;
    for (const p of section.paragraphs) {
      y = writeCerfaParagraph(doc, p, CERFA_MARGIN, y, CERFA_CONTENT_W, 4.5, 8.5);
      y += 1;
    }
  }
  return y + 4;
}

function renderCerfaHeader(
  doc: jsPDF,
  formId: string,
  title: string,
  receiptNumber: string,
  issueDate: string,
  y: number
): number {
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(...PDF_COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`CERFA n° ${sanitizePdfText(formId)}`, CERFA_MARGIN, 10);
  doc.setFontSize(9);
  doc.text(sanitizePdfText(title), CERFA_MARGIN, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Reçu n° ${sanitizePdfText(receiptNumber)}`, 130, 10);
  doc.text(`Date d'émission : ${formatPdfDate(issueDate.slice(0, 10))}`, 130, 17);

  doc.setFontSize(7);
  doc.setTextColor(220, 230, 240);
  doc.text(
    'Formulaire généré par LogiCycle — à valider par le représentant légal avant remise',
    CERFA_MARGIN,
    23
  );

  doc.setTextColor(...PDF_COLORS.text);
  return y + 32;
}

function renderCerfaSignatures(
  doc: jsPDF,
  left: string[],
  right: string[],
  y: number,
  leftTitle: string,
  rightTitle: string
): number {
  const boxW = (CERFA_CONTENT_W - 8) / 2;
  const boxH = 42;
  y = ensureCerfaSpace(doc, y, boxH + 12);
  y += 4;

  const top = y;
  for (const [idx, block] of [
    { title: leftTitle, lines: left },
    { title: rightTitle, lines: right },
  ].entries()) {
    const x = CERFA_MARGIN + idx * (boxW + 8);
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
    doc.line(x + 4, top + boxH - 12, x + boxW - 4, top + boxH - 12);
    doc.setFontSize(7);
    doc.text('Date et signature', x + 4, top + boxH - 7);
  }

  return top + boxH + 8;
}

export function exportPartnershipConventionPdf(
  item: IncomeItem,
  settings: TeamInvoiceSettings,
  teamName: string,
  language: 'fr' | 'en' = 'fr'
): void {
  const data = buildPartnershipConventionData(item, settings, teamName);
  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const title = getConventionTitle(item.category, language);
  const state: PdfLayoutState = { y: PDF_MARGIN_TOP };
  const partyTitles = getPartyTitles(item.category);
  const sigTitles = getSignatureTitles(item.category);

  drawPdfConventionHeader(
    doc,
    state,
    title,
    data.conventionNumber,
    formatPdfDate(data.issueDate.slice(0, 10), locale)
  );

  drawPdfPartiesBoxes(
    doc,
    state,
    partyTitles.left,
    buildTeamPartyLines(data),
    partyTitles.right,
    buildPartnerPartyLines(data)
  );

  drawPdfSectionTitle(doc, state, 'Préambule', 'main');
  drawPdfPreambleBox(doc, state, buildConventionPreamble(data, item.category, locale));

  const articles = buildConventionArticles(data, item.category, locale);
  for (const article of articles) {
    ensurePdfSpace(doc, state, 20);
    drawPdfArticleBlock(doc, state, article.number, article.title, article.paragraphs);
  }

  const annexes = buildConventionAnnexes(data, item.category);
  for (const annex of annexes) {
    ensurePdfSpace(doc, state, 24);
    drawPdfSectionTitle(doc, state, annex.title, 'annex');
    drawPdfBulletList(doc, state, annex.content);
    state.y += 4;
  }

  const sigs = buildSignatureBlocks(data);
  drawPdfSignatureBlocks(
    doc,
    state,
    { title: sigTitles.left, lines: sigs.team },
    { title: sigTitles.right, lines: sigs.partner }
  );

  applyPdfFooters(
    doc,
    'Document généré par LogiCycle. Recommandation : faire relire par un conseil juridique avant signature. Fait en deux exemplaires originaux.',
    sanitizePdfText(data.conventionNumber)
  );

  const safeName = data.conventionNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`LogiCycle_${title.replace(/\s+/g, '_')}_${safeName}.pdf`);
}

export function exportCerfaReceiptPdf(
  item: IncomeItem,
  settings: TeamInvoiceSettings,
  teamName: string
): void {
  const data = buildCerfaReceiptData(item, settings, teamName);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = CERFA_MARGIN;
  y = renderCerfaHeader(
    doc,
    data.formId,
    data.formTitle,
    data.receiptNumber,
    data.issueDate,
    y
  );

  const sections =
    data.formId === '16216-01'
      ? buildCerfa16216Sections(data)
      : buildCerfa11580Sections(data);

  for (const section of sections) {
    y = renderCerfaSection(doc, section, y);
  }

  const sigs = buildCerfaSignatureBlocks(data);
  y = renderCerfaSignatures(
    doc,
    sigs.beneficiary,
    sigs.donor,
    y,
    'Organisme bénéficiaire',
    'Donateur / Mécène'
  );

  applyPdfFooters(
    doc,
    'Ce document reprend la structure des formulaires CERFA officiels. Il doit être signé et cacheté par le représentant légal de l\'organisme bénéficiaire avant remise. Conservation obligatoire : 6 ans.',
    sanitizePdfText(data.receiptNumber)
  );

  const safeName = data.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`LogiCycle_CERFA_${data.formId}_${safeName}.pdf`);
}

export function exportPartnershipDocumentsBundle(
  item: IncomeItem,
  settings: TeamInvoiceSettings,
  teamName: string,
  language: 'fr' | 'en' = 'fr'
): void {
  if (item.category === IncomeCategory.MECENAT) {
    exportCerfaReceiptPdf(item, settings, teamName);
  }
  exportPartnershipConventionPdf(item, settings, teamName, language);
}
