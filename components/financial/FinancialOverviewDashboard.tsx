import React, { useMemo } from 'react';
import {
  BankTransaction,
  EventBudgetItem,
  IncomeItem,
  SupplierInvoice,
} from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import { formatFinancialAmount } from '../../utils/financialUtils';
import {
  buildCumulativeBalance,
  buildExpenseSlices,
  buildFinancialAlerts,
  buildIncomeSlices,
  buildInvoicePipeline,
  buildMonthlyCashflow,
  computePeriodTotals,
  FinancialPeriod,
} from '../../utils/financialChartUtils';
import {
  BalanceLineChart,
  CashflowBarChart,
  ChartCard,
  DonutChart,
  KpiSparkline,
  PipelineBar,
} from './FinancialChartPrimitives';
import { calculatePayrollSummary, PayrollContext } from '../../utils/contractUtils';
import { Rider, StaffMember } from '../../types';

interface FinancialOverviewDashboardProps {
  incomeItems: IncomeItem[];
  budgetItems: EventBudgetItem[];
  supplierInvoices: SupplierInvoice[];
  bankTransactions: BankTransaction[];
  riders: Rider[];
  staff: StaffMember[];
  payrollContext?: PayrollContext;
  period: FinancialPeriod;
  onPeriodChange: (p: FinancialPeriod) => void;
  onNavigateTab?: (tab: string) => void;
  canEdit: boolean;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const FinancialOverviewDashboard: React.FC<FinancialOverviewDashboardProps> = ({
  incomeItems,
  budgetItems,
  supplierInvoices,
  bankTransactions,
  riders,
  staff,
  payrollContext,
  period,
  onPeriodChange,
  onNavigateTab,
  canEdit,
  onAddIncome,
  onAddExpense,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';

  const cashflow = useMemo(
    () => buildMonthlyCashflow(incomeItems, budgetItems, period, locale),
    [incomeItems, budgetItems, period, locale]
  );

  const totals = useMemo(
    () => computePeriodTotals(incomeItems, budgetItems, period),
    [incomeItems, budgetItems, period]
  );

  const incomeSlices = useMemo(() => buildIncomeSlices(incomeItems), [incomeItems]);
  const expenseSlices = useMemo(() => buildExpenseSlices(budgetItems), [budgetItems]);
  const cumulative = useMemo(() => buildCumulativeBalance(cashflow), [cashflow]);
  const pipeline = useMemo(
    () => buildInvoicePipeline(incomeItems, language),
    [incomeItems, language]
  );
  const alerts = useMemo(
    () =>
      buildFinancialAlerts({
        incomeItems,
        supplierInvoices,
        bankTransactions,
        language,
      }),
    [incomeItems, supplierInvoices, bankTransactions, language]
  );

  const payrollSummary = useMemo(
    () => calculatePayrollSummary(riders, staff, payrollContext),
    [riders, staff, payrollContext]
  );

  const incomeSpark = cashflow.map((p) => p.income);
  const expenseSpark = cashflow.map((p) => p.expenses);

  const periodOptions: { id: FinancialPeriod; label: string }[] = [
    { id: 'ytd', label: t('financialPeriodYtd') },
    { id: 'last12', label: t('financialPeriod12m') },
    { id: 'all', label: t('financialPeriodAll') },
  ];

  return (
    <div className="space-y-6">
      {/* Barre période + actions rapides */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPeriodChange(opt.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === opt.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {onAddIncome && (
              <button
                type="button"
                onClick={onAddIncome}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                + {t('financialAddIncome')}
              </button>
            )}
            {onAddExpense && (
              <button
                type="button"
                onClick={onAddExpense}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                + {t('financialAddExpense')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label={t('financialTotalIncome')}
          value={formatFinancialAmount(totals.income, locale)}
          tone="green"
          spark={incomeSpark}
          sparkColor="#10b981"
        />
        <KpiCard
          label={t('financialTotalExpenses')}
          value={formatFinancialAmount(totals.expenses, locale)}
          tone="red"
          spark={expenseSpark}
          sparkColor="#ef4444"
        />
        <KpiCard
          label={t('financialBalance')}
          value={formatFinancialAmount(totals.balance, locale)}
          tone={totals.balance >= 0 ? 'blue' : 'red'}
        />
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => alert.tab && onNavigateTab?.(alert.tab)}
              className={`text-left rounded-lg border p-3 transition-colors hover:shadow-md ${
                alert.tone === 'red'
                  ? 'border-red-200 bg-red-50 hover:bg-red-100'
                  : alert.tone === 'amber'
                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                    : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{alert.title}</p>
              <p className="text-xs text-gray-600 mt-0.5">{alert.detail}</p>
            </button>
          ))}
        </div>
      )}

      {/* Graphique principal trésorerie */}
      <ChartCard title={t('financialChartCashflow')} subtitle={t('financialChartCashflowDesc')}>
        <CashflowBarChart points={cashflow} height={220} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('financialChartIncomeBreakdown')}>
          <DonutChart
            slices={incomeSlices}
            centerLabel={t('financialTotalIncome')}
            centerValue={formatFinancialAmount(totals.income, locale)}
          />
        </ChartCard>
        <ChartCard title={t('financialChartExpenseBreakdown')}>
          <DonutChart
            slices={expenseSlices}
            centerLabel={t('financialTotalExpenses')}
            centerValue={formatFinancialAmount(totals.expenses, locale)}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('financialChartCumulative')} subtitle={t('financialChartCumulativeDesc')}>
          <BalanceLineChart points={cumulative} />
        </ChartCard>
        <ChartCard title={t('financialChartInvoicePipeline')}>
          <PipelineBar steps={pipeline} formatAmount={(n) => formatFinancialAmount(n, locale)} />
        </ChartCard>
      </div>

      {payrollSummary.monthlyTotal > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-indigo-900">{t('financialPayrollOverview')}</h3>
            <button
              type="button"
              onClick={() => onNavigateTab?.('payroll')}
              className="text-xs text-indigo-600 hover:underline"
            >
              {t('financialViewDetails')}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniStat label={t('financialPayrollMonthlyTotal')} value={formatFinancialAmount(payrollSummary.monthlyTotal, locale)} />
            <MiniStat label={t('financialPayrollAnnualForecast')} value={formatFinancialAmount(payrollSummary.annualForecast, locale)} />
            <MiniStat label={t('financialPayrollActiveRiders')} value={String(payrollSummary.activeRiderCount)} />
            <MiniStat label={t('financialPayrollExpiring')} value={String(payrollSummary.expiringWithin90Days)} warn={payrollSummary.expiringWithin90Days > 0} />
          </div>
        </div>
      )}
    </div>
  );
};

function KpiCard({
  label,
  value,
  tone,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  tone: 'green' | 'red' | 'blue';
  spark?: number[];
  sparkColor?: string;
}) {
  const tones = {
    green: 'from-emerald-50 to-white border-emerald-100',
    red: 'from-red-50 to-white border-red-100',
    blue: 'from-blue-50 to-white border-blue-100',
  };
  const valueColors = {
    green: 'text-emerald-700',
    red: 'text-red-700',
    blue: 'text-blue-700',
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${valueColors[tone]}`}>{value}</p>
        </div>
        {spark && spark.some((v) => v > 0) && <KpiSparkline values={spark} color={sparkColor} />}
      </div>
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-indigo-600">{label}</p>
      <p className={`text-lg font-bold ${warn ? 'text-amber-700' : 'text-indigo-900'}`}>{value}</p>
    </div>
  );
}

export default FinancialOverviewDashboard;
