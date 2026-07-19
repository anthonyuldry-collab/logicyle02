import React, { useEffect, useMemo, useState } from 'react';
import { useFeedbackTimeout } from '../../hooks/useFeedbackTimeout';
import {
  ExpenseReceipt,
  IncomeItem,
  ClientRecord,
  RaceEvent,
  Rider,
  SepaBatch,
  SepaPaymentOrder,
  StaffEventSelection,
  StaffMember,
  TeamSepaSettings,
} from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import {
  buildSepaPaymentOrders,
  buildSepaBatch,
  formatIbanDisplay,
  getAlreadyPaidReceiptIds,
  getAlreadyPaidSalaryIds,
  isSepaSettingsComplete,
  summarizeSepaOrders,
  validateBic,
  validateIban,
} from '../../utils/sepaUtils';
import { exportSepaCsv, exportSepaPain001Xml, exportSepaPain008Xml } from '../../utils/sepaExport';
import { buildClientCollectionOrders, summarizeCollectionOrders } from '../../utils/sepaCollectionUtils';
import { formatFinancialAmount } from '../../utils/financialUtils';

interface FinancialSepaTabProps {
  riders: Rider[];
  staff: StaffMember[];
  receipts: ExpenseReceipt[];
  raceEvents?: RaceEvent[];
  staffEventSelections?: StaffEventSelection[];
  teamName: string;
  sepaSettings?: TeamSepaSettings;
  sepaBatches?: SepaBatch[];
  canEdit: boolean;
  canExport: boolean;
  onSaveSepaSettings: (settings: TeamSepaSettings) => Promise<void>;
  onMarkReceiptsPaid?: (receiptIds: string[]) => Promise<void>;
  onSaveSepaBatch?: (batch: SepaBatch) => Promise<void>;
  onMarkSalariesPaid?: (sourceIds: string[]) => Promise<void>;
  incomeItems?: IncomeItem[];
  clientRecords?: ClientRecord[];
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const EMPTY_SETTINGS: TeamSepaSettings = {
  debtorName: '',
  debtorIban: '',
  debtorBic: '',
  creditorIdentifier: '',
};

const FinancialSepaTab: React.FC<FinancialSepaTabProps> = ({
  riders,
  staff,
  receipts,
  raceEvents = [],
  staffEventSelections = [],
  teamName,
  sepaSettings,
  sepaBatches = [],
  canEdit,
  canExport,
  onSaveSepaSettings,
  onMarkReceiptsPaid,
  onSaveSepaBatch,
  onMarkSalariesPaid,
  incomeItems = [],
  clientRecords = [],
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';

  const [settingsDraft, setSettingsDraft] = useState<TeamSepaSettings>(sepaSettings || EMPTY_SETTINGS);
  const [includeSalaries, setIncludeSalaries] = useState(true);
  const [includeReimbursements, setIncludeReimbursements] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllReady, setSelectAllReady] = useState(true);
  const [collectionSelectedIds, setCollectionSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllCollections, setSelectAllCollections] = useState(true);
  const [executionDate, setExecutionDate] = useState(new Date().toISOString().slice(0, 10));
  const { feedback, showFeedback } = useFeedbackTimeout(4000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sepaSettings) setSettingsDraft(sepaSettings);
  }, [sepaSettings]);

  const payrollContext = useMemo(
    () => ({ raceEvents, staffEventSelections }),
    [raceEvents, staffEventSelections]
  );

  const paidSalaryIds = useMemo(
    () => getAlreadyPaidSalaryIds(riders, staff, sepaBatches),
    [riders, staff, sepaBatches]
  );
  const paidReceiptIds = useMemo(() => getAlreadyPaidReceiptIds(sepaBatches), [sepaBatches]);

  const allOrders = useMemo(
    () =>
      buildSepaPaymentOrders({
        riders,
        staff,
        receipts,
        payrollContext,
        includeSalaries,
        includeReimbursements,
      }).filter((o) => {
        if (o.type === 'salary' && paidSalaryIds.has(o.sourceId)) return false;
        if (o.type === 'reimbursement' && paidReceiptIds.has(o.sourceId)) return false;
        return true;
      }),
    [riders, staff, receipts, payrollContext, includeSalaries, includeReimbursements, paidSalaryIds, paidReceiptIds]
  );

  const summary = useMemo(() => summarizeSepaOrders(allOrders), [allOrders]);

  const collectionSummary = useMemo(
    () => summarizeCollectionOrders(buildClientCollectionOrders(incomeItems, clientRecords)),
    [incomeItems, clientRecords]
  );

  const selectedOrders = useMemo(() => {
    if (selectAllReady) return summary.readyOrders;
    return summary.readyOrders.filter((o) => selectedIds.has(o.id));
  }, [summary.readyOrders, selectedIds, selectAllReady]);

  const selectedCollectionOrders = useMemo(() => {
    if (selectAllCollections) return collectionSummary.readyOrders;
    return collectionSummary.readyOrders.filter((o) => collectionSelectedIds.has(o.id));
  }, [collectionSummary.readyOrders, collectionSelectedIds, selectAllCollections]);

  const selectedTotal = useMemo(
    () => Math.round(selectedOrders.reduce((sum, o) => sum + o.amount, 0) * 100) / 100,
    [selectedOrders]
  );

  const settingsValid = isSepaSettingsComplete(settingsDraft);
  const ibanError =
    settingsDraft.debtorIban && !validateIban(settingsDraft.debtorIban) ? t('sepaInvalidIban') : null;
  const bicError =
    settingsDraft.debtorBic && !validateBic(settingsDraft.debtorBic) ? t('sepaInvalidBic') : null;

  const handleSaveSettings = async () => {
    if (!canEdit || !settingsValid || ibanError || bicError) return;
    setSaving(true);
    try {
      await onSaveSepaSettings({
        ...settingsDraft,
        debtorIban: settingsDraft.debtorIban.replace(/\s+/g, '').toUpperCase(),
        debtorBic: settingsDraft.debtorBic?.replace(/\s+/g, '').toUpperCase(),
      });
      showFeedback(t('sepaSettingsSaved'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleExportXml = async () => {
    if (!canExport || !settingsValid || selectedOrders.length === 0) return;
    exportSepaPain001Xml(teamName, settingsDraft, selectedOrders, executionDate);

    const batch = buildSepaBatch({
      orders: selectedOrders,
      executionDate,
    });
    if (onSaveSepaBatch) await onSaveSepaBatch(batch);

    const reimbursementIds = selectedOrders
      .filter((o) => o.type === 'reimbursement')
      .map((o) => o.sourceId);
    if (reimbursementIds.length > 0 && onMarkReceiptsPaid) {
      await onMarkReceiptsPaid(reimbursementIds);
    }

    const salaryIds = selectedOrders
      .filter((o) => o.type === 'salary')
      .map((o) => o.sourceId);
    if (salaryIds.length > 0 && onMarkSalariesPaid) {
      await onMarkSalariesPaid(salaryIds);
    }

    showFeedback(t('sepaExportSuccess'));
  };

  const handleExportCsv = () => {
    if (!canExport || selectedOrders.length === 0) return;
    exportSepaCsv(teamName, selectedOrders);
    showFeedback(t('sepaExportSuccess'));
  };

  const toggleSelection = (id: string) => {
    setSelectAllReady(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllReady = () => {
    if (selectAllReady) {
      setSelectAllReady(false);
      setSelectedIds(new Set());
    } else {
      setSelectAllReady(true);
      setSelectedIds(new Set(summary.readyOrders.map((o) => o.id)));
    }
  };

  const toggleCollectionSelection = (id: string) => {
    setSelectAllCollections(false);
    setCollectionSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllCollections = () => {
    if (selectAllCollections) {
      setSelectAllCollections(false);
      setCollectionSelectedIds(new Set());
    } else {
      setSelectAllCollections(true);
      setCollectionSelectedIds(new Set(collectionSummary.readyOrders.map((o) => o.id)));
    }
  };

  const handleExportPain008 = () => {
    if (!canExport || !settingsValid || !settingsDraft.creditorIdentifier || selectedCollectionOrders.length === 0) return;
    exportSepaPain008Xml(teamName, settingsDraft, selectedCollectionOrders, executionDate);
    showFeedback(t('sepaExportSuccess'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">{t('sepaTitle')}</h3>
        <p className="text-sm text-gray-500">{t('sepaDesc')}</p>
      </div>

      {feedback && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {feedback}
        </div>
      )}

      {!canExport && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t('sepaExportPlanHint')}
        </p>
      )}

      {canExport && (
        <p className="text-xs text-gray-500">{t('sepaFormatNote')}</p>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="mb-3 font-medium text-gray-900">{t('sepaDebtorAccount')}</h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">{t('sepaDebtorName')}</label>
            <input
              type="text"
              value={settingsDraft.debtorName}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, debtorName: e.target.value }))}
              disabled={!canEdit}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder={teamName}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t('sepaDebtorIban')}</label>
            <input
              type="text"
              value={settingsDraft.debtorIban}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, debtorIban: e.target.value }))}
              disabled={!canEdit}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              placeholder="FR76 3000 6000 0112 3456 7890 189"
            />
            {ibanError && <p className="mt-1 text-xs text-red-600">{ibanError}</p>}
            {settingsDraft.debtorIban && validateIban(settingsDraft.debtorIban) && (
              <p className="mt-1 text-xs text-gray-500">{formatIbanDisplay(settingsDraft.debtorIban)}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t('sepaDebtorBic')}</label>
            <input
              type="text"
              value={settingsDraft.debtorBic || ''}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, debtorBic: e.target.value }))}
              disabled={!canEdit}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              placeholder="BNPAFRPP"
            />
            {bicError && <p className="mt-1 text-xs text-red-600">{bicError}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t('sepaCreditorId')}</label>
            <input
              type="text"
              value={settingsDraft.creditorIdentifier || ''}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, creditorIdentifier: e.target.value }))}
              disabled={!canEdit}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              placeholder="FR00ZZZ123456"
            />
            <p className="mt-1 text-xs text-gray-500">{t('sepaCreditorIdHint')}</p>
          </div>
        </div>
        {canEdit && (
          <div className="mt-4">
            <ActionButton size="sm" onClick={handleSaveSettings} disabled={saving || !settingsValid || !!ibanError || !!bicError}>
              {t('sepaSaveSettings')}
            </ActionButton>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SummaryCard label={t('sepaOrdersTotal')} value={String(summary.total)} />
        <SummaryCard label={t('sepaOrdersReady')} value={String(summary.readyCount)} tone="green" />
        <SummaryCard label={t('sepaOrdersMissingIban')} value={String(summary.missingIbanCount)} tone="amber" />
        <SummaryCard
          label={t('sepaSelectedAmount')}
          value={formatFinancialAmount(selectedTotal, locale)}
          tone="blue"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includeSalaries}
            onChange={(e) => setIncludeSalaries(e.target.checked)}
          />
          {t('sepaIncludeSalaries')}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includeReimbursements}
            onChange={(e) => setIncludeReimbursements(e.target.checked)}
          />
          {t('sepaIncludeReimbursements')}
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600">
            {t('sepaExecutionDate')}
            <input
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
              className="ml-2 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
          {canExport && (
            <>
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={handleExportCsv}
                disabled={selectedOrders.length === 0}
              >
                {t('sepaExportCsv')}
              </ActionButton>
              <ActionButton
                size="sm"
                onClick={handleExportXml}
                disabled={!settingsValid || selectedOrders.length === 0}
              >
                {t('sepaExportXml')}
              </ActionButton>
            </>
          )}
        </div>
      </div>

      {summary.missingIbanCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="font-medium text-amber-900">{t('sepaMissingIbanTitle')}</h4>
          <p className="mt-1 text-sm text-amber-800">{t('sepaMissingIbanDesc')}</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {summary.missingIbanOrders.map((o) => (
              <li key={o.id}>
                {o.beneficiaryName} — {o.type === 'salary' ? t('sepaTypeSalary') : t('sepaTypeReimbursement')}
                {o.sourceLabel ? ` (${o.sourceLabel})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h4 className="font-medium text-gray-900">{t('sepaOrdersList')}</h4>
          {summary.readyOrders.length > 0 && (
            <button
              type="button"
              onClick={toggleAllReady}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectAllReady ? t('sepaDeselectAll') : t('sepaSelectAll')}
            </button>
          )}
        </div>
        {allOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">{t('sepaOrdersEmpty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 w-8" />
                  <th className="px-4 py-2 text-left font-medium text-gray-500">{t('sepaBeneficiary')}</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">{t('sepaType')}</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">IBAN</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">{t('sepaAmount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allOrders.map((order) => (
                  <SepaOrderRow
                    key={order.id}
                    order={order}
                    locale={locale}
                    selected={selectAllReady || selectedIds.has(order.id)}
                    onToggle={() => toggleSelection(order.id)}
                    salaryLabel={t('sepaTypeSalary')}
                    reimbursementLabel={t('sepaTypeReimbursement')}
                    missingIbanLabel={t('sepaMissingIban')}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-medium text-gray-900">{t('sepaCollectionsTitle')}</h4>
            <p className="text-sm text-gray-600">{t('sepaCollectionsDesc')}</p>
          </div>
          {canExport && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={handleExportPain008}
              disabled={!settingsValid || !settingsDraft.creditorIdentifier || selectedCollectionOrders.length === 0}
            >
              {t('sepaExportPain008')}
            </ActionButton>
          )}
        </div>

        {collectionSummary.orders.length === 0 ? (
          <p className="text-sm text-gray-500">{t('sepaCollectionsEmpty')}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SummaryCard label={t('sepaCollectionsReady')} value={String(collectionSummary.readyOrders.length)} tone="green" />
              <SummaryCard label={t('sepaCollectionsMissingIban')} value={String(collectionSummary.invalidCount)} tone="amber" />
              <SummaryCard
                label={t('sepaSelectedAmount')}
                value={formatFinancialAmount(
                  selectedCollectionOrders.reduce((s, o) => s + o.amount, 0),
                  locale
                )}
                tone="blue"
              />
            </div>

            {collectionSummary.invalidCount > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-medium">{t('sepaCollectionsMissingIbanHint')}</p>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {collectionSummary.orders.filter((o) => !o.hasValidIban).slice(0, 5).map((o) => (
                    <li key={o.id}>{o.clientName}</li>
                  ))}
                </ul>
              </div>
            )}

            {collectionSummary.readyOrders.length > 0 && (
              <div className="flex justify-end">
                <button type="button" onClick={toggleAllCollections} className="text-sm text-blue-600 hover:text-blue-800">
                  {selectAllCollections ? t('sepaDeselectAll') : t('sepaSelectAll')}
                </button>
              </div>
            )}

            <div className="overflow-x-auto rounded-md border border-indigo-100 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-indigo-50/60">
                  <tr>
                    <th className="w-8 px-3 py-2" />
                    <th className="px-3 py-2 text-left">{t('sepaBeneficiary')}</th>
                    <th className="px-3 py-2 text-left">IBAN</th>
                    <th className="px-3 py-2 text-right">{t('sepaAmount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {collectionSummary.orders.map((order) => (
                    <tr key={order.id} className={!order.hasValidIban ? 'bg-amber-50/40' : undefined}>
                      <td className="px-3 py-2">
                        {order.hasValidIban && (
                          <input
                            type="checkbox"
                            checked={selectAllCollections || collectionSelectedIds.has(order.id)}
                            onChange={() => toggleCollectionSelection(order.id)}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">{order.clientName}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {order.hasValidIban ? formatIbanDisplay(order.beneficiaryIban) : (
                          <span className="text-amber-700">{t('sepaMissingIban')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{formatFinancialAmount(order.amount, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {sepaBatches.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="font-medium text-gray-900">{t('sepaBatchHistory')}</h4>
          <ul className="mt-2 divide-y text-sm">
            {sepaBatches.slice(0, 10).map((batch) => (
              <li key={batch.id} className="py-2 flex justify-between">
                <span className="font-mono text-xs">{batch.batchReference}</span>
                <span>{formatFinancialAmount(batch.totalAmount, locale)} · {batch.orderCount} ordres</span>
                <span className="text-gray-500">{batch.executionDate}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'green' | 'amber' | 'blue';
}) {
  const tones = {
    default: 'border-gray-200 bg-white',
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    blue: 'border-blue-200 bg-blue-50',
  };
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function SepaOrderRow({
  order,
  locale,
  selected,
  onToggle,
  salaryLabel,
  reimbursementLabel,
  missingIbanLabel,
}: {
  order: SepaPaymentOrder;
  locale: string;
  selected: boolean;
  onToggle: () => void;
  salaryLabel: string;
  reimbursementLabel: string;
  missingIbanLabel: string;
}) {
  return (
    <tr className={!order.hasValidIban ? 'bg-amber-50/50' : undefined}>
      <td className="px-4 py-2">
        {order.hasValidIban && (
          <input type="checkbox" checked={selected} onChange={onToggle} aria-label="Sélectionner" />
        )}
      </td>
      <td className="px-4 py-2">
        <div className="font-medium text-gray-900">{order.beneficiaryName}</div>
        {order.sourceLabel && <div className="text-xs text-gray-500">{order.sourceLabel}</div>}
      </td>
      <td className="px-4 py-2 text-gray-600">
        {order.type === 'salary' ? salaryLabel : reimbursementLabel}
      </td>
      <td className="px-4 py-2 font-mono text-xs text-gray-600">
        {order.hasValidIban ? formatIbanDisplay(order.beneficiaryIban) : (
          <span className="text-amber-700">{missingIbanLabel}</span>
        )}
      </td>
      <td className="px-4 py-2 text-right font-medium text-gray-900">
        {formatFinancialAmount(order.amount, locale)}
      </td>
    </tr>
  );
}

export default FinancialSepaTab;
