import { describe, expect, it } from 'vitest';
import { resolveDocumentSequence } from '../invoiceSequenceUtils';
import { createCreditNote, issueInvoice } from '../invoiceUtils';
import { convertQuoteToInvoice } from '../quoteUtils';
import { IncomeCategory, InvoiceStatus, type Quote, type TeamInvoiceSettings } from '../../types';

describe('resolveDocumentSequence', () => {
  it('returns floor of valid numbers and defaults otherwise', () => {
    expect(resolveDocumentSequence(5)).toBe(5);
    expect(resolveDocumentSequence(5.9)).toBe(5);
    expect(resolveDocumentSequence(0)).toBe(1);
    expect(resolveDocumentSequence(-1)).toBe(1);
    expect(resolveDocumentSequence(undefined)).toBe(1);
    expect(resolveDocumentSequence('3')).toBe(1);
  });

  it('simulates concurrent allocates as distinct sequences', () => {
    let counter = 5;
    const allocate = () => {
      const sequence = resolveDocumentSequence(counter);
      counter = sequence + 1;
      return sequence;
    };
    expect(allocate()).toBe(5);
    expect(allocate()).toBe(6);
    expect(counter).toBe(7);
  });
});

describe('issueInvoice with allocatedSequence', () => {
  const settings: TeamInvoiceSettings = {
    issuerName: 'Team Test',
    invoicePrefix: 'FAC',
    nextInvoiceNumber: 99,
  };
  const item = {
    id: 'i1',
    description: 'Subvention',
    amount: 5000,
    date: '2026-06-01',
    category: IncomeCategory.SUBVENTIONS,
    paymentTermsDays: 45,
  };

  it('uses pre-allocated sequence without bumping settings again', () => {
    const allocatedSettings = { ...settings, nextInvoiceNumber: 8 };
    const { item: issued, settings: updated } = issueInvoice(
      item,
      allocatedSettings,
      'fr',
      7,
    );
    expect(issued.invoiceNumber).toBe('FAC-2026-0007');
    expect(updated.nextInvoiceNumber).toBe(8);
  });

  it('keeps legacy bump when no allocation is provided', () => {
    const { item: issued, settings: updated } = issueInvoice(item, settings);
    expect(issued.invoiceNumber).toBe('FAC-2026-0099');
    expect(updated.nextInvoiceNumber).toBe(100);
  });
});

describe('createCreditNote with allocatedSequence', () => {
  it('does not double-increment after allocation', () => {
    const original = {
      id: 'i1',
      description: 'Facture',
      amount: 100,
      date: '2026-01-01',
      category: IncomeCategory.SPONSORING,
      invoiceStatus: InvoiceStatus.ISSUED,
      invoiceNumber: 'FAC-2026-0001',
    };
    const settings: TeamInvoiceSettings = {
      issuerName: 'T',
      invoicePrefix: 'FAC',
      nextInvoiceNumber: 10,
    };
    const { item: credit, settings: next } = createCreditNote(
      original,
      settings,
      'fr',
      9,
    );
    expect(credit.invoiceNumber).toBe('FAC-AV-2026-0009');
    expect(next.nextInvoiceNumber).toBe(10);
  });
});

describe('convertQuoteToInvoice with allocatedSequence', () => {
  it('consumes allocated invoice sequence without re-bump', () => {
    const quote: Quote = {
      id: 'q1',
      quoteNumber: 'DEV-2026-0003',
      clientId: 'c1',
      clientName: 'Sponsor SA',
      description: 'Partenariat',
      amount: 12000,
      vatRate: 20,
      amountHT: 10000,
      status: 'accepted',
      validUntil: '2026-12-31',
      createdAt: '2026-07-01',
    };
    const settings: TeamInvoiceSettings = {
      issuerName: 'Team Test',
      invoicePrefix: 'FAC',
      nextInvoiceNumber: 20,
    };
    const { income, settings: next } = convertQuoteToInvoice(quote, settings, 'fr', 12);
    expect(income.invoiceNumber).toBe('FAC-2026-0012');
    expect(next.nextInvoiceNumber).toBe(20);
  });
});
