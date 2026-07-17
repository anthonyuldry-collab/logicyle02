import { describe, it, expect } from 'vitest';
import {
  getBudgetItemCost,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateFinancialBalance,
  groupIncomeByCategory,
  isSponsorshipIncome,
  hasContractDates,
  getEventNameById,
} from '../financialUtils';
import { BudgetItemCategory, IncomeCategory, EventBudgetItem, IncomeItem, RaceEvent } from '../../types';

describe('financialUtils', () => {
  const incomeItems: IncomeItem[] = [
    {
      id: '1',
      description: 'Sponsor A',
      amount: 10000,
      date: '2026-01-15',
      category: IncomeCategory.SPONSORING,
    },
    {
      id: '2',
      description: 'Don',
      amount: 500,
      date: '2026-02-01',
      category: IncomeCategory.DONS,
    },
  ];

  const budgetItems: EventBudgetItem[] = [
    {
      id: 'b1',
      category: BudgetItemCategory.HEBERGEMENT,
      description: 'Hotel',
      estimatedCost: 800,
      actualCost: 950,
      eventId: 'ev1',
    },
    {
      id: 'b2',
      category: BudgetItemCategory.FRAIS_DIVERS,
      description: 'Frais',
      estimatedCost: 200,
      eventId: 'ev1',
    },
  ];

  it('getBudgetItemCost prefers actual when > 0', () => {
    expect(getBudgetItemCost(budgetItems[0])).toBe(950);
    expect(getBudgetItemCost(budgetItems[1])).toBe(200);
  });

  it('calculateTotalIncome sums valid amounts', () => {
    expect(calculateTotalIncome(incomeItems)).toBe(10500);
  });

  it('calculateTotalExpenses uses effective costs', () => {
    expect(calculateTotalExpenses(budgetItems)).toBe(1150);
  });

  it('calculateFinancialBalance', () => {
    expect(calculateFinancialBalance(incomeItems, budgetItems)).toBe(9350);
  });

  it('groupIncomeByCategory', () => {
    const grouped = groupIncomeByCategory(incomeItems);
    expect(grouped[IncomeCategory.SPONSORING]).toBe(10000);
    expect(grouped[IncomeCategory.DONS]).toBe(500);
  });

  it('isSponsorshipIncome', () => {
    expect(isSponsorshipIncome(incomeItems[0])).toBe(true);
    expect(isSponsorshipIncome(incomeItems[1])).toBe(false);
  });

  it('hasContractDates', () => {
    expect(hasContractDates(incomeItems[0])).toBe(false);
    expect(
      hasContractDates({ ...incomeItems[0], sponsorshipContractStart: '2026-01-01' })
    ).toBe(true);
  });

  it('getEventNameById resolves event name', () => {
    const events: RaceEvent[] = [
      { id: 'ev1', name: 'Paris-Roubaix', date: '2026-04-12' } as RaceEvent,
    ];
    expect(getEventNameById(events, 'ev1')).toBe('Paris-Roubaix');
    expect(getEventNameById(events, 'unknown')).toBe('unknown');
    expect(getEventNameById(undefined, undefined)).toBe('');
  });
});
