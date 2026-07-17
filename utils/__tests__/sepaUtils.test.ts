import { describe, it, expect } from 'vitest';
import {
  normalizeIban,
  validateIban,
  validateBic,
  buildSepaPaymentOrders,
  summarizeSepaOrders,
} from '../sepaUtils';
import { BudgetItemCategory, ExpenseReceiptStatus, Rider } from '../../types';

describe('sepaUtils', () => {
  it('normalise et valide un IBAN français', () => {
    const iban = 'FR76 3000 6000 0112 3456 7890 189';
    expect(normalizeIban(iban)).toBe('FR7630006000011234567890189');
    expect(validateIban(iban)).toBe(true);
  });

  it('rejette un IBAN invalide', () => {
    expect(validateIban('FR00INVALID')).toBe(false);
    expect(validateIban('')).toBe(false);
  });

  it('valide un BIC', () => {
    expect(validateBic('BNPAFRPP')).toBe(true);
    expect(validateBic('BNPAFRPPXXX')).toBe(true);
    expect(validateBic('INVALID')).toBe(false);
  });

  it('construit des ordres de paiement salaires et remboursements', () => {
    const riders = [
      {
        id: 'r1',
        firstName: 'Jean',
        lastName: 'Dupont',
        salary: 3000,
        isActive: true,
        bankDetails: { iban: 'FR7630006000011234567890189', bic: 'BNPAFRPP' },
      } as Rider,
    ];
    const receipts = [
      {
        id: 'rec1',
        submittedByUserId: 'u1',
        submittedByName: 'Jean Dupont',
        imageUrl: 'https://example.com/r.jpg',
        status: ExpenseReceiptStatus.VALIDATED,
        budgetCategory: BudgetItemCategory.TRANSPORT,
        accountingCode: '6251',
        accountingLabel: 'Transport',
        amount: 45.5,
        receiptDate: '2026-01-15',
        createdAt: '2026-01-15T10:00:00Z',
      },
    ];

    const orders = buildSepaPaymentOrders({ riders, staff: [], receipts });
    expect(orders).toHaveLength(2);

    const summary = summarizeSepaOrders(orders);
    expect(summary.readyCount).toBe(2);
    expect(summary.totalAmount).toBe(3045.5);
  });
});
