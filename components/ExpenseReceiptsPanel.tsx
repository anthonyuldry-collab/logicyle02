import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AppSection,
  EventBudgetItem,
  EventTransportLeg,
  ExpenseReceipt,
  ExpenseReceiptStatus,
  ExpenseOcrStatus,
  PermissionLevel,
  RaceEvent,
  StaffMember,
  User,
} from '../types';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from '../components/ActionButton';
import ReceiptScanner, { ReceiptScanResult } from '../components/ReceiptScanner';
import {
  buildExpenseReceiptDraft,
  canManageExpenseReceipts,
  canScanExpenseReceipts,
  sortReceiptsByDate,
  syncReceiptToBudgetItem,
} from '../utils/expenseReceiptUtils';
import { exportExpenseReceiptsPdf } from '../utils/expenseReceiptPdfExport';
import { uploadExpenseReceiptImage } from '../services/receiptStorageService';
import { formatFinancialAmount, formatFinancialDate } from '../utils/financialUtils';
import MediaThumb from './MediaThumb';
import { isDisplayableImageUrl } from '../utils/mediaUrlUtils';
interface ExpenseReceiptsPanelProps {
  receipts: ExpenseReceipt[];
  raceEvents: RaceEvent[];
  transportLegs?: EventTransportLeg[];
  currentUser: User;
  staff: StaffMember[];
  teamId: string;
  teamName: string;
  /** 'user' = espace indépendant (path Storage users/...), 'team' = équipe */
  storageScope?: 'team' | 'user';
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  onSaveReceipt: (receipt: ExpenseReceipt) => Promise<void>;
  onSaveBudgetItem?: (item: EventBudgetItem) => Promise<void>;
  defaultEventId?: string;
  defaultTransportLegId?: string;
  autoOpenScanner?: boolean;
  onScannerOpened?: () => void;
  compact?: boolean;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const ExpenseReceiptsPanel: React.FC<ExpenseReceiptsPanelProps> = ({
  receipts,
  raceEvents,
  transportLegs = [],
  currentUser,
  staff,
  teamId,
  teamName,
  storageScope = 'team',
  effectivePermissions,
  onSaveReceipt,
  onSaveBudgetItem,
  defaultEventId,
  defaultTransportLegId,
  autoOpenScanner = false,
  onScannerOpened,
  compact = false,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const lang = language === 'en' ? 'en' : 'fr';

  const canScan = canScanExpenseReceipts(currentUser, staff);
  const hasFinancialView = effectivePermissions?.financial?.includes('view') ?? false;
  const canManage = canManageExpenseReceipts(currentUser, staff, hasFinancialView);

  const [showScanner, setShowScanner] = useState(autoOpenScanner);
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (autoOpenScanner) {
      setShowScanner(true);
      onScannerOpened?.();
    }
  }, [autoOpenScanner, onScannerOpened]);

  const sorted = useMemo(() => sortReceiptsByDate(receipts), [receipts]);

  const filtered = useMemo(() => {
    return sorted.filter((r) => {
      if (filterEventId !== 'all' && r.eventId !== filterEventId) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (!canManage && r.submittedByUserId !== currentUser.id) return false;
      return true;
    });
  }, [sorted, filterEventId, filterStatus, canManage, currentUser.id]);

  const handleScanComplete = useCallback(
    async (scan: ReceiptScanResult) => {
      if (!teamId) return;
      setIsSaving(true);
      try {
        const draft = buildExpenseReceiptDraft({
          user: currentUser,
          staff,
          imageUrl: scan.imageDataUrl,
          imageMimeType: scan.mimeType,
          eventId: scan.eventId,
          transportLegId: scan.transportLegId,
          budgetCategory: scan.budgetCategory,
          amount: scan.amount,
          receiptDate: scan.receiptDate,
          merchant: scan.merchant,
          description: scan.description,
          ocrStatus: scan.ocrRawText ? ExpenseOcrStatus.DONE : ExpenseOcrStatus.MANUAL,
          ocrRawText: scan.ocrRawText,
          ocrConfidence: scan.ocrConfidence,
          language: lang,
        });

        const imageUrl = await uploadExpenseReceiptImage(
          teamId,
          currentUser.id,
          draft.id,
          scan.imageDataUrl,
          scan.mimeType,
          { scope: storageScope }
        );
        await onSaveReceipt({ ...draft, imageUrl });
        setShowScanner(false);
      } finally {
        setIsSaving(false);
      }
    },
    [teamId, currentUser, staff, onSaveReceipt, lang, storageScope]
  );

  const handleValidate = async (receipt: ExpenseReceipt) => {
    if (!onSaveBudgetItem) return;
    setIsSaving(true);
    try {
      const validated: ExpenseReceipt = {
        ...receipt,
        status: ExpenseReceiptStatus.VALIDATED,
        validatedAt: new Date().toISOString(),
        validatedByUserId: currentUser.id,
      };
      const { receipt: synced, budgetItem } = syncReceiptToBudgetItem(validated, receipt.budgetItemId);
      await onSaveBudgetItem(budgetItem);
      await onSaveReceipt(synced);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportExpenseReceiptsPdf(filtered, {
        teamName,
        raceEvents,
        locale,
        eventId: filterEventId !== 'all' ? filterEventId : undefined,
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!canScan && !canManage) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
        {t('receiptNoAccess')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('receiptTitle')}</h3>
          {!compact && <p className="text-sm text-gray-500">{t('receiptDesc')}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {canScan && !showScanner && (
            <ActionButton size="sm" onClick={() => setShowScanner(true)} disabled={isSaving}>
              {t('receiptScanButton')}
            </ActionButton>
          )}
          {canManage && filtered.length > 0 && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => void handleExportPdf()}
              disabled={isExporting}
            >
              {isExporting ? t('receiptExporting') : t('receiptExportPdf')}
            </ActionButton>
          )}
        </div>
      </div>

      {showScanner && canScan && (
        <ReceiptScanner
          raceEvents={raceEvents}
          transportLegs={transportLegs}
          defaultEventId={defaultEventId}
          defaultTransportLegId={defaultTransportLegId}
          onScanComplete={(r) => void handleScanComplete(r)}
          onCancel={() => setShowScanner(false)}
        />
      )}

      {canManage && (
        <div className="flex flex-wrap gap-3">
          <select
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="all">{t('receiptAllEvents')}</option>
            {raceEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="all">{t('receiptAllStatuses')}</option>
            {Object.values(ExpenseReceiptStatus).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          {t('receiptEmpty')}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {filtered.map((receipt) => (
            <li key={receipt.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <MediaThumb
                src={receipt.imageUrl}
                href={isDisplayableImageUrl(receipt.imageUrl) ? receipt.imageUrl : undefined}
                alt={receipt.merchant || receipt.description || 'Justificatif'}
                className="h-20 w-20 rounded-md border object-cover bg-gray-50"
                fallbackClassName="h-20 w-20 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {receipt.merchant || receipt.description}
                  </span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{receipt.status}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {formatFinancialAmount(receipt.amount, locale)} · {formatFinancialDate(receipt.receiptDate, locale)}
                </p>
                <p className="text-xs text-gray-500">
                  {receipt.accountingCode} — {receipt.accountingLabel}
                  {receipt.submittedByName && ` · ${receipt.submittedByName}`}
                </p>
              </div>
              {canManage && receipt.status === ExpenseReceiptStatus.SUBMITTED && onSaveBudgetItem && (
                <ActionButton
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleValidate(receipt)}
                  disabled={isSaving}
                >
                  {t('receiptValidate')}
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ExpenseReceiptsPanel;
