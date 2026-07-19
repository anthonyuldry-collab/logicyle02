import React, { useMemo, useState } from 'react';
import { useFeedbackTimeout } from '../../hooks/useFeedbackTimeout';
import { ClientRecord, IncomeItem } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import { buildClientFromIncome, getClientOutstanding, searchClients } from '../../utils/clientUtils';
import { formatFinancialAmount } from '../../utils/financialUtils';
import { validateIban } from '../../utils/sepaUtils';
import { generateId } from '../../utils/themeUtils';

interface FinancialClientsTabProps {
  clients: ClientRecord[];
  incomeItems: IncomeItem[];
  canEdit: boolean;
  onSaveClient: (client: ClientRecord) => Promise<void>;
  onDeleteClient: (client: ClientRecord) => Promise<void>;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const emptyClient = (): ClientRecord => ({
  id: generateId(),
  companyName: '',
  createdAt: new Date().toISOString(),
  paymentTermsDays: 30,
});

const FinancialClientsTab: React.FC<FinancialClientsTabProps> = ({
  clients,
  incomeItems,
  canEdit,
  onSaveClient,
  onDeleteClient,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<ClientRecord>(emptyClient());
  const { feedback, showFeedback } = useFeedbackTimeout(4000);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => searchClients(clients, search), [clients, search]);

  const openNew = () => {
    setDraft(emptyClient());
    setModalOpen(true);
  };

  const openEdit = (client: ClientRecord) => {
    setDraft({ ...client, paymentTermsDays: client.paymentTermsDays ?? 30 });
    setModalOpen(true);
  };

  const importFromIncome = (income: IncomeItem) => {
    const base = buildClientFromIncome(income);
    setDraft({
      id: generateId(),
      ...base,
      createdAt: new Date().toISOString(),
      paymentTermsDays: 30,
    });
    setModalOpen(true);
  };

  const unlinkedIncomes = useMemo(
    () => incomeItems.filter((i) => !i.clientId && (i.clientName || i.sponsorCompanyName)),
    [incomeItems]
  );

  const handleSave = async () => {
    if (!draft.companyName.trim()) {
      showFeedback(t('clientsErrorName'));
      return;
    }
    setSaving(true);
    try {
      await onSaveClient({
        ...draft,
        companyName: draft.companyName.trim(),
        paymentTermsDays: draft.paymentTermsDays ?? 30,
      });
      setModalOpen(false);
      showFeedback(t('clientsSaved'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('clientsTitle')}</h3>
          <p className="text-sm text-gray-500">{t('clientsDesc')}</p>
        </div>
        {canEdit && (
          <ActionButton variant="primary" size="sm" onClick={openNew}>
            {t('clientsAdd')}
          </ActionButton>
        )}
      </div>

      {feedback && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {feedback}
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('financialSearch')}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      {unlinkedIncomes.length > 0 && canEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-900">{t('clientsImportHint')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unlinkedIncomes.slice(0, 5).map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => importFromIncome(i)}
                className="rounded bg-white px-2 py-1 text-xs border border-amber-300 hover:bg-amber-100"
              >
                {i.clientName || i.sponsorCompanyName}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/20 bg-slate-900/50 p-8 text-center">
          <p className="text-sm text-slate-300">{t('clientsEmpty')}</p>
          {canEdit && (
            <div className="mt-4">
              <ActionButton variant="primary" size="sm" onClick={openNew}>
                {t('clientsAdd')}
              </ActionButton>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">{t('clientsCompany')}</th>
                <th className="px-3 py-2 text-left">{t('clientsContact')}</th>
                <th className="px-3 py-2 text-left">{t('clientsEmail')}</th>
                <th className="px-3 py-2 text-center">{t('clientsPaymentTerms')}</th>
                <th className="px-3 py-2 text-center">{t('clientsIban')}</th>
                <th className="px-3 py-2 text-right">{t('clientsOutstanding')}</th>
                <th className="px-3 py-2 text-right">{t('financialActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">{c.companyName}</td>
                  <td className="px-3 py-2">{c.contactName || '—'}</td>
                  <td className="px-3 py-2">{c.email || '—'}</td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {c.paymentTermsDays ?? 30} j
                  </td>
                  <td className="px-3 py-2 text-center">
                    {c.iban && validateIban(c.iban) ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-800">
                        {t('clientsIbanOk')}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
                        {t('clientsIbanMissing')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatFinancialAmount(getClientOutstanding(incomeItems, c.id), locale)}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    {canEdit && (
                      <>
                        <ActionButton size="sm" variant="secondary" onClick={() => openEdit(c)}>
                          {t('financialEdit')}
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            if (!window.confirm(t('clientsDeleteConfirm'))) return;
                            await onDeleteClient(c);
                          }}
                        >
                          {t('financialDelete')}
                        </ActionButton>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('clientsFormTitle')}>
        <div className="space-y-3">
          <Field
            label={t('clientsCompany')}
            value={draft.companyName}
            onChange={(v) => setDraft({ ...draft, companyName: v })}
          />
          <Field
            label={t('clientsContact')}
            value={draft.contactName || ''}
            onChange={(v) => setDraft({ ...draft, contactName: v })}
          />
          <Field
            label={t('clientsEmail')}
            value={draft.email || ''}
            onChange={(v) => setDraft({ ...draft, email: v })}
          />
          <Field
            label={t('clientsPhone')}
            value={draft.phone || ''}
            onChange={(v) => setDraft({ ...draft, phone: v })}
          />
          <Field
            label={t('invoiceClientAddress')}
            value={draft.address || ''}
            onChange={(v) => setDraft({ ...draft, address: v })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={t('clientsSiret')}
              value={draft.siret || ''}
              onChange={(v) => setDraft({ ...draft, siret: v })}
            />
            <Field
              label={t('clientsVat')}
              value={draft.vatNumber || ''}
              onChange={(v) => setDraft({ ...draft, vatNumber: v })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('clientsPaymentTerms')}
            </label>
            <input
              type="number"
              min={0}
              max={365}
              value={draft.paymentTermsDays ?? 30}
              onChange={(e) =>
                setDraft({ ...draft, paymentTermsDays: parseInt(e.target.value, 10) || 0 })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
            />
          </div>
          <Field
            label={t('clientsIban')}
            value={draft.iban || ''}
            onChange={(v) => setDraft({ ...draft, iban: v })}
            mono
            hint={t('clientsIbanHint')}
          />
          <div className="flex justify-end gap-2 pt-2">
            <ActionButton variant="secondary" onClick={() => setModalOpen(false)}>
              {t('financialCancel')}
            </ActionButton>
            <ActionButton variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? '…' : t('financialSave')}
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

function Field({
  label,
  value,
  onChange,
  mono,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${mono ? 'font-mono' : ''}`}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default FinancialClientsTab;
