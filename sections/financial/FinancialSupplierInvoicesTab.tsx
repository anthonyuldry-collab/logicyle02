import React, { useMemo, useState } from 'react';
import { SupplierInvoice } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import {
  createSupplierInvoiceDraft,
  markSupplierInvoicePaid,
  summarizeSupplierInvoices,
  validateSupplierInvoice,
} from '../../utils/supplierInvoiceUtils';
import { formatFinancialAmount, formatFinancialDate } from '../../utils/financialUtils';

interface FinancialSupplierInvoicesTabProps {
  invoices: SupplierInvoice[];
  canEdit: boolean;
  onSave: (invoice: SupplierInvoice) => Promise<void>;
  onDelete: (invoice: SupplierInvoice) => Promise<void>;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const FinancialSupplierInvoicesTab: React.FC<FinancialSupplierInvoicesTabProps> = ({
  invoices,
  canEdit,
  onSave,
  onDelete,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<SupplierInvoice>(
    createSupplierInvoiceDraft({ supplierName: '', amountTTC: 0 })
  );

  const summary = useMemo(() => summarizeSupplierInvoices(invoices), [invoices]);

  const openNew = () => {
    setDraft(createSupplierInvoiceDraft({ supplierName: '', amountTTC: 0 }));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!draft.supplierName.trim() || draft.amountTTC <= 0) return;
    await onSave(draft);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('supplierInvoicesTitle')}</h3>
          <p className="text-sm text-gray-500">{t('supplierInvoicesDesc')}</p>
        </div>
        {canEdit && (
          <ActionButton variant="primary" size="sm" onClick={openNew}>
            {t('supplierInvoicesAdd')}
          </ActionButton>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Kpi label={t('supplierStatusReceived')} value={summary.byStatus.received} />
        <Kpi label={t('supplierStatusValidated')} value={summary.byStatus.validated} />
        <Kpi label={t('supplierStatusPaid')} value={summary.byStatus.paid} />
        <Kpi label={t('supplierOverdue')} value={summary.overdue} alert={summary.overdue > 0} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t('supplierName')}</th>
              <th className="px-3 py-2 text-left">{t('supplierInvoiceNumber')}</th>
              <th className="px-3 py-2 text-left">{t('supplierDueDate')}</th>
              <th className="px-3 py-2 text-right">{t('supplierAmount')}</th>
              <th className="px-3 py-2 text-left">{t('supplierStatus')}</th>
              <th className="px-3 py-2 text-right">{t('financialActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="px-3 py-2">{inv.supplierName}</td>
                <td className="px-3 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                <td className="px-3 py-2">{formatFinancialDate(inv.dueDate, locale)}</td>
                <td className="px-3 py-2 text-right">{formatFinancialAmount(inv.amountTTC, locale)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={inv.status} t={t} />
                </td>
                <td className="px-3 py-2 text-right space-x-1">
                  {canEdit && inv.status === 'received' && (
                    <ActionButton size="sm" variant="secondary" onClick={() => onSave(validateSupplierInvoice(inv))}>
                      {t('supplierValidate')}
                    </ActionButton>
                  )}
                  {canEdit && inv.status === 'validated' && (
                    <ActionButton size="sm" variant="primary" onClick={() => onSave(markSupplierInvoicePaid(inv))}>
                      {t('supplierMarkPaid')}
                    </ActionButton>
                  )}
                  {canEdit && (
                    <ActionButton size="sm" variant="danger" onClick={() => onDelete(inv)}>
                      {t('financialDelete')}
                    </ActionButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('supplierInvoicesAdd')}>
        <div className="space-y-3">
          <Input label={t('supplierName')} value={draft.supplierName} onChange={(v) => setDraft({ ...draft, supplierName: v })} />
          <Input label={t('supplierInvoiceNumber')} value={draft.invoiceNumber} onChange={(v) => setDraft({ ...draft, invoiceNumber: v })} />
          <Input label={t('supplierAmount')} type="number" value={String(draft.amountTTC)} onChange={(v) => setDraft({ ...draft, amountTTC: Number(v) })} />
          <Input label={t('supplierDueDate')} type="date" value={draft.dueDate} onChange={(v) => setDraft({ ...draft, dueDate: v })} />
          <div className="flex justify-end gap-2">
            <ActionButton variant="secondary" onClick={() => setModalOpen(false)}>{t('financialCancel')}</ActionButton>
            <ActionButton variant="primary" onClick={handleSave}>{t('financialSave')}</ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

function Kpi({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${alert ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const colors: Record<string, string> = {
    received: 'bg-gray-100 text-gray-800',
    validated: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.received}`}>
      {t(`supplierStatus_${status}`)}
    </span>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
    </div>
  );
}

export default FinancialSupplierInvoicesTab;
