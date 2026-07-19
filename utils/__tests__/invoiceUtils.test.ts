import { describe, it, expect } from 'vitest';
import {
  enrichIncomeWithAccounting,
  formatInvoiceNumber,
  issueInvoice,
  computeInvoiceAmounts,
  computeDueDate,
  isInvoiceOverdue,
  updateInvoiceFields,
  isInvoiceLocked,
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

  it('computes due date from payment terms', () => {
    expect(computeDueDate('2026-03-01', 30)).toBe('2026-03-31');
    expect(computeDueDate('2026-01-15', 0)).toBe('2026-01-15');
  });

  it('issues invoice with sequential number and due date', () => {
    const settings = { issuerName: 'Team Test', invoicePrefix: 'FAC', nextInvoiceNumber: 5 };
    const item = {
      id: 'i1',
      description: 'Subvention',
      amount: 5000,
      date: '2026-06-01',
      category: IncomeCategory.SUBVENTIONS,
      paymentTermsDays: 45,
    };
    const { item: issued, settings: updated } = issueInvoice(item, settings);
    expect(issued.invoiceNumber).toBe('FAC-2026-0005');
    expect(issued.invoiceStatus).toBe(InvoiceStatus.ISSUED);
    expect(issued.accountingCode).toBe('740000');
    expect(issued.dueDate).toBe('2026-07-16');
    expect(updated.nextInvoiceNumber).toBe(6);
  });

  it('detects overdue invoices', () => {
    const overdue = {
      id: 'i1',
      description: 'Late',
      amount: 100,
      date: '2026-01-01',
      category: IncomeCategory.SPONSORING,
      invoiceStatus: InvoiceStatus.ISSUED,
      dueDate: '2026-02-01',
    };
    expect(isInvoiceOverdue(overdue, '2026-03-01')).toBe(true);
    expect(isInvoiceOverdue({ ...overdue, invoiceStatus: InvoiceStatus.PAID }, '2026-03-01')).toBe(
      false
    );
  });

  it('updates invoice fields without losing lifecycle data', () => {
    const item = {
      id: 'i1',
      description: 'Old',
      amount: 1000,
      date: '2026-04-01',
      category: IncomeCategory.SPONSORING,
      invoiceNumber: 'FAC-2026-0001',
      invoiceStatus: InvoiceStatus.ISSUED,
      issuedAt: '2026-04-01T10:00:00.000Z',
      vatRate: 20,
    };
    const updated = updateInvoiceFields(item, {
      description: 'Corrected',
      amount: 1200,
      clientName: 'ACME',
      vatRate: 20,
    });
    expect(updated.description).toBe('Corrected');
    expect(updated.amount).toBe(1200);
    expect(updated.invoiceNumber).toBe('FAC-2026-0001');
    expect(updated.invoiceStatus).toBe(InvoiceStatus.ISSUED);
    expect(updated.issuedAt).toBe('2026-04-01T10:00:00.000Z');
    expect(updated.amountHT).toBe(1000);
    expect(updated.clientName).toBe('ACME');
  });

  it('locks paid invoices from edits', () => {
    const paid = {
      id: 'i1',
      description: 'Paid',
      amount: 100,
      date: '2026-01-01',
      category: IncomeCategory.SPONSORING,
      invoiceStatus: InvoiceStatus.PAID,
    };
    expect(isInvoiceLocked(paid)).toBe(true);
    expect(() => updateInvoiceFields(paid, { amount: 200 })).toThrow();
  });

  it('formats invoice number', () => {
    expect(formatInvoiceNumber({ issuerName: 'T' }, 12, 2026)).toBe('FAC-2026-0012');
    expect(formatInvoiceNumber({ issuerName: 'T', invoicePrefix: 'INV' }, 3, 2025)).toBe(
      'INV-2025-0003'
    );
  });
});
