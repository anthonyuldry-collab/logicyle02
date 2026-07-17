import { describe, it, expect } from 'vitest';
import { buildMonthlyCashflow, buildIncomeSlices, computePeriodTotals } from '../financialChartUtils';
import { IncomeCategory, InvoiceStatus } from '../../types';

describe('financialChartUtils', () => {
  const income = [
    {
      id: '1',
      description: 'Sponsor',
      amount: 5000,
      date: '2026-03-10',
      category: IncomeCategory.SPONSORING,
      invoiceStatus: InvoiceStatus.ISSUED,
    },
    {
      id: '2',
      description: 'Subvention',
      amount: 2000,
      date: '2026-01-05',
      category: IncomeCategory.SUBVENTIONS,
    },
  ];

  const expenses = [
    {
      id: 'e1',
      eventId: 'ev1',
      category: 'Transport' as any,
      description: 'Bus',
      estimatedCost: 800,
      receiptDate: '2026-03-01',
    },
  ];

  it('builds monthly cashflow for ytd', () => {
    const points = buildMonthlyCashflow(income, expenses, 'ytd', 'fr-FR');
    expect(points.length).toBeGreaterThan(0);
    const march = points.find((p) => p.key === '2026-03');
    expect(march?.income).toBe(5000);
  });

  it('builds income slices', () => {
    const slices = buildIncomeSlices(income);
    expect(slices.length).toBe(2);
    expect(slices.reduce((s, x) => s + x.value, 0)).toBe(7000);
  });

  it('computes period totals', () => {
    const totals = computePeriodTotals(income, expenses, 'ytd');
    expect(totals.income).toBe(7000);
    expect(totals.expenses).toBe(800);
  });
});
