import React, { useEffect, useMemo, useState } from 'react';
import { IncomeItem, InvoiceStatus, TeamInvoiceSettings } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import {
  DEFAULT_INVOICE_SETTINGS,
  enrichIncomeWithAccounting,
  getInvoiceStatusLabel,
  isInvoiceIssuable,
  issueInvoice,
  markInvoicePaid,
  cancelInvoice,
  createCreditNote,
  isInvoiceCancellable,
} from '../../utils/invoiceUtils';
import { exportInvoicePdf, exportInvoicesSummaryPdf } from '../../utils/invoicePdfExport';
import { formatFinancialAmount, formatFinancialDate } from '../../utils/financialUtils';
import { resolveIncomeAccountingCode } from '../../constants/accountingCodes';

interface FinancialInvoicingTabProps {
  incomeItems: IncomeItem[];
  teamName: string;
  invoiceSettings?: TeamInvoiceSettings;
  canEdit: boolean;
  onSaveIncomeItem: (item: IncomeItem) => Promise<void>;
  onSaveInvoiceSettings: (settings: TeamInvoiceSettings) => Promise<void>;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const FinancialInvoicingTab: React.FC<FinancialInvoicingTabProps> = ({
  incomeItems,
  teamName,
  invoiceSettings,
  canEdit,
  onSaveIncomeItem,
  onSaveInvoiceSettings,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';

  const [settingsDraft, setSettingsDraft] = useState<TeamInvoiceSettings>(
    invoiceSettings || DEFAULT_INVOICE_SETTINGS(teamName)
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (invoiceSettings) setSettingsDraft(invoiceSettings);
  }, [invoiceSettings]);

  const enrichedItems = useMemo(
    () =>
      incomeItems
        .map((item) => enrichIncomeWithAccounting(item, language, settingsDraft.defaultVatRate))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [incomeItems, language, settingsDraft.defaultVatRate]
  );

  const filteredItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      if (statusFilter !== 'all' && item.invoiceStatus !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.description.toLowerCase().includes(q) ||
        (item.clientName || item.sponsorshipContactName || '').toLowerCase().includes(q) ||
        (item.invoiceNumber || '').toLowerCase().includes(q) ||
        (item.accountingCode || '').includes(q)
      );
    });
  }, [enrichedItems, statusFilter, search]);

  const stats = useMemo(() => {
    const issued = enrichedItems.filter((i) => i.invoiceStatus === InvoiceStatus.ISSUED);
    const paid = enrichedItems.filter((i) => i.invoiceStatus === InvoiceStatus.PAID);
    const draft = enrichedItems.filter((i) => !i.invoiceStatus || i.invoiceStatus === InvoiceStatus.DRAFT);
    return {
      draft: draft.length,
      issued: issued.length,
      paid: paid.length,
      totalAmount: enrichedItems.reduce((s, i) => s + (i.amount || 0), 0),
    };
  }, [enrichedItems]);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveSettings = async () => {
    if (!canEdit) return;
    setSavingSettings(true);
    try {
      await onSaveInvoiceSettings(settingsDraft);
      setSettingsModalOpen(false);
      showFeedback(t('invoiceSettingsSaved'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleIssueInvoice = async (item: IncomeItem) => {
    if (!canEdit || !isInvoiceIssuable(item)) return;
    setIssuingId(item.id);
    try {
      const { item: issued, settings: updatedSettings } = issueInvoice(item, settingsDraft, language);
      await onSaveInvoiceSettings(updatedSettings);
      await onSaveIncomeItem(issued);
      exportInvoicePdf(issued, updatedSettings, teamName, language);
      showFeedback(t('invoiceIssuedSuccess'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setIssuingId(null);
    }
  };

  const handleDownloadPdf = (item: IncomeItem) => {
    exportInvoicePdf(item, settingsDraft, teamName, language);
  };

  const handleMarkPaid = async (item: IncomeItem) => {
    if (!canEdit) return;
    try {
      await onSaveIncomeItem(markInvoicePaid(item));
      showFeedback(t('invoiceMarkedPaid'));
    } catch {
      showFeedback(t('financialSaveError'));
    }
  };

  const handleCancelInvoice = async (item: IncomeItem) => {
    if (!canEdit || !isInvoiceCancellable(item)) return;
    try {
      await onSaveIncomeItem(cancelInvoice(item));
      showFeedback(t('invoiceCancelled'));
    } catch {
      showFeedback(t('financialSaveError'));
    }
  };

  const handleCreditNote = async (item: IncomeItem) => {
    if (!canEdit) return;
    try {
      const { item: credit, settings: updatedSettings } = createCreditNote(item, settingsDraft, language);
      await onSaveInvoiceSettings(updatedSettings);
      await onSaveIncomeItem(credit);
      exportInvoicePdf(credit, updatedSettings, teamName, language);
    } catch {
      showFeedback(t('financialSaveError'));
    }
  };

  const handleExportSummary = () => {
    const issued = enrichedItems.filter(
      (i) => i.invoiceStatus === InvoiceStatus.ISSUED || i.invoiceStatus === InvoiceStatus.PAID
    );
    if (issued.length === 0) return;
    exportInvoicesSummaryPdf(issued, settingsDraft, teamName, language);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('invoiceTitle')}</h3>
          <p className="text-sm text-gray-500">{t('invoiceDesc')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <ActionButton variant="secondary" size="sm" onClick={() => setSettingsModalOpen(true)}>
              {t('invoiceSettings')}
            </ActionButton>
          )}
          <ActionButton variant="secondary" size="sm" onClick={handleExportSummary}>
            {t('invoiceExportSummary')}
          </ActionButton>
        </div>
      </div>

      {feedback && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label={t('invoiceDraftCount')} value={String(stats.draft)} />
        <StatCard label={t('invoiceIssuedCount')} value={String(stats.issued)} tone="blue" />
        <StatCard label={t('invoicePaidCount')} value={String(stats.paid)} tone="green" />
        <StatCard
          label={t('invoiceTotalAmount')}
          value={formatFinancialAmount(stats.totalAmount, locale)}
        />
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-medium">{t('invoiceAutoAccountingTitle')}</p>
        <p className="mt-1 text-indigo-800">{t('invoiceAutoAccountingDesc')}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('financialSearch')}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">{t('invoiceAllStatuses')}</option>
          <option value={InvoiceStatus.DRAFT}>{t('invoiceStatusDraft')}</option>
          <option value={InvoiceStatus.ISSUED}>{t('invoiceStatusIssued')}</option>
          <option value={InvoiceStatus.PAID}>{t('invoiceStatusPaid')}</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          {t('invoiceEmpty')}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">{t('invoiceNumber')}</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">{t('formDate')}</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">{t('invoiceClient')}</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">{t('invoiceAccountingCode')}</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">{t('sepaAmount')}</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">{t('invoiceStatus')}</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">{t('invoiceActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const accounting = resolveIncomeAccountingCode(item.category, language);
                  const status = item.invoiceStatus || InvoiceStatus.DRAFT;
                  const statusClass =
                    status === InvoiceStatus.PAID
                      ? 'bg-green-100 text-green-800'
                      : status === InvoiceStatus.ISSUED
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700';

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-800">
                        {item.invoiceNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatFinancialDate(item.date, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {item.clientName || item.sponsorshipContactName || '—'}
                        </div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-800">
                          {item.accountingCode || accounting.code}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.accountingLabel || accounting.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatFinancialAmount(item.amount, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                          {getInvoiceStatusLabel(status, language)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {(status === InvoiceStatus.ISSUED || status === InvoiceStatus.PAID) && (
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(item)}
                              className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                            >
                              PDF
                            </button>
                          )}
                          {canEdit && isInvoiceIssuable(item) && status !== InvoiceStatus.ISSUED && (
                            <button
                              type="button"
                              onClick={() => handleIssueInvoice(item)}
                              disabled={issuingId === item.id}
                              className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                            >
                              {issuingId === item.id ? '…' : t('invoiceIssue')}
                            </button>
                          )}
                          {canEdit && status === InvoiceStatus.ISSUED && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(item)}
                              className="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                            >
                              {t('invoiceMarkPaid')}
                            </button>
                          )}
                          {canEdit && isInvoiceCancellable(item) && status === InvoiceStatus.ISSUED && (
                            <button
                              type="button"
                              onClick={() => handleCancelInvoice(item)}
                              className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            >
                              {t('invoiceCancel')}
                            </button>
                          )}
                          {canEdit && (status === InvoiceStatus.ISSUED || status === InvoiceStatus.PAID) && (
                            <button
                              type="button"
                              onClick={() => handleCreditNote(item)}
                              className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50"
                            >
                              {t('invoiceCreditNote')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title={t('invoiceSettings')}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">{t('invoiceIssuerName')}</label>
            <input
              type="text"
              value={settingsDraft.issuerName}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, issuerName: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t('invoiceIssuerAddress')}</label>
            <textarea
              value={settingsDraft.issuerAddress || ''}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, issuerAddress: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">SIRET</label>
              <input
                type="text"
                value={settingsDraft.issuerSiret || ''}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, issuerSiret: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('invoiceVatNumber')}</label>
              <input
                type="text"
                value={settingsDraft.issuerVatNumber || ''}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, issuerVatNumber: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">IBAN</label>
              <input
                type="text"
                value={settingsDraft.issuerIban || ''}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, issuerIban: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('invoiceDefaultVat')}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settingsDraft.defaultVatRate ?? 0}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, defaultVatRate: parseFloat(e.target.value) || 0 }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">{t('invoicePrefix')}</label>
              <input
                type="text"
                value={settingsDraft.invoicePrefix || 'FAC'}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, invoicePrefix: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('invoiceNextNumber')}</label>
              <input
                type="number"
                min="1"
                value={settingsDraft.nextInvoiceNumber ?? 1}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, nextInvoiceNumber: parseInt(e.target.value, 10) || 1 }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionButton variant="secondary" size="sm" onClick={() => setSettingsModalOpen(false)}>
              {t('formCancel')}
            </ActionButton>
            <ActionButton size="sm" onClick={handleSaveSettings} disabled={savingSettings}>
              {t('formSave')}
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'blue' | 'green';
}) {
  const tones = {
    default: 'border-gray-200 bg-white',
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
  };
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default FinancialInvoicingTab;
