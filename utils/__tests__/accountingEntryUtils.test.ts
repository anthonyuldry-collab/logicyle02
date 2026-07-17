import { describe, it, expect } from 'vitest';
import { buildAccountingEntries, summarizeAccountingEntries } from '../accountingEntryUtils';
import { InvoiceStatus, IncomeCategory } from '../../types';

describe('accountingEntryUtils', () => {
  it('generates balanced entries for issued invoice', () => {
    const entries = buildAccountingEntries({
      incomeItems: [
        {
          id: 'inc-1',
          description: 'Sponsoring',
          amount: 1200,
          date: '2026-01-15',
          category: IncomeCategory.SPONSORING,
          invoiceStatus: InvoiceStatus.ISSUED,
          issuedAt: '2026-01-15T10:00:00Z',
          amountHT: 1000,
          vatRate: 20,
        },
      ],
      budgetItems: [],
      supplierInvoices: [],
      sepaBatches: [],
    });

    const summary = summarizeAccountingEntries(entries);
    expect(entries.length).toBeGreaterThan(0);
    expect(summary.balanced).toBe(true);
  });
});
