import React, { useMemo } from 'react';
import { AccountingEntry, EventBudgetItem, IncomeItem, SepaBatch, SupplierInvoice } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import { buildAccountingEntries, summarizeAccountingEntries } from '../../utils/accountingEntryUtils';
import { exportFecCsv } from '../../utils/fecExport';
import { formatFinancialAmount } from '../../utils/financialUtils';

interface FinancialAccountingTabProps {
  incomeItems: IncomeItem[];
  budgetItems: EventBudgetItem[];
  supplierInvoices: SupplierInvoice[];
  sepaBatches: SepaBatch[];
  issuerSiret?: string;
  canExport: boolean;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const FinancialAccountingTab: React.FC<FinancialAccountingTabProps> = ({
  incomeItems,
  budgetItems,
  supplierInvoices,
  sepaBatches,
  issuerSiret,
  canExport,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';

  const entries = useMemo(
    () =>
      buildAccountingEntries({
        incomeItems,
        budgetItems,
        supplierInvoices,
        sepaBatches,
        language,
      }),
    [incomeItems, budgetItems, supplierInvoices, sepaBatches, language]
  );

  const summary = useMemo(() => summarizeAccountingEntries(entries), [entries]);

  const handleExportFec = () => {
    const siren = (issuerSiret || '000000000').replace(/\s/g, '').slice(0, 9);
    exportFecCsv({
      incomeItems,
      budgetItems,
      supplierInvoices,
      sepaBatches,
      siren,
      fiscalYearEnd: new Date().toISOString().slice(0, 10),
      language,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('accountingTitle')}</h3>
          <p className="text-sm text-gray-500">{t('accountingDesc')}</p>
        </div>
        {canExport && (
          <ActionButton variant="primary" size="sm" onClick={handleExportFec}>
            {t('exportFec')}
          </ActionButton>
        )}
      </div>

      {!canExport && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t('financialAccountingPlanHint')}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label={t('accountingEntryCount')} value={String(summary.count)} />
        <Stat label={t('accountingTotalDebit')} value={formatFinancialAmount(summary.totalDebit, locale)} />
        <Stat label={t('accountingTotalCredit')} value={formatFinancialAmount(summary.totalCredit, locale)} />
        <Stat
          label={t('accountingBalanced')}
          value={summary.balanced ? '✓' : '✗'}
          tone={summary.balanced ? 'green' : 'red'}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t('accountingDate')}</th>
              <th className="px-3 py-2 text-left">{t('accountingJournal')}</th>
              <th className="px-3 py-2 text-left">{t('accountingAccount')}</th>
              <th className="px-3 py-2 text-left">{t('accountingLabel')}</th>
              <th className="px-3 py-2 text-right">{t('accountingDebit')}</th>
              <th className="px-3 py-2 text-right">{t('accountingCredit')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.slice(0, 200).map((e: AccountingEntry) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{e.date.slice(0, 10)}</td>
                <td className="px-3 py-2">{e.journal}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.accountCode}</td>
                <td className="px-3 py-2 max-w-xs truncate">{e.label}</td>
                <td className="px-3 py-2 text-right">
                  {e.debit > 0 ? formatFinancialAmount(e.debit, locale) : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  {e.credit > 0 ? formatFinancialAmount(e.credit, locale) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length > 200 && (
          <p className="p-3 text-xs text-gray-500">{entries.length} écritures — affichage limité à 200 lignes</p>
        )}
      </div>
    </div>
  );
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  const color =
    tone === 'green' ? 'text-green-700' : tone === 'red' ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export default FinancialAccountingTab;
