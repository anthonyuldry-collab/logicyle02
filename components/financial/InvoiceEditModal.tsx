import React, { useEffect, useMemo, useState } from 'react';
import {
  ClientRecord,
  IncomeCategory,
  IncomeItem,
  InvoiceStatus,
  TeamInvoiceSettings,
} from '../../types';
import Modal from '../Modal';
import ActionButton from '../ActionButton';
import { useTranslations } from '../../hooks/useTranslations';
import {
  computeDueDate,
  computeInvoiceAmounts,
  getInvoiceStatusLabel,
  isInvoiceLocked,
  resolveInvoiceDueDate,
  updateInvoiceFields,
} from '../../utils/invoiceUtils';
import { resolveIncomeAccountingCode } from '../../constants/accountingCodes';
import { formatFinancialAmount } from '../../utils/financialUtils';

interface InvoiceEditModalProps {
  item: IncomeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: IncomeItem) => Promise<void>;
  clients?: ClientRecord[];
  invoiceSettings?: TeamInvoiceSettings;
  canEdit: boolean;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };
const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-600';

const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  clients = [],
  invoiceSettings,
  canEdit,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const [draft, setDraft] = useState<IncomeItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item || !isOpen) {
      setDraft(null);
      setError(null);
      return;
    }
    const terms = item.paymentTermsDays ?? 30;
    setDraft({
      ...item,
      paymentTermsDays: terms,
      dueDate: item.dueDate || resolveInvoiceDueDate(item, terms),
      vatRate: item.vatRate ?? invoiceSettings?.defaultVatRate ?? 0,
      clientName: item.clientName || item.sponsorshipContactName || '',
    });
  }, [item, isOpen, invoiceSettings?.defaultVatRate]);

  const locked = item ? isInvoiceLocked(item) : true;
  const readOnly = !canEdit || locked;

  const amounts = useMemo(() => {
    if (!draft) return { amountHT: 0, vatAmount: 0, amountTTC: 0 };
    return computeInvoiceAmounts(draft.amount || 0, draft.vatRate ?? 0);
  }, [draft]);

  const accounting = useMemo(() => {
    if (!draft) return null;
    return resolveIncomeAccountingCode(draft.category, language);
  }, [draft, language]);

  const applyClient = (clientId: string) => {
    if (!draft) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      setDraft({ ...draft, clientId: undefined });
      return;
    }
    const terms = client.paymentTermsDays ?? draft.paymentTermsDays ?? 30;
    const issueBase = (draft.issuedAt || draft.date || '').slice(0, 10);
    setDraft({
      ...draft,
      clientId: client.id,
      clientName: client.companyName,
      clientAddress: client.address || draft.clientAddress,
      clientVatNumber: client.vatNumber || draft.clientVatNumber,
      paymentTermsDays: terms,
      dueDate: computeDueDate(issueBase, terms),
      sponsorshipContactName: client.contactName || draft.sponsorshipContactName,
      sponsorshipContactEmail: client.email || draft.sponsorshipContactEmail,
      sponsorshipContactPhone: client.phone || draft.sponsorshipContactPhone,
    });
  };

  const handleSave = async () => {
    if (!draft || !item || readOnly) return;
    if (!draft.description?.trim()) {
      setError(t('invoiceEditErrorDescription'));
      return;
    }
    if (!(draft.amount > 0)) {
      setError(t('invoiceEditErrorAmount'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = updateInvoiceFields(
        item,
        {
          description: draft.description,
          amount: draft.amount,
          date: draft.date,
          category: draft.category,
          notes: draft.notes,
          clientId: draft.clientId,
          clientName: draft.clientName,
          clientAddress: draft.clientAddress,
          clientVatNumber: draft.clientVatNumber,
          vatRate: draft.vatRate,
          dueDate: draft.dueDate,
          paymentTermsDays: draft.paymentTermsDays,
          sponsorshipContactName: draft.sponsorshipContactName,
          sponsorshipContactEmail: draft.sponsorshipContactEmail,
          sponsorshipContactPhone: draft.sponsorshipContactPhone,
        },
        language,
        invoiceSettings?.defaultVatRate
      );
      await onSave(updated);
      onClose();
    } catch {
      setError(t('financialSaveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const status = draft?.invoiceStatus || InvoiceStatus.DRAFT;
  const title = draft?.invoiceNumber
    ? `${t('invoiceEditTitle')} ${draft.invoiceNumber}`
    : t('invoiceEditTitleDraft');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {!draft ? (
        <div className="py-8 text-center text-sm text-gray-500">…</div>
      ) : (
      <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
            {getInvoiceStatusLabel(status, language)}
          </span>
          {accounting && (
            <span className="font-mono text-gray-600">
              {accounting.code} — {accounting.label}
            </span>
          )}
          {locked && (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
              {t('invoiceEditLocked')}
            </span>
          )}
        </div>

        {status === InvoiceStatus.ISSUED && !locked && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {t('invoiceEditIssuedWarning')}
          </p>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('formDate')}>
            <input
              type="date"
              value={draft.date}
              disabled={readOnly}
              onChange={(e) => {
                const date = e.target.value;
                const terms = draft.paymentTermsDays ?? 30;
                setDraft({
                  ...draft,
                  date,
                  dueDate: draft.issuedAt ? draft.dueDate : computeDueDate(date, terms),
                });
              }}
              className={inputClass}
            />
          </Field>
          <Field label={t('invoiceDueDate')}>
            <input
              type="date"
              value={draft.dueDate || ''}
              disabled={readOnly}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('invoicePaymentTerms')}>
            <input
              type="number"
              min={0}
              max={365}
              value={draft.paymentTermsDays ?? 30}
              disabled={readOnly}
              onChange={(e) => {
                const days = parseInt(e.target.value, 10) || 0;
                const issueBase = (draft.issuedAt || draft.date || '').slice(0, 10);
                setDraft({
                  ...draft,
                  paymentTermsDays: days,
                  dueDate: computeDueDate(issueBase, days),
                });
              }}
              className={inputClass}
            />
          </Field>
          <Field label={t('formCategory')}>
            <select
              value={draft.category}
              disabled={readOnly}
              onChange={(e) =>
                setDraft({ ...draft, category: e.target.value as IncomeCategory })
              }
              className={inputClass}
            >
              {Object.values(IncomeCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t('formDescription')}>
          <input
            type="text"
            value={draft.description}
            disabled={readOnly}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t('invoiceAmountTTC')}>
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.amount}
              disabled={readOnly}
              onChange={(e) =>
                setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })
              }
              className={inputClass}
            />
          </Field>
          <Field label={t('invoiceVatRate')}>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={draft.vatRate ?? 0}
              disabled={readOnly}
              onChange={(e) =>
                setDraft({ ...draft, vatRate: parseFloat(e.target.value) || 0 })
              }
              className={inputClass}
            />
          </Field>
          <Field label={t('invoiceAmountHT')}>
            <div className={`${inputClass} bg-gray-50 font-medium tabular-nums`}>
              {formatFinancialAmount(amounts.amountHT, locale)}
            </div>
          </Field>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div className="flex justify-between gap-2">
            <span>{t('invoiceVatAmount')}</span>
            <span className="font-medium tabular-nums">
              {formatFinancialAmount(amounts.vatAmount, locale)}
            </span>
          </div>
          <div className="mt-1 flex justify-between gap-2 border-t border-slate-200 pt-1 font-semibold">
            <span>{t('invoiceAmountTTC')}</span>
            <span className="tabular-nums">
              {formatFinancialAmount(amounts.amountTTC, locale)}
            </span>
          </div>
        </div>

        {clients.length > 0 && (
          <Field label={t('invoiceSelectClient')}>
            <select
              value={draft.clientId || ''}
              disabled={readOnly}
              onChange={(e) => applyClient(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('invoiceNoClient')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('invoiceClient')}>
            <input
              type="text"
              value={draft.clientName || ''}
              disabled={readOnly}
              onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={t('invoiceClientVat')}>
            <input
              type="text"
              value={draft.clientVatNumber || ''}
              disabled={readOnly}
              onChange={(e) => setDraft({ ...draft, clientVatNumber: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={t('invoiceClientAddress')}>
          <textarea
            rows={2}
            value={draft.clientAddress || ''}
            disabled={readOnly}
            onChange={(e) => setDraft({ ...draft, clientAddress: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label={t('formNotes')}>
          <textarea
            rows={2}
            value={draft.notes || ''}
            disabled={readOnly}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            className={inputClass}
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <ActionButton variant="secondary" size="sm" onClick={onClose}>
            {t('formCancel')}
          </ActionButton>
          {!readOnly && (
            <ActionButton size="sm" onClick={handleSave} disabled={saving}>
              {saving ? '…' : t('formSave')}
            </ActionButton>
          )}
        </div>
      </div>
      )}
    </Modal>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

export default InvoiceEditModal;
