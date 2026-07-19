import React, { useEffect, useMemo, useState } from 'react';
import {
  ClientRecord,
  IncomeCategory,
  IncomeItem,
  InvoiceStatus,
  TeamInvoiceSettings,
} from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import { useFeedbackTimeout } from '../../hooks/useFeedbackTimeout';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import InvoiceEditModal from '../../components/financial/InvoiceEditModal';
import {
  DEFAULT_INVOICE_SETTINGS,
  enrichIncomeWithAccounting,
  getInvoiceStatusLabel,
  isInvoiceEditable,
  isInvoiceIssuable,
  isInvoiceOverdue,
  issueInvoice,
  markInvoicePaid,
  cancelInvoice,
  createCreditNote,
  isInvoiceCancellable,
  resolveInvoiceDueDate,
  computeInvoiceAmounts,
  computeDueDate,
} from '../../utils/invoiceUtils';
import { exportInvoicePdf, exportInvoicesSummaryPdf } from '../../utils/invoicePdfExport';
import { formatFinancialAmount, formatFinancialDate } from '../../utils/financialUtils';
import { generateId } from '../../utils/themeUtils';
import { allocateDocumentSequence } from '../../services/firebaseService';

interface FinancialInvoicingTabProps {
  incomeItems: IncomeItem[];
  teamName: string;
  teamId?: string;
  invoiceSettings?: TeamInvoiceSettings;
  canEdit: boolean;
  onSaveIncomeItem: (item: IncomeItem) => Promise<void>;
  onSaveInvoiceSettings: (settings: TeamInvoiceSettings) => Promise<void>;
  clients?: ClientRecord[];
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const FinancialInvoicingTab: React.FC<FinancialInvoicingTabProps> = ({
  incomeItems,
  teamName,
  teamId,
  invoiceSettings,
  canEdit,
  onSaveIncomeItem,
  onSaveInvoiceSettings,
  clients = [],
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';

  const [settingsDraft, setSettingsDraft] = useState<TeamInvoiceSettings>(
    invoiceSettings || DEFAULT_INVOICE_SETTINGS(teamName)
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const { feedback, showFeedback } = useFeedbackTimeout(4000);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingItem, setEditingItem] = useState<IncomeItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState({
    description: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    category: IncomeCategory.SPONSORING,
    clientId: '',
    clientName: '',
    vatRate: 0,
    paymentTermsDays: 30,
  });

  useEffect(() => {
    if (invoiceSettings) setSettingsDraft(invoiceSettings);
  }, [invoiceSettings]);

  useEffect(() => {
    setNewDraft((d) => ({
      ...d,
      vatRate: settingsDraft.defaultVatRate ?? 0,
    }));
  }, [settingsDraft.defaultVatRate]);

  const enrichedItems = useMemo(
    () =>
      incomeItems
        .map((item) => enrichIncomeWithAccounting(item, language, settingsDraft.defaultVatRate))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [incomeItems, language, settingsDraft.defaultVatRate]
  );

  const filteredItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      if (statusFilter === 'overdue') {
        if (!isInvoiceOverdue(item)) return false;
      } else if (statusFilter !== 'all' && item.invoiceStatus !== statusFilter) {
        return false;
      }
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
    let draft = 0;
    let issued = 0;
    let paid = 0;
    let overdue = 0;
    let overdueAmount = 0;
    let vatCollected = 0;
    let totalAmount = 0;

    for (let i = 0; i < enrichedItems.length; i++) {
      const item = enrichedItems[i];
      const amount = item.amount || 0;
      totalAmount += amount;
      const status = item.invoiceStatus || InvoiceStatus.DRAFT;

      if (status === InvoiceStatus.DRAFT) draft += 1;
      else if (status === InvoiceStatus.ISSUED) {
        issued += 1;
        if (isInvoiceOverdue(item)) {
          overdue += 1;
          overdueAmount += amount;
        }
        const { vatAmount } = computeInvoiceAmounts(amount, item.vatRate ?? 0);
        vatCollected += vatAmount;
      } else if (status === InvoiceStatus.PAID) {
        paid += 1;
        const { vatAmount } = computeInvoiceAmounts(amount, item.vatRate ?? 0);
        vatCollected += vatAmount;
      }
    }

    return {
      draft,
      issued,
      paid,
      overdue,
      overdueAmount,
      vatCollected,
      totalAmount,
    };
  }, [enrichedItems]);

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
      let toIssue = item;
      if (!item.dueDate && item.clientId) {
        const client = clients.find((c) => c.id === item.clientId);
        if (client?.paymentTermsDays != null) {
          toIssue = { ...item, paymentTermsDays: client.paymentTermsDays };
        }
      }

      let allocatedSequence: number | undefined;
      let baseSettings = settingsDraft;
      if (!toIssue.invoiceNumber && teamId) {
        const allocated = await allocateDocumentSequence(teamId, 'nextInvoiceNumber');
        allocatedSequence = allocated.sequence;
        baseSettings = { ...settingsDraft, ...allocated.invoiceSettings };
      }

      const { item: issued, settings: updatedSettings } = issueInvoice(
        toIssue,
        baseSettings,
        language,
        allocatedSequence
      );
      await onSaveInvoiceSettings(updatedSettings);
      setSettingsDraft(updatedSettings);
      try {
        await onSaveIncomeItem(issued);
      } catch (saveError) {
        // Séquence déjà consommée — ne pas décrémenter (trous acceptés).
        console.error('Facture numérotée mais non persistée:', saveError);
        throw saveError;
      }
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
      let allocatedSequence: number | undefined;
      let baseSettings = settingsDraft;
      if (teamId) {
        const allocated = await allocateDocumentSequence(teamId, 'nextInvoiceNumber');
        allocatedSequence = allocated.sequence;
        baseSettings = { ...settingsDraft, ...allocated.invoiceSettings };
      }

      const { item: credit, settings: updatedSettings } = createCreditNote(
        item,
        baseSettings,
        language,
        allocatedSequence
      );
      await onSaveInvoiceSettings(updatedSettings);
      setSettingsDraft(updatedSettings);
      try {
        await onSaveIncomeItem(credit);
      } catch (saveError) {
        console.error('Avoir numéroté mais non persisté:', saveError);
        throw saveError;
      }
      exportInvoicePdf(credit, updatedSettings, teamName, language);
      showFeedback(t('invoiceCreditNoteCreated'));
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

  const openCreateModal = () => {
    setNewDraft({
      description: '',
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      category: IncomeCategory.SPONSORING,
      clientId: '',
      clientName: '',
      vatRate: settingsDraft.defaultVatRate ?? 0,
      paymentTermsDays: 30,
    });
    setCreateModalOpen(true);
  };

  const applyNewClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      setNewDraft((d) => ({ ...d, clientId: '', clientName: d.clientName }));
      return;
    }
    setNewDraft((d) => ({
      ...d,
      clientId: client.id,
      clientName: client.companyName,
      paymentTermsDays: client.paymentTermsDays ?? 30,
    }));
  };

  const handleCreateDraft = async () => {
    if (!canEdit) return;
    if (!newDraft.description.trim() || !(newDraft.amount > 0)) {
      showFeedback(t('invoiceCreateError'));
      return;
    }
    setCreating(true);
    try {
      const item = enrichIncomeWithAccounting(
        {
          id: generateId(),
          description: newDraft.description.trim(),
          amount: newDraft.amount,
          date: newDraft.date,
          category: newDraft.category,
          clientId: newDraft.clientId || undefined,
          clientName: newDraft.clientName.trim() || undefined,
          vatRate: newDraft.vatRate,
          paymentTermsDays: newDraft.paymentTermsDays,
          dueDate: computeDueDate(newDraft.date, newDraft.paymentTermsDays),
          invoiceStatus: InvoiceStatus.DRAFT,
        },
        language,
        newDraft.vatRate
      );
      await onSaveIncomeItem(item);
      setCreateModalOpen(false);
      setEditingItem(item);
      showFeedback(t('invoiceDraftCreated'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setCreating(false);
    }
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
            <>
              <ActionButton size="sm" onClick={openCreateModal}>
                {t('invoiceCreate')}
              </ActionButton>
              <ActionButton variant="secondary" size="sm" onClick={() => setSettingsModalOpen(true)}>
                {t('invoiceSettings')}
              </ActionButton>
            </>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t('invoiceDraftCount')} value={String(stats.draft)} />
        <StatCard label={t('invoiceIssuedCount')} value={String(stats.issued)} tone="blue" />
        <StatCard label={t('invoicePaidCount')} value={String(stats.paid)} tone="green" />
        <StatCard
          label={t('invoiceOverdueCount')}
          value={String(stats.overdue)}
          tone={stats.overdue > 0 ? 'red' : 'default'}
        />
        <StatCard
          label={t('invoiceOverdueAmount')}
          value={formatFinancialAmount(stats.overdueAmount, locale)}
          tone={stats.overdueAmount > 0 ? 'red' : 'default'}
        />
        <StatCard
          label={t('invoiceVatCollected')}
          value={formatFinancialAmount(stats.vatCollected, locale)}
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
          <option value="overdue">{t('invoiceStatusOverdue')}</option>
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
                  <th className="px-3 py-2 text-left font-medium text-gray-500">{t('invoiceNumber')}</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">{t('formDate')}</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">{t('invoiceDueDate')}</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">{t('invoiceClient')}</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">{t('invoiceAccountingCode')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">{t('invoiceAmountHT')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">{t('sepaAmount')}</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">{t('invoiceStatus')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">{t('invoiceActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const status = item.invoiceStatus || InvoiceStatus.DRAFT;
                  const overdue = isInvoiceOverdue(item);
                  const due = resolveInvoiceDueDate(item);
                  const amountHT = item.amountHT ?? computeInvoiceAmounts(item.amount, item.vatRate ?? 0).amountHT;
                  const vatAmount =
                    item.amountHT != null
                      ? Math.round((item.amount - item.amountHT) * 100) / 100
                      : computeInvoiceAmounts(item.amount, item.vatRate ?? 0).vatAmount;
                  const statusClass = overdue
                    ? 'bg-red-100 text-red-800'
                    : status === InvoiceStatus.PAID
                      ? 'bg-green-100 text-green-800'
                      : status === InvoiceStatus.ISSUED
                        ? 'bg-blue-100 text-blue-800'
                        : status === InvoiceStatus.CANCELLED
                          ? 'bg-gray-200 text-gray-600'
                          : 'bg-gray-100 text-gray-700';

                  return (
                    <tr key={item.id} className={overdue ? 'bg-red-50/40' : undefined}>
                      <td className="px-3 py-3 font-mono text-xs text-gray-800">
                        {item.invoiceNumber || '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {formatFinancialDate(item.date, locale)}
                      </td>
                      <td className={`px-3 py-3 ${overdue ? 'font-medium text-red-700' : 'text-gray-700'}`}>
                        {formatFinancialDate(due, locale)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">
                          {item.clientName || item.sponsorshipContactName || '—'}
                        </div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-xs text-gray-800">
                          {item.accountingCode || '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.accountingLabel || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700">
                        <div className="font-medium">{formatFinancialAmount(amountHT, locale)}</div>
                        {(item.vatRate ?? 0) > 0 && (
                          <div className="text-[10px] text-gray-500">
                            TVA {item.vatRate}% · {formatFinancialAmount(vatAmount, locale)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-gray-900">
                        {formatFinancialAmount(item.amount, locale)}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                          {overdue ? t('invoiceStatusOverdue') : getInvoiceStatusLabel(status, language)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            {canEdit && isInvoiceEditable(item) ? t('invoiceEdit') : t('invoiceView')}
                          </button>
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
                          {canEdit &&
                            (status === InvoiceStatus.ISSUED || status === InvoiceStatus.PAID) && (
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

      <InvoiceEditModal
        item={editingItem}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onSave={async (updated) => {
          await onSaveIncomeItem(updated);
          showFeedback(t('invoiceEditSaved'));
        }}
        clients={clients}
        invoiceSettings={settingsDraft}
        canEdit={canEdit}
      />

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t('invoiceCreate')}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">{t('formDescription')}</label>
            <input
              type="text"
              value={newDraft.description}
              onChange={(e) => setNewDraft((d) => ({ ...d, description: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">{t('invoiceAmountTTC')}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={newDraft.amount}
                onChange={(e) =>
                  setNewDraft((d) => ({ ...d, amount: parseFloat(e.target.value) || 0 }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('formDate')}</label>
              <input
                type="date"
                value={newDraft.date}
                onChange={(e) => setNewDraft((d) => ({ ...d, date: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {clients.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">{t('invoiceSelectClient')}</label>
              <select
                value={newDraft.clientId}
                onChange={(e) => applyNewClient(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">{t('invoiceNoClient')}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">{t('invoiceClient')}</label>
            <input
              type="text"
              value={newDraft.clientName}
              onChange={(e) =>
                setNewDraft((d) => ({ ...d, clientName: e.target.value, clientId: '' }))
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">{t('invoiceVatRate')}</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={newDraft.vatRate}
                onChange={(e) =>
                  setNewDraft((d) => ({ ...d, vatRate: parseFloat(e.target.value) || 0 }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('formCategory')}</label>
              <select
                value={newDraft.category}
                onChange={(e) =>
                  setNewDraft((d) => ({ ...d, category: e.target.value as IncomeCategory }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {Object.values(IncomeCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionButton variant="secondary" size="sm" onClick={() => setCreateModalOpen(false)}>
              {t('formCancel')}
            </ActionButton>
            <ActionButton size="sm" onClick={handleCreateDraft} disabled={creating}>
              {creating ? '…' : t('formSave')}
            </ActionButton>
          </div>
        </div>
      </Modal>

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
                  setSettingsDraft((s) => ({
                    ...s,
                    nextInvoiceNumber: parseInt(e.target.value, 10) || 1,
                  }))
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
  tone?: 'default' | 'blue' | 'green' | 'red';
}) {
  const tones = {
    default: 'border-gray-200 bg-white',
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    red: 'border-red-200 bg-red-50',
  };
  return (
    <div className={`rounded-lg border p-3 shadow-sm ${tones[tone]}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-gray-900 tabular-nums sm:text-xl">{value}</div>
    </div>
  );
}

export default FinancialInvoicingTab;
