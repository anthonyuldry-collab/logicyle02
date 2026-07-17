import React, { useMemo, useState } from 'react';
import { ClientRecord, Quote, QuoteStatus, TeamInvoiceSettings } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import { formatFinancialAmount } from '../../utils/financialUtils';
import {
  enrichQuote,
  formatQuoteNumber,
  convertQuoteToInvoice,
  getNextQuoteSequence,
} from '../../utils/quoteUtils';
import { IncomeItem } from '../../types';

interface FinancialQuotesTabProps {
  quotes: Quote[];
  clients: ClientRecord[];
  invoiceSettings?: TeamInvoiceSettings;
  teamName: string;
  canEdit: boolean;
  onSaveQuote: (quote: Quote) => Promise<void>;
  onDeleteQuote: (quote: Quote) => Promise<void>;
  onConvertToInvoice: (quote: Quote, income: IncomeItem, settings: TeamInvoiceSettings) => Promise<void>;
  onSaveInvoiceSettings?: (settings: TeamInvoiceSettings) => Promise<void>;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };
const STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'converted'];

const emptyQuote = (): Quote => ({
  id: crypto.randomUUID(),
  quoteNumber: '',
  clientName: '',
  description: '',
  amount: 0,
  vatRate: 20,
  amountHT: 0,
  status: 'draft',
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  createdAt: new Date().toISOString(),
});

const FinancialQuotesTab: React.FC<FinancialQuotesTabProps> = ({
  quotes,
  clients,
  invoiceSettings,
  teamName,
  canEdit,
  onSaveQuote,
  onDeleteQuote,
  onConvertToInvoice,
  onSaveInvoiceSettings,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Quote>(emptyQuote());
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const settings = invoiceSettings || {
    issuerName: teamName,
    nextInvoiceNumber: 1,
    nextQuoteNumber: 1,
    invoicePrefix: 'FAC',
    defaultVatRate: 20,
  };

  const sorted = useMemo(
    () => [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [quotes]
  );

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 5000);
  };

  const openNew = () => {
    const next = getNextQuoteSequence(settings, quotes);
    setDraft(
      enrichQuote({
        ...emptyQuote(),
        quoteNumber: formatQuoteNumber(settings, next),
        vatRate: settings.defaultVatRate ?? 20,
      })
    );
    setEditing(false);
    setModalOpen(true);
  };

  const openEdit = (q: Quote) => {
    setDraft(q);
    setEditing(true);
    setModalOpen(true);
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      setDraft((d) => ({ ...d, clientId: undefined, clientName: '' }));
      return;
    }
    setDraft((d) => ({
      ...d,
      clientId: client.id,
      clientName: client.companyName,
    }));
  };

  const handleSave = async () => {
    if (!draft.clientName.trim()) {
      showFeedback(t('quoteErrorClient'));
      return;
    }
    if (draft.amount <= 0) {
      showFeedback(t('quoteErrorAmount'));
      return;
    }
    setSaving(true);
    try {
      const enriched = enrichQuote(draft);
      await onSaveQuote(enriched);
      if (!editing && onSaveInvoiceSettings) {
        const seq = getNextQuoteSequence(settings, quotes);
        await onSaveInvoiceSettings({
          ...settings,
          nextQuoteNumber: seq + 1,
        });
      }
      setModalOpen(false);
      showFeedback(t('quoteSaved'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async (q: Quote) => {
    if (q.status === 'sent') {
      const ok = window.confirm(t('quoteConvertSentConfirm'));
      if (!ok) return;
    }
    if (!window.confirm(t('quoteConvertConfirm').replace('{number}', q.quoteNumber))) return;
    try {
      const { quote, income, settings: nextSettings } = convertQuoteToInvoice(q, settings, language);
      await onConvertToInvoice(quote, income, nextSettings);
      showFeedback(
        t('quoteConvertSuccess').replace('{invoice}', income.invoiceNumber || '')
      );
    } catch {
      showFeedback(t('financialSaveError'));
    }
  };

  const handleDelete = async (q: Quote) => {
    if (!window.confirm(t('quoteDeleteConfirm').replace('{number}', q.quoteNumber))) return;
    await onDeleteQuote(q);
    showFeedback(t('quoteDeleted'));
  };

  const statusLabel = (s: QuoteStatus) => {
    const map: Record<QuoteStatus, string> = {
      draft: t('quoteStatusDraft'),
      sent: t('quoteStatusSent'),
      accepted: t('quoteStatusAccepted'),
      rejected: t('quoteStatusRejected'),
      converted: t('quoteStatusConverted'),
    };
    return map[s];
  };

  const draftAmountHT = useMemo(
    () => enrichQuote(draft).amountHT,
    [draft.amount, draft.vatRate]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('quotesTitle')}</h3>
          <p className="text-sm text-gray-500">{t('quotesDesc')}</p>
        </div>
        {canEdit && (
          <ActionButton variant="primary" size="sm" onClick={openNew}>
            {t('quoteAdd')}
          </ActionButton>
        )}
      </div>

      {feedback && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {feedback}
        </div>
      )}

      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        {t('quoteConvertHint')}
      </div>

      <div className="table-container rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t('quoteNumber')}</th>
              <th className="px-3 py-2 text-left">{t('quoteClient')}</th>
              <th className="px-3 py-2 text-left">{t('quoteDescription')}</th>
              <th className="px-3 py-2 text-right">{t('quoteAmount')}</th>
              <th className="px-3 py-2 text-left">{t('quoteStatus')}</th>
              <th className="px-3 py-2 text-right">{t('financialActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">{t('quotesEmpty')}</td>
              </tr>
            )}
            {sorted.map((q) => (
              <tr key={q.id}>
                <td className="px-3 py-2 font-medium">{q.quoteNumber}</td>
                <td className="px-3 py-2">{q.clientName}</td>
                <td className="px-3 py-2">{q.description}</td>
                <td className="px-3 py-2 text-right">{formatFinancialAmount(q.amount, locale)}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{statusLabel(q.status)}</span>
                  {q.status === 'converted' && q.convertedInvoiceId && (
                    <p className="mt-0.5 text-[10px] text-gray-500">{t('quoteLinkedInvoice')}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  {canEdit && q.status !== 'converted' && (
                    <>
                      <button type="button" className="text-indigo-600 text-xs hover:underline" onClick={() => openEdit(q)}>
                        {t('financialEdit')}
                      </button>
                      {(q.status === 'accepted' || q.status === 'sent') && (
                        <button type="button" className="text-green-700 text-xs hover:underline" onClick={() => handleConvert(q)}>
                          {t('quoteConvert')}
                        </button>
                      )}
                      <button type="button" className="text-red-600 text-xs hover:underline" onClick={() => handleDelete(q)}>
                        {t('financialDelete')}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('quoteEdit') : t('quoteAdd')}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">{t('quoteClient')}</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={draft.clientId || ''}
              onChange={(e) => handleClientSelect(e.target.value)}
            >
              <option value="">{t('quoteSelectClient')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">{t('quoteNoClientsHint')}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">{t('quoteDescription')}</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t('quoteAmount')}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('quoteVatRate')}</label>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={draft.vatRate}
                onChange={(e) => setDraft({ ...draft, vatRate: Number(e.target.value) })}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {t('quoteAmountHT')}: {formatFinancialAmount(draftAmountHT, locale)}
          </p>
          <div>
            <label className="text-sm font-medium">{t('quoteValidUntil')}</label>
            <input
              type="date"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={draft.validUntil}
              onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t('quoteStatus')}</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as QuoteStatus })}
            >
              {STATUSES.filter((s) => s !== 'converted').map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionButton variant="secondary" onClick={() => setModalOpen(false)}>{t('financialCancel')}</ActionButton>
            <ActionButton variant="primary" onClick={handleSave} disabled={saving}>{t('financialSave')}</ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinancialQuotesTab;
