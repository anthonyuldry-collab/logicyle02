import { resolveAccountingCode, resolveIncomeAccountingCode } from '../constants/accountingCodes';
import {
  AccountingEntry,
  BankTransaction,
  EventBudgetItem,
  ExpenseReceipt,
  ExpenseReceiptStatus,
  IncomeItem,
  InvoiceStatus,
  SepaBatch,
  SupplierInvoice,
} from '../types';
import { getBudgetItemCost } from './financialUtils';

function entryId(): string {
  return `ae-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Génère les écritures comptables en partie double depuis les données métier. */
export function buildAccountingEntries(params: {
  incomeItems: IncomeItem[];
  budgetItems: EventBudgetItem[];
  supplierInvoices: SupplierInvoice[];
  sepaBatches: SepaBatch[];
  language?: 'fr' | 'en';
}): AccountingEntry[] {
  const { incomeItems, budgetItems, supplierInvoices, sepaBatches, language = 'fr' } = params;
  const entries: AccountingEntry[] = [];

  for (const income of incomeItems) {
    if (
      income.invoiceStatus !== InvoiceStatus.ISSUED &&
      income.invoiceStatus !== InvoiceStatus.PAID
    ) {
      continue;
    }
    const accounting = resolveIncomeAccountingCode(income.category, language);
    const ht = income.amountHT ?? income.amount;
    const vat = Math.round((income.amount - ht) * 100) / 100;
    const piece = income.invoiceNumber || income.id;

    entries.push({
      id: entryId(),
      date: income.issuedAt || income.date,
      journal: accounting.journal,
      accountCode: '411000',
      accountLabel: 'Clients',
      pieceRef: piece,
      label: income.description,
      debit: income.amount,
      credit: 0,
      sourceType: 'income',
      sourceId: income.id,
    });
    entries.push({
      id: entryId(),
      date: income.issuedAt || income.date,
      journal: accounting.journal,
      accountCode: accounting.code,
      accountLabel: accounting.label,
      pieceRef: piece,
      label: income.description,
      debit: 0,
      credit: ht,
      sourceType: 'income',
      sourceId: income.id,
    });
    if (vat > 0) {
      entries.push({
        id: entryId(),
        date: income.issuedAt || income.date,
        journal: accounting.journal,
        accountCode: '445710',
        accountLabel: 'TVA collectée',
        pieceRef: piece,
        label: `TVA ${income.description}`,
        debit: 0,
        credit: vat,
        sourceType: 'income',
        sourceId: income.id,
      });
    }
    if (income.invoiceStatus === InvoiceStatus.PAID && income.paidAt) {
      entries.push({
        id: entryId(),
        date: income.paidAt,
        journal: 'BQ',
        accountCode: '512000',
        accountLabel: 'Banque',
        pieceRef: piece,
        label: `Encaissement ${income.clientName || income.description}`,
        debit: income.amount,
        credit: 0,
        sourceType: 'income',
        sourceId: income.id,
      });
      entries.push({
        id: entryId(),
        date: income.paidAt,
        journal: 'BQ',
        accountCode: '411000',
        accountLabel: 'Clients',
        pieceRef: piece,
        label: `Encaissement ${income.clientName || income.description}`,
        debit: 0,
        credit: income.amount,
        sourceType: 'income',
        sourceId: income.id,
      });
    }
  }

  for (const expense of budgetItems) {
    const cost = getBudgetItemCost(expense);
    if (cost <= 0) continue;
    const accounting = expense.accountingCode
      ? { code: expense.accountingCode, label: expense.accountingLabel || '', journal: 'OD' }
      : resolveAccountingCode(expense.category, language);

    entries.push({
      id: entryId(),
      date: expense.receiptDate || new Date().toISOString().slice(0, 10),
      journal: accounting.journal,
      accountCode: accounting.code,
      accountLabel: accounting.label,
      pieceRef: expense.id,
      label: expense.description,
      debit: cost,
      credit: 0,
      sourceType: 'expense',
      sourceId: expense.id,
    });
    entries.push({
      id: entryId(),
      date: expense.receiptDate || new Date().toISOString().slice(0, 10),
      journal: accounting.journal,
      accountCode: '401000',
      accountLabel: 'Fournisseurs',
      pieceRef: expense.id,
      label: expense.description,
      debit: 0,
      credit: cost,
      sourceType: 'expense',
      sourceId: expense.id,
    });
  }

  for (const supplier of supplierInvoices) {
    if (supplier.status === 'received') continue;
    const piece = supplier.invoiceNumber;
    entries.push({
      id: entryId(),
      date: supplier.invoiceDate,
      journal: 'AC',
      accountCode: supplier.accountingCode || '606800',
      accountLabel: supplier.accountingLabel || 'Achats',
      pieceRef: piece,
      label: supplier.supplierName,
      debit: supplier.amountHT,
      credit: 0,
      sourceType: 'supplier',
      sourceId: supplier.id,
    });
    const vat = Math.round((supplier.amountTTC - supplier.amountHT) * 100) / 100;
    if (vat > 0) {
      entries.push({
        id: entryId(),
        date: supplier.invoiceDate,
        journal: 'AC',
        accountCode: '445660',
        accountLabel: 'TVA déductible',
        pieceRef: piece,
        label: `TVA ${supplier.supplierName}`,
        debit: vat,
        credit: 0,
        sourceType: 'supplier',
        sourceId: supplier.id,
      });
    }
    entries.push({
      id: entryId(),
      date: supplier.invoiceDate,
      journal: 'AC',
      accountCode: '401000',
      accountLabel: 'Fournisseurs',
      pieceRef: piece,
      label: supplier.supplierName,
      debit: 0,
      credit: supplier.amountTTC,
      sourceType: 'supplier',
      sourceId: supplier.id,
    });
    if (supplier.status === 'paid' && supplier.paidAt) {
      entries.push({
        id: entryId(),
        date: supplier.paidAt,
        journal: 'BQ',
        accountCode: '401000',
        accountLabel: 'Fournisseurs',
        pieceRef: piece,
        label: `Paiement ${supplier.supplierName}`,
        debit: supplier.amountTTC,
        credit: 0,
        sourceType: 'supplier',
        sourceId: supplier.id,
      });
      entries.push({
        id: entryId(),
        date: supplier.paidAt,
        journal: 'BQ',
        accountCode: '512000',
        accountLabel: 'Banque',
        pieceRef: piece,
        label: `Paiement ${supplier.supplierName}`,
        debit: 0,
        credit: supplier.amountTTC,
        sourceType: 'supplier',
        sourceId: supplier.id,
      });
    }
  }

  for (const batch of sepaBatches) {
    entries.push({
      id: entryId(),
      date: batch.executionDate,
      journal: 'BQ',
      accountCode: '421000',
      accountLabel: 'Personnel — rémunérations',
      pieceRef: batch.batchReference,
      label: `Lot SEPA ${batch.batchReference}`,
      debit: batch.totalAmount,
      credit: 0,
      sourceType: 'sepa',
      sourceId: batch.id,
    });
    entries.push({
      id: entryId(),
      date: batch.executionDate,
      journal: 'BQ',
      accountCode: '512000',
      accountLabel: 'Banque',
      pieceRef: batch.batchReference,
      label: `Lot SEPA ${batch.batchReference}`,
      debit: 0,
      credit: batch.totalAmount,
      sourceType: 'sepa',
      sourceId: batch.id,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function summarizeAccountingEntries(entries: AccountingEntry[]) {
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const byJournal = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.journal] = (acc[e.journal] || 0) + 1;
    return acc;
  }, {});
  return {
    count: entries.length,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    byJournal,
  };
}

export function enrichBudgetWithAccounting(
  item: EventBudgetItem,
  language: 'fr' | 'en' = 'fr'
): EventBudgetItem {
  if (item.accountingCode) return item;
  const accounting = resolveAccountingCode(item.category, language);
  return {
    ...item,
    accountingCode: accounting.code,
    accountingLabel: accounting.label,
  };
}

export function enrichReceiptValidatedExpense(
  receipt: ExpenseReceipt,
  budgetItems: EventBudgetItem[]
): EventBudgetItem | null {
  const linked = budgetItems.find((b) => b.expenseReceiptId === receipt.id || b.proofDocumentId === receipt.id);
  if (linked) return linked;
  if (receipt.status !== ExpenseReceiptStatus.VALIDATED) return null;
  return null;
}

export function matchBankTransaction(
  transaction: BankTransaction,
  incomeItems: IncomeItem[],
  supplierInvoices: SupplierInvoice[],
  sepaBatches: SepaBatch[]
): Partial<BankTransaction> {
  if (transaction.isReconciled) return {};

  const amount = Math.abs(transaction.amount);

  if (transaction.type === 'credit') {
    const match = incomeItems.find(
      (i) =>
        (i.invoiceStatus === InvoiceStatus.ISSUED || i.invoiceStatus === InvoiceStatus.PAID) &&
        Math.abs(i.amount - amount) < 0.01 &&
        !i.paidAt
    );
    if (match) return { matchedIncomeItemId: match.id, isReconciled: true };
  }

  if (transaction.type === 'debit') {
    const supplier = supplierInvoices.find(
      (s) => s.status === 'validated' && Math.abs(s.amountTTC - amount) < 0.01
    );
    if (supplier) return { matchedSupplierInvoiceId: supplier.id, isReconciled: true };

    const sepa = sepaBatches.find((b) => Math.abs(b.totalAmount - amount) < 0.01);
    if (sepa) return { matchedSepaBatchId: sepa.id, isReconciled: true };
  }

  return {};
}
