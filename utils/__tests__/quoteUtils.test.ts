import { describe, expect, it } from 'vitest';
import {
  convertQuoteToInvoice,
  enrichQuote,
  formatQuoteNumber,
  getNextQuoteSequence,
} from '../quoteUtils';
import { InvoiceStatus, type Quote, type TeamInvoiceSettings } from '../../types';

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

  it('convertit un devis en facture brouillon avec clientId', () => {
    const { quote, income, settings: next } = convertQuoteToInvoice(baseQuote, settings, 'fr');
    expect(quote.status).toBe('converted');
    expect(quote.convertedInvoiceId).toBe(income.id);
    expect(income.invoiceStatus).toBe(InvoiceStatus.DRAFT);
    expect(income.clientId).toBe('c1');
    expect(income.invoiceNumber).toMatch(/FAC-2026-/);
    expect(next.nextInvoiceNumber).toBe(13);
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
