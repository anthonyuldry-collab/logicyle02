import React, { useMemo, useState } from 'react';
import { BankTransaction, IncomeItem, SepaBatch, SupplierInvoice } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import { matchBankTransaction } from '../../utils/accountingEntryUtils';
import { formatFinancialAmount } from '../../utils/financialUtils';

interface FinancialBankReconciliationTabProps {
  transactions: BankTransaction[];
  incomeItems: IncomeItem[];
  supplierInvoices: SupplierInvoice[];
  sepaBatches: SepaBatch[];
  canEdit: boolean;
  onSaveTransaction: (tx: BankTransaction) => Promise<void>;
  onImportTransactions: (txs: BankTransaction[]) => Promise<void>;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

function parseCsvBankLines(csv: string): BankTransaction[] {
  const lines = csv.trim().split('\n').slice(1);
  return lines
    .map((line) => {
      const [date, label, amountStr, type] = line.split(';').map((s) => s.trim());
      const amount = Math.abs(parseFloat(amountStr?.replace(',', '.') || '0'));
      if (!date || !amount) return null;
      return {
        id: `bt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date,
        label: label || 'Opération',
        amount,
        type: (type?.toLowerCase() === 'credit' ? 'credit' : 'debit') as 'credit' | 'debit',
        isReconciled: false,
        importedAt: new Date().toISOString(),
      } satisfies BankTransaction;
    })
    .filter(Boolean) as BankTransaction[];
}

const FinancialBankReconciliationTab: React.FC<FinancialBankReconciliationTabProps> = ({
  transactions,
  incomeItems,
  supplierInvoices,
  sepaBatches,
  canEdit,
  onSaveTransaction,
  onImportTransactions,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const [importText, setImportText] = useState('');

  const stats = useMemo(() => {
    const reconciled = transactions.filter((t) => t.isReconciled).length;
    return { total: transactions.length, reconciled, pending: transactions.length - reconciled };
  }, [transactions]);

  const handleAutoMatch = async () => {
    for (const tx of transactions) {
      if (tx.isReconciled) continue;
      const match = matchBankTransaction(tx, incomeItems, supplierInvoices, sepaBatches);
      if (match.isReconciled) {
        await onSaveTransaction({ ...tx, ...match });
      }
    }
  };

  const handleImport = async () => {
    const parsed = parseCsvBankLines(importText);
    if (parsed.length === 0) return;
    await onImportTransactions(parsed);
    setImportText('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">{t('bankReconciliationTitle')}</h3>
        <p className="text-sm text-gray-500">{t('bankReconciliationDesc')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label={t('bankTotal')} value={String(stats.total)} />
        <Stat label={t('bankReconciled')} value={String(stats.reconciled)} tone="green" />
        <Stat label={t('bankPending')} value={String(stats.pending)} tone="amber" />
      </div>

      {canEdit && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium">{t('bankImportCsv')}</p>
          <p className="text-xs text-gray-500">{t('bankImportFormat')}</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono"
            placeholder="date;libellé;montant;type"
          />
          <div className="flex gap-2">
            <ActionButton variant="secondary" size="sm" onClick={handleImport}>{t('bankImport')}</ActionButton>
            <ActionButton variant="primary" size="sm" onClick={handleAutoMatch}>{t('bankAutoMatch')}</ActionButton>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t('accountingDate')}</th>
              <th className="px-3 py-2 text-left">{t('bankLabel')}</th>
              <th className="px-3 py-2 text-right">{t('bankAmount')}</th>
              <th className="px-3 py-2 text-left">{t('bankType')}</th>
              <th className="px-3 py-2 text-left">{t('bankStatus')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((tx) => (
              <tr key={tx.id} className={tx.isReconciled ? 'bg-green-50' : ''}>
                <td className="px-3 py-2">{tx.date}</td>
                <td className="px-3 py-2">{tx.label}</td>
                <td className="px-3 py-2 text-right">{formatFinancialAmount(tx.amount, locale)}</td>
                <td className="px-3 py-2">{tx.type === 'credit' ? t('bankCredit') : t('bankDebit')}</td>
                <td className="px-3 py-2">
                  {tx.isReconciled ? (
                    <span className="text-green-700 text-xs font-medium">{t('bankMatched')}</span>
                  ) : (
                    <span className="text-amber-700 text-xs">{t('bankUnmatched')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' }) {
  const cls = tone === 'green' ? 'text-green-700' : tone === 'amber' ? 'text-amber-700' : 'text-gray-900';
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

export default FinancialBankReconciliationTab;
