import { Quote, TeamInvoiceSettings, IncomeItem, IncomeCategory, InvoiceStatus } from '../types';
import { computeInvoiceAmounts, enrichIncomeWithAccounting } from './invoiceUtils';
import { generateId } from './themeUtils';

export function getNextQuoteSequence(settings: TeamInvoiceSettings, quotes: Quote[]): number {
  const fromSettings = settings.nextQuoteNumber ?? 1;
  const fromExisting = quotes.reduce((max, q) => {
    const match = q.quoteNumber.match(/(\d+)\s*$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return Math.max(fromSettings, fromExisting + 1);
}

export function formatQuoteNumber(
  settings: TeamInvoiceSettings,
  sequence: number,
  year = new Date().getFullYear()
): string {
  const prefix = (settings.invoicePrefix || 'DEV').replace('FAC', 'DEV');
  return `${prefix.startsWith('DEV') ? prefix : 'DEV'}-${year}-${String(sequence).padStart(4, '0')}`;
}

export function enrichQuote(quote: Quote, vatRate = 20): Quote {
  const { amountHT } = computeInvoiceAmounts(quote.amount, quote.vatRate ?? vatRate);
  return { ...quote, amountHT, vatRate: quote.vatRate ?? vatRate };
}

/**
 * Convertit un devis en facture brouillon **sans** consommer de numéro définitif.
 * Le n° FAC est alloué à l’émission (`issueInvoice`).
 * P2 : `clientId` obligatoire (évite IBAN / SEPA fantômes).
 */
export function canConvertQuote(quote: Quote): boolean {
  return Boolean(quote.clientId?.trim() && quote.clientName?.trim() && quote.amount > 0);
}

export function convertQuoteToInvoice(
  quote: Quote,
  settings: TeamInvoiceSettings,
  language: 'fr' | 'en' = 'fr',
  _allocatedSequence?: number
): { quote: Quote; income: IncomeItem; settings: TeamInvoiceSettings } {
  if (quote.status === 'converted') {
    throw new Error('Quote already converted');
  }
  if (!canConvertQuote(quote)) {
    throw new Error('Cannot convert quote: clientId is required');
  }

  const income = enrichIncomeWithAccounting(
    {
      id: generateId(),
      description: quote.description,
      amount: quote.amount,
      date: new Date().toISOString().slice(0, 10),
      category: quote.category || IncomeCategory.SPONSORING,
      clientName: quote.clientName,
      clientAddress: quote.clientAddress,
      clientId: quote.clientId,
      invoiceStatus: InvoiceStatus.DRAFT,
      quoteId: quote.id,
    },
    language,
    quote.vatRate
  );

  return {
    quote: {
      ...quote,
      status: 'converted',
      convertedInvoiceId: income.id,
    },
    income,
    settings,
  };
}
