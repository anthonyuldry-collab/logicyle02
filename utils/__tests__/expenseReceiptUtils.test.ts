import { describe, it, expect } from 'vitest';
import { parseAmountFromOcrText, parseDateFromOcrText } from '../receiptOcrUtils';
import { resolveAccountingCode } from '../../constants/accountingCodes';
import { canScanExpenseReceipts, buildBudgetItemFromReceipt } from '../expenseReceiptUtils';
import {
  BudgetItemCategory,
  ExpenseReceiptStatus,
  StaffRole,
  UserRole,
} from '../../types';

describe('receiptOcrUtils', () => {
  it('parseAmountFromOcrText finds total', () => {
    const text = 'SNCF\nTotal TTC 42,50 €\nMerci';
    expect(parseAmountFromOcrText(text)).toBe(42.5);
  });

  it('parseDateFromOcrText finds french date', () => {
    expect(parseDateFromOcrText('Date 12/04/2026')).toBe('2026-04-12');
  });
});

describe('accountingCodes', () => {
  it('maps transport to 625100', () => {
    const acc = resolveAccountingCode(BudgetItemCategory.TRANSPORT, 'fr');
    expect(acc.code).toBe('625100');
  });
});

describe('expenseReceiptUtils', () => {
  it('allows DS staff to scan', () => {
    const user = { id: 'u1', email: 'ds@test.com', userRole: UserRole.STAFF } as const;
    const staff = [{ id: 's1', email: 'ds@test.com', role: StaffRole.DS, firstName: 'A', lastName: 'B' }];
    expect(canScanExpenseReceipts(user as any, staff as any)).toBe(true);
  });

  it('buildBudgetItemFromReceipt includes accounting code', () => {
    const receipt = {
      id: 'r1',
      amount: 50,
      budgetCategory: BudgetItemCategory.TRANSPORT,
      accountingCode: '625100',
      accountingLabel: 'Frais de déplacement',
      receiptDate: '2026-04-12',
      status: ExpenseReceiptStatus.SUBMITTED,
      submittedByUserId: 'u1',
      imageUrl: 'https://example.com/r.jpg',
      createdAt: new Date().toISOString(),
    };
    const item = buildBudgetItemFromReceipt(receipt as any);
    expect(item.accountingCode).toBe('625100');
    expect(item.actualCost).toBe(50);
  });
});
