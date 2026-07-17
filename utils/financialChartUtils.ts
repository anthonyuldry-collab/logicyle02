import {
  BankTransaction,
  EventBudgetItem,
  IncomeItem,
  InvoiceStatus,
  SupplierInvoice,
} from '../types';
import { getBudgetItemCost } from './financialUtils';
import { getOverdueSupplierInvoices } from './supplierInvoiceUtils';

export type FinancialPeriod = 'ytd' | 'last12' | 'all' | string;

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

export interface MonthlyCashflowPoint {
  key: string;
  label: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface InvoicePipelineStep {
  status: string;
  label: string;
  count: number;
  amount: number;
  color: string;
}

export interface FinancialAlert {
  id: string;
  tone: 'amber' | 'red' | 'blue';
  title: string;
  detail: string;
  tab?: string;
}

const INCOME_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#047857', '#065f46'];
const EXPENSE_COLORS = ['#dc2626', '#ef4444', '#f87171', '#fb923c', '#f59e0b', '#b91c1c'];

function parseMonthKey(dateStr: string): string | null {
  if (!dateStr || dateStr.length < 7) return null;
  return dateStr.slice(0, 7);
}

function monthLabel(key: string, locale: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

export function getPeriodMonthKeys(period: FinancialPeriod): string[] | null {
  const now = new Date();
  if (period === 'all') return null;

  const keys: string[] = [];
  if (period === 'ytd') {
    const year = now.getFullYear();
    for (let m = 0; m <= now.getMonth(); m++) {
      keys.push(`${year}-${String(m + 1).padStart(2, '0')}`);
    }
    return keys;
  }

  const months = period === 'last12' ? 12 : 12;
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export function filterIncomeByPeriod(items: IncomeItem[], period: FinancialPeriod): IncomeItem[] {
  const keys = getPeriodMonthKeys(period);
  if (!keys) return items;
  const set = new Set(keys);
  return items.filter((i) => {
    const k = parseMonthKey(i.date);
    return k && set.has(k);
  });
}

export function filterExpensesByPeriod(items: EventBudgetItem[], period: FinancialPeriod): EventBudgetItem[] {
  const keys = getPeriodMonthKeys(period);
  if (!keys) return items;
  const set = new Set(keys);
  return items.filter((i) => {
    const k = parseMonthKey(i.receiptDate || '');
    return k && set.has(k);
  });
}

export function buildMonthlyCashflow(
  incomeItems: IncomeItem[],
  budgetItems: EventBudgetItem[],
  period: FinancialPeriod,
  locale = 'fr-FR'
): MonthlyCashflowPoint[] {
  let keys = getPeriodMonthKeys(period);
  if (!keys) {
    keys = buildAllMonthKeys(incomeItems, budgetItems);
  }

  const incomeByMonth: Record<string, number> = {};
  const expenseByMonth: Record<string, number> = {};
  keys.forEach((k) => {
    incomeByMonth[k] = 0;
    expenseByMonth[k] = 0;
  });

  for (const item of incomeItems) {
    const k = parseMonthKey(item.date);
    if (k && k in incomeByMonth) {
      incomeByMonth[k] += item.amount || 0;
    }
  }

  for (const item of budgetItems) {
    const cost = getBudgetItemCost(item);
    if (cost <= 0) continue;
    const k = parseMonthKey(item.receiptDate || '') || keys[keys.length - 1];
    if (k in expenseByMonth) {
      expenseByMonth[k] += cost;
    }
  }

  return keys.map((key) => {
    const income = Math.round((incomeByMonth[key] || 0) * 100) / 100;
    const expenses = Math.round((expenseByMonth[key] || 0) * 100) / 100;
    return {
      key,
      label: monthLabel(key, locale),
      income,
      expenses,
      balance: Math.round((income - expenses) * 100) / 100,
    };
  });
}

function buildAllMonthKeys(incomeItems: IncomeItem[], budgetItems: EventBudgetItem[]): string[] {
  const set = new Set<string>();
  incomeItems.forEach((i) => {
    const k = parseMonthKey(i.date);
    if (k) set.add(k);
  });
  budgetItems.forEach((b) => {
    const k = parseMonthKey(b.receiptDate || '');
    if (k) set.add(k);
  });
  if (set.size === 0) {
    const now = new Date();
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
  }
  return Array.from(set).sort();
}

export function recordToSlices(
  data: Record<string, number>,
  colors: string[],
  maxSlices = 6
): ChartSlice[] {
  const sorted = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices).reduce((s, [, v]) => s + v, 0);
  const slices: ChartSlice[] = top.map(([label, value], i) => ({
    label,
    value: Math.round(value * 100) / 100,
    color: colors[i % colors.length],
  }));
  if (rest > 0) {
    slices.push({ label: 'Autres', value: Math.round(rest * 100) / 100, color: '#94a3b8' });
  }
  return slices;
}

export function buildIncomeSlices(incomeItems: IncomeItem[]): ChartSlice[] {
  const byCat: Record<string, number> = {};
  incomeItems.forEach((i) => {
    if (i.amount > 0) byCat[i.category] = (byCat[i.category] || 0) + i.amount;
  });
  return recordToSlices(byCat, INCOME_COLORS);
}

export function buildExpenseSlices(budgetItems: EventBudgetItem[]): ChartSlice[] {
  const byCat: Record<string, number> = {};
  budgetItems.forEach((i) => {
    const cost = getBudgetItemCost(i);
    if (cost > 0) byCat[i.category] = (byCat[i.category] || 0) + cost;
  });
  return recordToSlices(byCat, EXPENSE_COLORS);
}

export function buildInvoicePipeline(incomeItems: IncomeItem[], language: 'fr' | 'en'): InvoicePipelineStep[] {
  const labels: Record<string, { fr: string; en: string }> = {
    [InvoiceStatus.DRAFT]: { fr: 'Brouillon', en: 'Draft' },
    [InvoiceStatus.ISSUED]: { fr: 'Émise', en: 'Issued' },
    [InvoiceStatus.PAID]: { fr: 'Payée', en: 'Paid' },
    [InvoiceStatus.CANCELLED]: { fr: 'Annulée', en: 'Cancelled' },
  };
  const colors: Record<string, string> = {
    [InvoiceStatus.DRAFT]: '#94a3b8',
    [InvoiceStatus.ISSUED]: '#3b82f6',
    [InvoiceStatus.PAID]: '#10b981',
    [InvoiceStatus.CANCELLED]: '#ef4444',
  };

  const statuses = [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.PAID, InvoiceStatus.CANCELLED];
  return statuses.map((status) => {
    const items = incomeItems.filter(
      (i) => (i.invoiceStatus || InvoiceStatus.DRAFT) === status && i.invoiceNumber
    );
    return {
      status,
      label: labels[status][language],
      count: items.length,
      amount: items.reduce((s, i) => s + i.amount, 0),
      color: colors[status],
    };
  });
}

export function buildFinancialAlerts(params: {
  incomeItems: IncomeItem[];
  supplierInvoices: SupplierInvoice[];
  bankTransactions: BankTransaction[];
  language: 'fr' | 'en';
}): FinancialAlert[] {
  const { incomeItems, supplierInvoices, bankTransactions, language } = params;
  const alerts: FinancialAlert[] = [];
  const fr = language === 'fr';

  const overdueReceivables = incomeItems.filter((i) => i.invoiceStatus === InvoiceStatus.ISSUED);
  if (overdueReceivables.length > 0) {
    const total = overdueReceivables.reduce((s, i) => s + i.amount, 0);
    alerts.push({
      id: 'receivables',
      tone: 'amber',
      title: fr ? 'Créances en attente' : 'Outstanding receivables',
      detail: fr
        ? `${overdueReceivables.length} facture(s) émise(s) — ${total.toLocaleString('fr-FR')} €`
        : `${overdueReceivables.length} issued invoice(s) — €${total.toLocaleString('en-GB')}`,
      tab: 'invoicing',
    });
  }

  const overdueSuppliers = getOverdueSupplierInvoices(supplierInvoices);
  if (overdueSuppliers.length > 0) {
    alerts.push({
      id: 'suppliers',
      tone: 'red',
      title: fr ? 'Factures fournisseurs en retard' : 'Overdue supplier invoices',
      detail: `${overdueSuppliers.length} facture(s)`,
      tab: 'suppliers',
    });
  }

  const unreconciled = bankTransactions.filter((t) => !t.isReconciled);
  if (unreconciled.length > 0) {
    alerts.push({
      id: 'bank',
      tone: 'blue',
      title: fr ? 'Opérations non lettrées' : 'Unreconciled transactions',
      detail: `${unreconciled.length} opération(s)`,
      tab: 'bank',
    });
  }

  return alerts;
}

export function computePeriodTotals(
  incomeItems: IncomeItem[],
  budgetItems: EventBudgetItem[],
  period: FinancialPeriod
) {
  const keys = getPeriodMonthKeys(period);
  const keySet = keys ? new Set(keys) : null;

  const income = incomeItems
    .filter((i) => {
      if (!keySet) return true;
      const k = parseMonthKey(i.date);
      return k && keySet.has(k);
    })
    .reduce((s, i) => s + (i.amount || 0), 0);

  const expenses = budgetItems
    .filter((i) => {
      if (!keySet) return true;
      const k = parseMonthKey(i.receiptDate || '');
      return k && keySet.has(k);
    })
    .reduce((s, i) => s + getBudgetItemCost(i), 0);

  return {
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    balance: Math.round((income - expenses) * 100) / 100,
  };
}

export function buildCumulativeBalance(points: MonthlyCashflowPoint[]): { label: string; value: number }[] {
  let cumulative = 0;
  return points.map((p) => {
    cumulative += p.balance;
    return { label: p.label, value: Math.round(cumulative * 100) / 100 };
  });
}
