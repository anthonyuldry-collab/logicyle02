import { describe, expect, it } from 'vitest';
import {
  convertQuoteToInvoice,
  canConvertQuote,
  enrichQuote,
  formatQuoteNumber,
  getNextQuoteSequence,
} from '../quoteUtils';
import { IncomeCategory, InvoiceStatus, type Quote, type TeamInvoiceSettings } from '../../types';

const settings: TeamInvoiceSettings = {
  issuerName: 'Team Test',
  invoicePrefix: 'FAC',
  nextInvoiceNumber: 12,
  nextQuoteNumber: 3,
  defaultVatRate: 20,
};

const baseQuote: Quote = {
  id: 'q1',
  quoteNumber: 'DEV-2026-0003',
  clientId: 'c1',
  clientName: 'Sponsor SA',
  description: 'Partenariat saison',
  amount: 12000,
  vatRate: 20,
  amountHT: 10000,
  category: IncomeCategory.SUBVENTIONS,
  status: 'accepted',
  validUntil: '2026-12-31',
  createdAt: '2026-07-01',
};

describe('quoteUtils', () => {
  it('calcule le prochain numéro de devis sans doublon', () => {
    expect(getNextQuoteSequence(settings, [])).toBe(3);
    expect(
      getNextQuoteSequence(settings, [{ ...baseQuote, quoteNumber: 'DEV-2026-0008' }])
    ).toBe(9);
  });

  it('formate un numéro de devis distinct des factures', () => {
    expect(formatQuoteNumber(settings, 4)).toBe('DEV-2026-0004');
  });

  it('convertit un devis en brouillon sans numéro FAC ni bump de séquence', () => {
    const { quote, income, settings: next } = convertQuoteToInvoice(baseQuote, settings, 'fr');
    expect(quote.status).toBe('converted');
    expect(quote.convertedInvoiceId).toBe(income.id);
    expect(income.invoiceStatus).toBe(InvoiceStatus.DRAFT);
    expect(income.invoiceNumber).toBeUndefined();
    expect(income.clientId).toBe('c1');
    expect(income.category).toBe(IncomeCategory.SUBVENTIONS);
    expect(next.nextInvoiceNumber).toBe(12);
  });

  it('refuse la conversion sans clientId (P2)', () => {
    expect(canConvertQuote({ ...baseQuote, clientId: undefined })).toBe(false);
    expect(() =>
      convertQuoteToInvoice({ ...baseQuote, clientId: undefined }, settings)
    ).toThrow(/clientId/);
  });

  it('refuse la double conversion', () => {
    expect(() =>
      convertQuoteToInvoice({ ...baseQuote, status: 'converted' }, settings)
    ).toThrow();
  });

  it('recalcule le HT à la sauvegarde', () => {
    const enriched = enrichQuote({ ...baseQuote, amount: 120, vatRate: 20 });
    expect(enriched.amountHT).toBe(100);
  });
});
