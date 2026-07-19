import {
  BankTransaction,
  EventBudgetItem,
  IncomeItem,
  InvoiceStatus,
  RaceEvent,
  SupplierInvoice,
} from '../types';
import { buildRaceEventMap, getBudgetItemCost, getBudgetItemDate } from './financialUtils';
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

export interface PeriodOverviewAggregate {
  cashflow: MonthlyCashflowPoint[];
  totals: { income: number; expenses: number; balance: number };
  incomeSlices: ChartSlice[];
  expenseSlices: ChartSlice[];
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

export function filterExpensesByPeriod(
  items: EventBudgetItem[],
  period: FinancialPeriod,
  raceEvents?: RaceEvent[]
): EventBudgetItem[] {
  const keys = getPeriodMonthKeys(period);
  if (!keys) return items;
  const set = new Set(keys);
  const eventMap = buildRaceEventMap(raceEvents);
  return items.filter((i) => {
    const k = parseMonthKey(getBudgetItemDate(i, raceEvents, eventMap));
    return k && set.has(k);
  });
}

export function buildMonthlyCashflow(
  incomeItems: IncomeItem[],
  budgetItems: EventBudgetItem[],
  period: FinancialPeriod,
  locale = 'fr-FR',
  raceEvents?: RaceEvent[]
): MonthlyCashflowPoint[] {
  return buildPeriodOverviewAggregate(incomeItems, budgetItems, period, locale, raceEvents).cashflow;
}

/**
 * Un seul passage revenus + dépenses → cashflow, totaux et slices.
 * Remplace 4–5 filtrages / agrégats indépendants sur l'overview.
 */
export function buildPeriodOverviewAggregate(
  incomeItems: IncomeItem[],
  budgetItems: EventBudgetItem[],
  period: FinancialPeriod,
  locale = 'fr-FR',
  raceEvents?: RaceEvent[]
): PeriodOverviewAggregate {
  const eventMap = buildRaceEventMap(raceEvents);
  let keys = getPeriodMonthKeys(period);
  if (!keys) {
    keys = buildAllMonthKeys(incomeItems, budgetItems, raceEvents, eventMap);
  }

  const keySet = new Set(keys);
  const incomeByMonth: Record<string, number> = Object.create(null);
  const expenseByMonth: Record<string, number> = Object.create(null);
  const incomeByCat: Record<string, number> = Object.create(null);
  const expenseByCat: Record<string, number> = Object.create(null);

  for (let i = 0; i < keys.length; i++) {
    incomeByMonth[keys[i]] = 0;
    expenseByMonth[keys[i]] = 0;
  }

  let incomeTotal = 0;
  let expenseTotal = 0;

  for (let i = 0; i < incomeItems.length; i++) {
    const item = incomeItems[i];
    const amount = item.amount || 0;
    if (amount === 0) continue;
    const k = parseMonthKey(item.date);
    if (!k || !keySet.has(k)) continue;
    incomeByMonth[k] += amount;
    incomeTotal += amount;
    if (amount > 0) {
      incomeByCat[item.category] = (incomeByCat[item.category] || 0) + amount;
    }
  }

  for (let i = 0; i < budgetItems.length; i++) {
    const item = budgetItems[i];
    const cost = getBudgetItemCost(item);
    if (cost <= 0) continue;
    const k = parseMonthKey(getBudgetItemDate(item, raceEvents, eventMap));
    if (!k || !keySet.has(k)) continue;
    expenseByMonth[k] += cost;
    expenseTotal += cost;
    expenseByCat[item.category] = (expenseByCat[item.category] || 0) + cost;
  }

  const cashflow = keys.map((key) => {
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

  return {
    cashflow,
    totals: {
      income: Math.round(incomeTotal * 100) / 100,
      expenses: Math.round(expenseTotal * 100) / 100,
      balance: Math.round((incomeTotal - expenseTotal) * 100) / 100,
    },
    incomeSlices: recordToSlices(incomeByCat, INCOME_COLORS),
    expenseSlices: recordToSlices(expenseByCat, EXPENSE_COLORS),
  };
}

function buildAllMonthKeys(
  incomeItems: IncomeItem[],
  budgetItems: EventBudgetItem[],
  raceEvents?: RaceEvent[],
  eventMap?: Map<string, RaceEvent>
): string[] {
  const set = new Set<string>();
  const map = eventMap ?? buildRaceEventMap(raceEvents);
  for (let i = 0; i < incomeItems.length; i++) {
    const k = parseMonthKey(incomeItems[i].date);
    if (k) set.add(k);
  }
  for (let i = 0; i < budgetItems.length; i++) {
    const k = parseMonthKey(getBudgetItemDate(budgetItems[i], raceEvents, map));
    if (k) set.add(k);
  }
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

export function buildIncomeSlices(incomeItems: IncomeItem[], period?: FinancialPeriod): ChartSlice[] {
  const filtered = period ? filterIncomeByPeriod(incomeItems, period) : incomeItems;
  const byCat: Record<string, number> = {};
  filtered.forEach((i) => {
    if (i.amount > 0) byCat[i.category] = (byCat[i.category] || 0) + i.amount;
  });
  return recordToSlices(byCat, INCOME_COLORS);
}

export function buildExpenseSlices(
  budgetItems: EventBudgetItem[],
  period?: FinancialPeriod,
  raceEvents?: RaceEvent[]
): ChartSlice[] {
  const filtered = period ? filterExpensesByPeriod(budgetItems, period, raceEvents) : budgetItems;
  const byCat: Record<string, number> = {};
  filtered.forEach((i) => {
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

  const counts: Record<string, number> = {
    [InvoiceStatus.DRAFT]: 0,
    [InvoiceStatus.ISSUED]: 0,
    [InvoiceStatus.PAID]: 0,
    [InvoiceStatus.CANCELLED]: 0,
  };
  const amounts: Record<string, number> = {
    [InvoiceStatus.DRAFT]: 0,
    [InvoiceStatus.ISSUED]: 0,
    [InvoiceStatus.PAID]: 0,
    [InvoiceStatus.CANCELLED]: 0,
  };

  for (let i = 0; i < incomeItems.length; i++) {
    const item = incomeItems[i];
    if (item.amount === 0) continue;
    const status = item.invoiceStatus || InvoiceStatus.DRAFT;
    if (!(status in counts)) continue;
    counts[status] += 1;
    amounts[status] += item.amount;
  }

  const statuses = [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.PAID, InvoiceStatus.CANCELLED];
  return statuses.map((status) => ({
    status,
    label: labels[status][language],
    count: counts[status],
    amount: Math.round(amounts[status] * 100) / 100,
    color: colors[status],
  }));
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
  const today = new Date().toISOString().slice(0, 10);

  const overdueReceivables: IncomeItem[] = [];
  const pendingReceivables: IncomeItem[] = [];

  for (let i = 0; i < incomeItems.length; i++) {
    const item = incomeItems[i];
    if (item.invoiceStatus !== InvoiceStatus.ISSUED || !(item.amount > 0)) continue;
    const due = item.dueDate || item.date;
    if (due && due.slice(0, 10) < today) {
      overdueReceivables.push(item);
    } else {
      pendingReceivables.push(item);
    }
  }

  if (overdueReceivables.length > 0) {
    const total = overdueReceivables.reduce((s, i) => s + i.amount, 0);
    alerts.push({
      id: 'overdue-receivables',
      tone: 'red',
      title: fr ? 'Factures clients en retard' : 'Overdue customer invoices',
      detail: fr
        ? `${overdueReceivables.length} facture(s) — ${total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`
        : `${overdueReceivables.length} invoice(s) — ${total.toLocaleString('en-GB', { style: 'currency', currency: 'EUR' })}`,
      tab: 'invoicing',
    });
  } else if (pendingReceivables.length > 0) {
    const total = pendingReceivables.reduce((s, i) => s + i.amount, 0);
    alerts.push({
      id: 'receivables',
      tone: 'amber',
      title: fr ? 'Créances en attente' : 'Outstanding receivables',
      detail: fr
        ? `${pendingReceivables.length} facture(s) émise(s) — ${total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`
        : `${pendingReceivables.length} issued invoice(s) — ${total.toLocaleString('en-GB', { style: 'currency', currency: 'EUR' })}`,
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

  let unreconciledCount = 0;
  for (let i = 0; i < bankTransactions.length; i++) {
    if (!bankTransactions[i].isReconciled) unreconciledCount += 1;
  }
  if (unreconciledCount > 0) {
    alerts.push({
      id: 'bank',
      tone: 'blue',
      title: fr ? 'Opérations non lettrées' : 'Unreconciled transactions',
      detail: `${unreconciledCount} opération(s)`,
      tab: 'bank',
    });
  }

  return alerts;
}

export function computePeriodTotals(
  incomeItems: IncomeItem[],
  budgetItems: EventBudgetItem[],
  period: FinancialPeriod,
  raceEvents?: RaceEvent[]
) {
  return buildPeriodOverviewAggregate(incomeItems, budgetItems, period, 'fr-FR', raceEvents).totals;
}

export function buildCumulativeBalance(points: MonthlyCashflowPoint[]): { label: string; value: number }[] {
  let cumulative = 0;
  return points.map((p) => {
    cumulative += p.balance;
    return { label: p.label, value: Math.round(cumulative * 100) / 100 };
  });
}
