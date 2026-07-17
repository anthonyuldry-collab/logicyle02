import { describe, it, expect } from 'vitest';
import {
  enrichIncomeWithAccounting,
  formatInvoiceNumber,
  issueInvoice,
  computeInvoiceAmounts,
} from '../invoiceUtils';
import { IncomeCategory, InvoiceStatus } from '../../types';

describe('invoiceUtils', () => {
  it('assigns accounting code from income category', () => {
    const enriched = enrichIncomeWithAccounting({
      id: 'i1',
      description: 'Sponsor X',
      amount: 10000,
      date: '2026-03-01',
      category: IncomeCategory.SPONSORING,
    });
    expect(enriched.accountingCode).toBe('706100');
    expect(enriched.accountingJournal).toBe('VE');
    expect(enriched.invoiceStatus).toBe(InvoiceStatus.DRAFT);
  });

  it('computes HT/TTC amounts with VAT', () => {
    const withVat = computeInvoiceAmounts(120, 20);
    expect(withVat.amountHT).toBe(100);
    expect(withVat.vatAmount).toBe(20);
  });

  it('issues invoice with sequential number', () => {
    const settings = { issuerName: 'Team Test', invoicePrefix: 'FAC', nextInvoiceNumber: 5 };
    const item = {
      id: 'i1',
      description: 'Subvention',
      amount: 5000,
      date: '2026-06-01',
      category: IncomeCategory.SUBVENTIONS,
    };
    const { item: issued, settings: updated } = issueInvoice(item, settings);
    expect(issued.invoiceNumber).toBe('FAC-2026-0005');
    expect(issued.invoiceStatus).toBe(InvoiceStatus.ISSUED);
    expect(issued.accountingCode).toBe('740000');
    expect(updated.nextInvoiceNumber).toBe(6);
  });

  it('formats invoice number', () => {
    expect(formatInvoiceNumber({ issuerName: 'T' }, 12, 2026)).toBe('FAC-2026-0012');
    expect(formatInvoiceNumber({ issuerName: 'T', invoicePrefix: 'INV' }, 3, 2025)).toBe('INV-2025-0003');
  });
});
