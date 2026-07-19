import React, { useEffect, useMemo, useState } from 'react';
import {
  IncomeItem,
  SponsorshipContractTerms,
  SponsorshipExclusivityMode,
  SponsorshipImageRightsScope,
  SponsorshipPaymentSchedule,
  TeamInvoiceSettings,
} from '../../types';
import Modal from '../Modal';
import ActionButton from '../ActionButton';
import { useTranslations } from '../../hooks/useTranslations';
import {
  buildPartnershipConventionData,
  getDefaultSponsorshipContractTerms,
  suggestPartnershipCounterparts,
} from '../../utils/partnershipDocumentUtils';
import { buildConventionArticles } from '../../utils/partnershipLegalContent';
import { formatFinancialAmount } from '../../utils/financialUtils';
import PartnershipCounterpartsEditor from './PartnershipCounterpartsEditor';

type DraftTab = 'parties' | 'finance' | 'counterparts' | 'clauses' | 'preview';

interface SponsorshipContractDraftModalProps {
  item: IncomeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: IncomeItem) => Promise<void>;
  invoiceSettings: TeamInvoiceSettings;
  teamName: string;
  canEdit: boolean;
  /** Onglet affiché à l'ouverture (ex. contreparties). */
  initialTab?: DraftTab;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };
const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-60';

const SponsorshipContractDraftModal: React.FC<SponsorshipContractDraftModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  invoiceSettings,
  teamName,
  canEdit,
  initialTab = 'parties',
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const [tab, setTab] = useState<DraftTab>(initialTab);
  const [draft, setDraft] = useState<IncomeItem | null>(null);
  const [terms, setTerms] = useState<SponsorshipContractTerms>(getDefaultSponsorshipContractTerms());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item || !isOpen) {
      setDraft(null);
      setError(null);
      setTab(initialTab);
      return;
    }
    setDraft({ ...item });
    setTerms({
      ...getDefaultSponsorshipContractTerms(),
      ...item.sponsorshipContractTerms,
    });
    setTab(initialTab);
  }, [item, isOpen, initialTab]);

  const previewArticles = useMemo(() => {
    if (!draft) return [];
    const data = buildPartnershipConventionData(
      { ...draft, sponsorshipContractTerms: terms },
      invoiceSettings,
      teamName
    );
    return buildConventionArticles(data, draft.category, locale);
  }, [draft, terms, invoiceSettings, teamName, locale]);

  const checklist = useMemo(() => {
    if (!draft) return [];
    return [
      {
        ok: Boolean(draft.sponsorCompanyName || draft.clientName || draft.sponsorshipContactName),
        label: t('contractDraftCheckPartner'),
      },
      {
        ok: Boolean(draft.sponsorshipContractStart && draft.sponsorshipContractEnd),
        label: t('contractDraftCheckDates'),
      },
      { ok: (draft.amount || 0) > 0, label: t('contractDraftCheckAmount') },
      {
        ok:
          Boolean(draft.partnershipCounterparts?.trim()) ||
          (draft.partnershipDeliverables?.length ?? 0) > 0,
        label: t('contractDraftCheckCounterparts'),
      },
      {
        ok:
          terms.exclusivityMode === 'none' ||
          Boolean(terms.exclusivitySector?.trim() || terms.exclusivityTerritory?.trim()),
        label: t('contractDraftCheckExclusivity'),
      },
      {
        ok: Boolean(invoiceSettings.legalRepresentative?.trim()),
        label: t('contractDraftCheckRep'),
      },
    ];
  }, [draft, terms, invoiceSettings.legalRepresentative, t]);

  const updateTerms = <K extends keyof SponsorshipContractTerms>(
    key: K,
    value: SponsorshipContractTerms[K]
  ) => {
    setTerms((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!draft || !canEdit) return;
    if (!(draft.amount > 0) || !draft.description?.trim()) {
      setError(t('contractDraftErrorRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...draft,
        sponsorshipContractTerms: terms,
        partnershipDeliverables: draft.partnershipDeliverables,
        partnershipCounterparts:
          draft.partnershipCounterparts || suggestPartnershipCounterparts(draft.category),
      });
      onClose();
    } catch {
      setError(t('financialSaveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !draft) return null;

  const tabs: { id: DraftTab; label: string }[] = [
    { id: 'parties', label: t('contractDraftTabParties') },
    { id: 'finance', label: t('contractDraftTabFinance') },
    { id: 'counterparts', label: t('contractDraftTabCounterparts') },
    { id: 'clauses', label: t('contractDraftTabClauses') },
    { id: 'preview', label: t('contractDraftTabPreview') },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('contractDraftTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">{t('contractDraftDesc')}</p>

        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-slate-950/50 p-1">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                tab === tabItem.id
                  ? 'bg-indigo-500/30 text-indigo-100'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
          {tab === 'parties' && (
            <div className="space-y-3">
              <Field label={t('formDescription')}>
                <input
                  className={inputClass}
                  disabled={!canEdit}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('partnershipCompanyName')}>
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={draft.sponsorCompanyName || ''}
                    onChange={(e) => setDraft({ ...draft, sponsorCompanyName: e.target.value })}
                  />
                </Field>
                <Field label={t('partnershipLegalForm')}>
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={draft.sponsorLegalForm || ''}
                    onChange={(e) => setDraft({ ...draft, sponsorLegalForm: e.target.value })}
                    placeholder="SAS, SARL, SA…"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="SIRET">
                  <input
                    className={`${inputClass} font-mono`}
                    disabled={!canEdit}
                    value={draft.sponsorSiret || ''}
                    onChange={(e) => setDraft({ ...draft, sponsorSiret: e.target.value })}
                  />
                </Field>
                <Field label={t('partnershipRepresentative')}>
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={draft.sponsorRepresentative || ''}
                    onChange={(e) => setDraft({ ...draft, sponsorRepresentative: e.target.value })}
                  />
                </Field>
              </div>
              <Field label={t('invoiceClientAddress')}>
                <textarea
                  rows={2}
                  className={inputClass}
                  disabled={!canEdit}
                  value={draft.clientAddress || ''}
                  onChange={(e) => setDraft({ ...draft, clientAddress: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label={t('formContact')}>
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={draft.sponsorshipContactName || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, sponsorshipContactName: e.target.value })
                    }
                  />
                </Field>
                <Field label={t('formEmail')}>
                  <input
                    type="email"
                    className={inputClass}
                    disabled={!canEdit}
                    value={draft.sponsorshipContactEmail || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, sponsorshipContactEmail: e.target.value })
                    }
                  />
                </Field>
                <Field label={t('formPhone')}>
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={draft.sponsorshipContactPhone || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, sponsorshipContactPhone: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
          )}

          {tab === 'finance' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label={t('formAmount')}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                    disabled={!canEdit}
                    value={draft.amount}
                    onChange={(e) =>
                      setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label={t('formContractStart')}>
                  <input
                    type="date"
                    className={inputClass}
                    disabled={!canEdit}
                    value={draft.sponsorshipContractStart || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, sponsorshipContractStart: e.target.value })
                    }
                  />
                </Field>
                <Field label={t('formContractEnd')}>
                  <input
                    type="date"
                    className={inputClass}
                    disabled={!canEdit}
                    value={draft.sponsorshipContractEnd || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, sponsorshipContractEnd: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label={t('contractDraftPaymentSchedule')}>
                <select
                  className={inputClass}
                  disabled={!canEdit}
                  value={terms.paymentSchedule || '5050'}
                  onChange={(e) =>
                    updateTerms('paymentSchedule', e.target.value as SponsorshipPaymentSchedule)
                  }
                >
                  <option value="5050">{t('contractDraftPay5050')}</option>
                  <option value="full_signature">{t('contractDraftPayFull')}</option>
                  <option value="334">{t('contractDraftPay334')}</option>
                  <option value="custom">{t('contractDraftPayCustom')}</option>
                </select>
              </Field>
              {terms.paymentSchedule === 'custom' && (
                <Field label={t('contractDraftCustomPayment')}>
                  <textarea
                    rows={3}
                    className={inputClass}
                    disabled={!canEdit}
                    value={terms.customPaymentTerms || ''}
                    onChange={(e) => updateTerms('customPaymentTerms', e.target.value)}
                    placeholder={t('contractDraftCustomPaymentPh')}
                  />
                </Field>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('contractDraftLateDays')}>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    disabled={!canEdit}
                    value={terms.latePaymentDays ?? 30}
                    onChange={(e) =>
                      updateTerms('latePaymentDays', parseInt(e.target.value, 10) || 0)
                    }
                  />
                </Field>
                <Field label={t('contractDraftAutoRenewal')}>
                  <label className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={Boolean(terms.autoRenewal)}
                      onChange={(e) => updateTerms('autoRenewal', e.target.checked)}
                    />
                    {t('contractDraftAutoRenewalHint')}
                  </label>
                </Field>
              </div>
              {terms.autoRenewal && (
                <Field label={t('contractDraftRenewalNotice')}>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    disabled={!canEdit}
                    value={terms.renewalNoticeDays ?? 30}
                    onChange={(e) =>
                      updateTerms('renewalNoticeDays', parseInt(e.target.value, 10) || 30)
                    }
                  />
                </Field>
              )}
            </div>
          )}

          {tab === 'counterparts' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">{t('contractDraftCounterpartsHint')}</p>
              <PartnershipCounterpartsEditor
                items={draft.partnershipDeliverables || []}
                category={draft.category}
                canEdit={canEdit}
                variant="dark"
                onChange={(items, contractText) =>
                  setDraft({
                    ...draft,
                    partnershipDeliverables: items,
                    partnershipCounterparts: contractText || draft.partnershipCounterparts,
                  })
                }
              />
              <Field label={t('contractDraftAnnexVisibility')}>
                <textarea
                  rows={3}
                  className={inputClass}
                  disabled={!canEdit}
                  value={terms.annexVisibilityNotes || ''}
                  onChange={(e) => updateTerms('annexVisibilityNotes', e.target.value)}
                  placeholder={t('contractDraftAnnexVisibilityPh')}
                />
              </Field>
            </div>
          )}

          {tab === 'clauses' && (
            <div className="space-y-3">
              <Field label={t('contractDraftExclusivity')}>
                <select
                  className={inputClass}
                  disabled={!canEdit}
                  value={terms.exclusivityMode || 'none'}
                  onChange={(e) =>
                    updateTerms('exclusivityMode', e.target.value as SponsorshipExclusivityMode)
                  }
                >
                  <option value="none">{t('contractDraftExclNone')}</option>
                  <option value="sector">{t('contractDraftExclSector')}</option>
                  <option value="territorial">{t('contractDraftExclTerritory')}</option>
                  <option value="full">{t('contractDraftExclFull')}</option>
                </select>
              </Field>
              {(terms.exclusivityMode === 'sector' || terms.exclusivityMode === 'full') && (
                <Field label={t('contractDraftExclSectorField')}>
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={terms.exclusivitySector || ''}
                    onChange={(e) => updateTerms('exclusivitySector', e.target.value)}
                    placeholder={t('contractDraftExclSectorPh')}
                  />
                </Field>
              )}
              {(terms.exclusivityMode === 'territorial' ||
                terms.exclusivityMode === 'full' ||
                terms.exclusivityMode === 'sector') && (
                <Field label={t('contractDraftExclTerritoryField')}>
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={terms.exclusivityTerritory || ''}
                    onChange={(e) => updateTerms('exclusivityTerritory', e.target.value)}
                    placeholder={t('contractDraftExclTerritoryPh')}
                  />
                </Field>
              )}
              <Field label={t('contractDraftAnnexExclusivity')}>
                <textarea
                  rows={2}
                  className={inputClass}
                  disabled={!canEdit}
                  value={terms.annexExclusivityNotes || ''}
                  onChange={(e) => updateTerms('annexExclusivityNotes', e.target.value)}
                />
              </Field>

              <Field label={t('contractDraftImageRights')}>
                <select
                  className={inputClass}
                  disabled={!canEdit}
                  value={terms.imageRightsScope || 'external_free'}
                  onChange={(e) =>
                    updateTerms(
                      'imageRightsScope',
                      e.target.value as SponsorshipImageRightsScope
                    )
                  }
                >
                  <option value="internal">{t('contractDraftImageInternal')}</option>
                  <option value="external_free">{t('contractDraftImageExternal')}</option>
                  <option value="paid_ads_allowed">{t('contractDraftImagePaid')}</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={Boolean(terms.athleteImageAuthorized)}
                  onChange={(e) => updateTerms('athleteImageAuthorized', e.target.checked)}
                />
                {t('contractDraftAthleteImage')}
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('contractDraftNoticeDays')}>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    disabled={!canEdit}
                    value={terms.noticePeriodDays ?? 15}
                    onChange={(e) =>
                      updateTerms('noticePeriodDays', parseInt(e.target.value, 10) || 15)
                    }
                  />
                </Field>
                <Field label={t('contractDraftValidationDays')}>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    disabled={!canEdit}
                    value={terms.validationBusinessDays ?? 10}
                    onChange={(e) =>
                      updateTerms('validationBusinessDays', parseInt(e.target.value, 10) || 10)
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('contractDraftGoverningLaw')}>
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={terms.governingLaw || ''}
                    onChange={(e) => updateTerms('governingLaw', e.target.value)}
                  />
                </Field>
                <Field label={t('contractDraftJurisdiction')}>
                  <input
                    className={inputClass}
                    disabled={!canEdit}
                    value={terms.jurisdiction || ''}
                    onChange={(e) => updateTerms('jurisdiction', e.target.value)}
                  />
                </Field>
              </div>
              <Field label={t('contractDraftConfidentialityYears')}>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  disabled={!canEdit}
                  value={terms.confidentialityYears ?? 2}
                  onChange={(e) =>
                    updateTerms('confidentialityYears', parseInt(e.target.value, 10) || 2)
                  }
                />
              </Field>
              <Field label={t('contractDraftSpecialClauses')}>
                <textarea
                  rows={4}
                  className={inputClass}
                  disabled={!canEdit}
                  value={terms.specialClauses || ''}
                  onChange={(e) => updateTerms('specialClauses', e.target.value)}
                  placeholder={t('contractDraftSpecialClausesPh')}
                />
              </Field>
              <Field label={t('formNotes')}>
                <textarea
                  rows={2}
                  className={inputClass}
                  disabled={!canEdit}
                  value={draft.notes || ''}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </Field>
            </div>
          )}

          {tab === 'preview' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-indigo-400/30 bg-indigo-950/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                  {t('contractDraftChecklist')}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {checklist.map((c) => (
                    <li
                      key={c.label}
                      className={c.ok ? 'text-emerald-300' : 'text-amber-300'}
                    >
                      {c.ok ? '✓' : '○'} {c.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-200">
                <p className="font-medium text-white">
                  {draft.sponsorCompanyName || draft.clientName || '—'} ·{' '}
                  {formatFinancialAmount(draft.amount, locale)}
                </p>
                <p className="mt-1 text-xs text-slate-400">{draft.description}</p>
              </div>
              <div className="space-y-3">
                {previewArticles.map((article) => (
                  <div
                    key={article.number}
                    className="rounded-lg border border-white/10 bg-slate-900/60 p-3"
                  >
                    <h4 className="text-sm font-semibold text-indigo-200">
                      Article {article.number} — {article.title}
                    </h4>
                    <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                      {article.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">{t('contractDraftLegalDisclaimer')}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3">
          <ActionButton variant="secondary" size="sm" onClick={onClose}>
            {t('formCancel')}
          </ActionButton>
          <div className="flex gap-2">
            {tab !== 'preview' && (
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  const order: DraftTab[] = [
                    'parties',
                    'finance',
                    'counterparts',
                    'clauses',
                    'preview',
                  ];
                  const idx = order.indexOf(tab);
                  setTab(order[Math.min(idx + 1, order.length - 1)]);
                }}
              >
                {t('contractDraftNext')}
              </ActionButton>
            )}
            {canEdit && (
              <ActionButton size="sm" onClick={handleSave} disabled={saving}>
                {saving ? '…' : t('contractDraftSave')}
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">{label}</label>
      {children}
    </div>
  );
}

export default SponsorshipContractDraftModal;
