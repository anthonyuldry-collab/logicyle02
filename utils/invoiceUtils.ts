import { resolveIncomeAccountingCode } from '../constants/accountingCodes';
import {
  IncomeCategory,
  IncomeItem,
  InvoiceStatus,
  TeamInvoiceSettings,
} from '../types';

export function computeInvoiceAmounts(amountTTC: number, vatRate: number) {
  const rate = Math.max(0, vatRate) / 100;
  if (rate === 0) {
    return { amountHT: Math.round(amountTTC * 100) / 100, vatAmount: 0, amountTTC };
  }
  const amountHT = Math.round((amountTTC / (1 + rate)) * 100) / 100;
  const vatAmount = Math.round((amountTTC - amountHT) * 100) / 100;
  return { amountHT, vatAmount, amountTTC };
}

export function enrichIncomeWithAccounting(
  item: IncomeItem,
  language: 'fr' | 'en' = 'fr',
  vatRate?: number
): IncomeItem {
  const accounting = resolveIncomeAccountingCode(item.category, language);
  const effectiveVatRate = vatRate ?? item.vatRate ?? 0;
  const { amountHT } = computeInvoiceAmounts(item.amount, effectiveVatRate);

  return {
    ...item,
    accountingCode: accounting.code,
    accountingLabel: accounting.label,
    accountingJournal: accounting.journal,
    vatRate: effectiveVatRate,
    amountHT,
    clientName: item.clientName || item.sponsorshipContactName,
    invoiceStatus: item.invoiceStatus || InvoiceStatus.DRAFT,
  };
}

export function formatInvoiceNumber(
  settings: TeamInvoiceSettings,
  sequence: number,
  year = new Date().getFullYear()
): string {
  const prefix = (settings.invoicePrefix || 'FAC').toUpperCase();
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

export function issueInvoice(
  item: IncomeItem,
  settings: TeamInvoiceSettings,
  language: 'fr' | 'en' = 'fr'
): { item: IncomeItem; settings: TeamInvoiceSettings } {
  const year = item.date ? new Date(item.date + 'T12:00:00').getFullYear() : new Date().getFullYear();
  const nextNumber = settings.nextInvoiceNumber ?? 1;
  const invoiceNumber = item.invoiceNumber || formatInvoiceNumber(settings, nextNumber, year);

  const enriched = enrichIncomeWithAccounting(
    {
      ...item,
      invoiceNumber,
      invoiceStatus: InvoiceStatus.ISSUED,
      issuedAt: new Date().toISOString(),
    },
    language,
    settings.defaultVatRate
  );

  return {
    item: enriched,
    settings: {
      ...settings,
      nextInvoiceNumber: item.invoiceNumber ? nextNumber : nextNumber + 1,
    },
  };
}

export function markInvoicePaid(item: IncomeItem): IncomeItem {
  return {
    ...item,
    invoiceStatus: InvoiceStatus.PAID,
    paidAt: new Date().toISOString(),
  };
}

export function cancelInvoice(item: IncomeItem): IncomeItem {
  if (item.invoiceStatus === InvoiceStatus.PAID) {
    throw new Error('Cannot cancel a paid invoice');
  }
  return {
    ...item,
    invoiceStatus: InvoiceStatus.CANCELLED,
  };
}

export function createCreditNote(
  original: IncomeItem,
  settings: TeamInvoiceSettings,
  language: 'fr' | 'en' = 'fr'
): { item: IncomeItem; settings: TeamInvoiceSettings } {
  if (
    original.invoiceStatus !== InvoiceStatus.ISSUED &&
    original.invoiceStatus !== InvoiceStatus.PAID
  ) {
    throw new Error('Credit note requires an issued invoice');
  }
  const year = new Date().getFullYear();
  const nextNumber = settings.nextInvoiceNumber ?? 1;
  const prefix = (settings.invoicePrefix || 'FAC').toUpperCase();
  const creditNumber = `${prefix}-AV-${year}-${String(nextNumber).padStart(4, '0')}`;

  const creditItem: IncomeItem = enrichIncomeWithAccounting(
    {
      ...original,
      id: crypto.randomUUID(),
      description: `Avoir — ${original.description}`,
      amount: -Math.abs(original.amount),
      invoiceNumber: creditNumber,
      invoiceStatus: InvoiceStatus.ISSUED,
      issuedAt: new Date().toISOString(),
      creditNoteForInvoiceId: original.id,
      paidAt: undefined,
    },
    language,
    settings.defaultVatRate
  );

  return {
    item: creditItem,
    settings: { ...settings, nextInvoiceNumber: nextNumber + 1 },
  };
}

export function isInvoiceCancellable(item: IncomeItem): boolean {
  return (
    item.invoiceStatus === InvoiceStatus.ISSUED ||
    item.invoiceStatus === InvoiceStatus.DRAFT
  );
}

export function buildInvoiceFromIncome(
  item: IncomeItem,
  settings: TeamInvoiceSettings,
  teamName: string,
  language: 'fr' | 'en' = 'fr'
) {
  const enriched = enrichIncomeWithAccounting(item, language, settings.defaultVatRate);
  const { amountHT, vatAmount } = computeInvoiceAmounts(enriched.amount, enriched.vatRate ?? 0);

  return {
    invoiceNumber: enriched.invoiceNumber || 'BROUILLON',
    status: enriched.invoiceStatus || InvoiceStatus.DRAFT,
    issueDate: enriched.issuedAt || enriched.date,
    dueDate: enriched.date,
    issuer: {
      name: settings.issuerName || teamName,
      address: settings.issuerAddress,
      siret: settings.issuerSiret,
      vatNumber: settings.issuerVatNumber,
      iban: settings.issuerIban,
    },
    client: {
      name: enriched.clientName || enriched.sponsorshipContactName || '—',
      address: enriched.clientAddress,
      vatNumber: enriched.clientVatNumber,
      email: enriched.sponsorshipContactEmail,
      phone: enriched.sponsorshipContactPhone,
    },
    line: {
      description: enriched.description,
      category: enriched.category,
      accountingCode: enriched.accountingCode || '',
      accountingLabel: enriched.accountingLabel || '',
      amountHT,
      vatRate: enriched.vatRate ?? 0,
      vatAmount,
      amountTTC: enriched.amount,
    },
    notes: enriched.notes,
  };
}

export function getInvoiceStatusLabel(status: InvoiceStatus | string | undefined, language: 'fr' | 'en'): string {
  const labels: Record<string, { fr: string; en: string }> = {
    [InvoiceStatus.DRAFT]: { fr: 'Brouillon', en: 'Draft' },
    [InvoiceStatus.ISSUED]: { fr: 'Émise', en: 'Issued' },
    [InvoiceStatus.PAID]: { fr: 'Payée', en: 'Paid' },
    [InvoiceStatus.CANCELLED]: { fr: 'Annulée', en: 'Cancelled' },
  };
  const entry = labels[status || InvoiceStatus.DRAFT];
  return entry ? entry[language] : String(status || '—');
}

export function isInvoiceIssuable(item: IncomeItem): boolean {
  return (
    item.amount > 0 &&
    Boolean(item.description?.trim()) &&
    item.invoiceStatus !== InvoiceStatus.PAID &&
    item.invoiceStatus !== InvoiceStatus.CANCELLED
  );
}

export function suggestClientFromIncome(item: IncomeItem): Partial<IncomeItem> {
  if (item.clientName || !item.sponsorshipContactName) return {};
  return { clientName: item.sponsorshipContactName };
}

export const DEFAULT_INVOICE_SETTINGS = (teamName: string): TeamInvoiceSettings => ({
  issuerName: teamName,
  invoicePrefix: 'FAC',
  nextInvoiceNumber: 1,
  defaultVatRate: 0,
  conventionPrefix: 'CONV',
  nextConventionNumber: 1,
  cerfaReceiptPrefix: 'RF',
  nextCerfaNumber: 1,
  isGeneralInterest: true,
});
