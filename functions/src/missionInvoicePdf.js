/**
 * PDF facture mission minimal (PDF 1.4 texte) — zéro dépendance.
 * Suffisant pour archivage comptable Storage ; le front peut régénérer un PDF enrichi.
 */

function escapePdfText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7EÀ-ÿ€]/g, '?');
}

function buildSimpleInvoicePdf(lines) {
  const contentLines = [];
  let y = 800;
  for (const line of lines) {
    const safe = escapePdfText(line);
    contentLines.push(`BT /F1 10 Tf 50 ${y} Td (${safe}) Tj ET`);
    y -= 14;
    if (y < 50) break;
  }
  const stream = contentLines.join('\n');
  const streamLen = Buffer.byteLength(stream, 'utf8');

  const objects = [];
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n');
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n');
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n',
  );
  objects.push(`4 0 obj<< /Length ${streamLen} >>stream\n${stream}\nendstream\nendobj\n`);
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function formatEur(amount) {
  return `${Number(amount || 0).toFixed(2)} EUR`;
}

function buildTeamInvoicePdfBuffer(archive) {
  const provisional = archive.provisional || !archive.issuerSiret || String(archive.issuerSiret).includes('COMPLETER');
  const lines = [
    provisional ? '*** DOCUMENT PROVISOIRE — identite editeur incomplete ***' : 'FACTURE',
    `N: ${archive.invoiceNumber || ''}`,
    `Date: ${archive.issueDate || ''}`,
    `Payee le: ${(archive.paidAt || '').slice(0, 10)}`,
    '',
    `Emetteur: ${archive.issuerName || 'Rovik'}`,
    `SIRET: ${archive.issuerSiret || 'n/a'}`,
    `Adresse: ${archive.issuerAddress || 'n/a'}`,
    '',
    `Client: ${archive.client?.name || ''}`,
    `SIRET client: ${archive.client?.siret || 'n/a'}`,
    `Adresse: ${archive.client?.address || 'n/a'}`,
    '',
    `Mission: ${archive.missionTitle || ''}`,
    `GMV: ${formatEur(archive.gmvEur)}`,
    `Commission plateforme: ${formatEur(archive.commissionEur)}`,
    `Net vacataire: ${formatEur(archive.netEur)}`,
    '',
    `Ref paiement: ${archive.paymentIntentId || archive.checkoutSessionId || ''}`,
    '',
    archive.vatMention || 'TVA non applicable art. 293 B CGI (franchise) — a maj post assujettissement.',
    '',
    'Rovik — intermediaire de paiement (merchant of record). Conservez ce document.',
  ];
  return buildSimpleInvoicePdf(lines);
}

function buildVacataireInvoicePdfBuffer(archive) {
  const draft = archive.kind !== 'vacataire_mission_invoice_issued';
  const lines = [
    draft ? '*** MODELE / BROUILLON FACTURE VACATAIRE ***' : 'FACTURE',
    `N: ${archive.invoiceNumber || ''}`,
    `Date: ${archive.issueDate || archive.issuedAt || ''}`,
    '',
    `Emetteur: ${archive.issuer?.legalName || archive.issuer?.tradeName || archive.acceptedName || 'Vacataire'}`,
    `SIRET: ${archive.issuer?.siret || 'A COMPLETER'}`,
    `Adresse: ${[archive.issuer?.addressLine, archive.issuer?.postalCode, archive.issuer?.city].filter(Boolean).join(' ') || 'A COMPLETER'}`,
    '',
    'Client: Rovik',
    '',
    `Mission: ${archive.missionTitle || ''}`,
    `Montant net: ${formatEur(archive.netEur)}`,
    `Commission retenue plateforme: ${formatEur(archive.commissionEur)}`,
    '',
    `Ref paiement: ${archive.paymentIntentId || ''}`,
    '',
    draft
      ? 'Finalisez SIRET puis emettez via Rovik. Ce n est pas un bulletin de paie.'
      : 'Facture emise a Rovik. Ce n est pas un bulletin de paie.',
  ];
  return buildSimpleInvoicePdf(lines);
}

function buildCreditNotePdfBuffer(archive) {
  const lines = [
    'AVOIR / CREDIT NOTE',
    `N: ${archive.creditNoteNumber || ''}`,
    `Facture d origine: ${archive.originalInvoiceNumber || ''}`,
    `Date remboursement: ${(archive.refundedAt || '').slice(0, 10)}`,
    '',
    `Mission ID: ${archive.missionId || ''}`,
    `GMV rembourse: ${formatEur(centsToEur(archive.gmvCents))}`,
    `Ref paiement: ${archive.paymentIntentId || ''}`,
  ];
  return buildSimpleInvoicePdf(lines);
}

function centsToEur(cents) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

module.exports = {
  buildTeamInvoicePdfBuffer,
  buildVacataireInvoicePdfBuffer,
  buildCreditNotePdfBuffer,
};
