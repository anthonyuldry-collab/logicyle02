import { Quote, TeamInvoiceSettings, IncomeItem, IncomeCategory, InvoiceStatus } from '../types';
import { computeInvoiceAmounts, enrichIncomeWithAccounting, formatInvoiceNumber } from './invoiceUtils';
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

export function convertQuoteToInvoice(
  quote: Quote,
  settings: TeamInvoiceSettings,
  language: 'fr' | 'en' = 'fr',
  allocatedSequence?: number
): { quote: Quote; income: IncomeItem; settings: TeamInvoiceSettings } {
  if (quote.status === 'converted') {
    throw new Error('Quote already converted');
  }
  const year = new Date().getFullYear();
  const sequence = allocatedSequence ?? settings.nextInvoiceNumber ?? 1;
  const invoiceNumber = formatInvoiceNumber(settings, sequence, year);

  const income = enrichIncomeWithAccounting(
    {
      id: generateId(),
      description: quote.description,
      amount: quote.amount,
      date: new Date().toISOString().slice(0, 10),
      category: IncomeCategory.SPONSORING,
      clientName: quote.clientName,
      clientId: quote.clientId,
      invoiceNumber,
      invoiceStatus: InvoiceStatus.DRAFT,
      quoteId: quote.id,
    },
    language,
    quote.vatRate
  );

  const nextSettings =
    allocatedSequence != null
      ? settings
      : { ...settings, nextInvoiceNumber: sequence + 1 };

  return {
    quote: {
      ...quote,
      status: 'converted',
      convertedInvoiceId: income.id,
    },
    income,
    settings: nextSettings,
  };
}
