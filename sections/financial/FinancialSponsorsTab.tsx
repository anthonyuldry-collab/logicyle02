import React, { useEffect, useMemo, useState } from 'react';
import { useFeedbackTimeout } from '../../hooks/useFeedbackTimeout';
import { IncomeCategory, IncomeItem, PartnerAccess, TeamInvoiceSettings, User, PartnerMarketplaceProfile, TeamSponsorshipNeed, PartnershipMatchRequest, PartnershipMatchStatus } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import Modal from '../../components/Modal';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/icons';
import { formatFinancialAmount, formatFinancialDate, isSponsorshipIncome } from '../../utils/financialUtils';
import {
  isCerfaEligible,
  isConventionEligible,
  issueCerfaReceipt,
  issueConvention,
  getCerfaFormId,
  getConventionTitle,
} from '../../utils/partnershipDocumentUtils';
import { exportCerfaReceiptPdf, exportPartnershipConventionPdf } from '../../utils/partnershipPdfExport';
import { DEFAULT_INVOICE_SETTINGS } from '../../utils/invoiceUtils';
import {
  ALL_PARTNER_SCOPES,
  buildPartnerAccessFromIncome,
  getPartnerScopeLabel,
} from '../../utils/partnerAccessUtils';
import { DEMO_PARTNER_EMAIL, isDemoPartnerIncome } from '../../constants/demoPartnerPortal';
import TeamSponsorshipMarketplacePanel from '../../components/TeamSponsorshipMarketplacePanel';
import SponsorshipContractDraftModal from '../../components/financial/SponsorshipContractDraftModal';
import PartnershipCounterpartsEditor from '../../components/financial/PartnershipCounterpartsEditor';
import { PartnerNewsletter, PartnerScope, RaceEvent, Rider, PartnerCounterpartDeliverable } from '../../types';
import { formatDeliverablesAsContractText } from '../../utils/counterpartDeliverableUtils';

interface FinancialSponsorsTabProps {
  incomeItems: IncomeItem[];
  teamName: string;
  invoiceSettings?: TeamInvoiceSettings;
  canEdit: boolean;
  onSaveIncomeItem: (item: IncomeItem) => Promise<void>;
  onSaveInvoiceSettings: (settings: TeamInvoiceSettings) => Promise<void>;
  onOpenIncomeModal: (item?: IncomeItem | null, preset?: IncomeCategory) => void;
  onDeleteIncomeItem: (itemId: string) => void;
  teamId?: string;
  users?: User[];
  partnerAccesses?: PartnerAccess[];
  currentUserId?: string;
  onSavePartnerAccess?: (access: PartnerAccess) => Promise<string>;
  onRevokePartnerAccess?: (accessId: string) => Promise<void>;
  onOpenPartnerPortal?: (incomeItemId?: string) => void;
  partnerNewsletters?: PartnerNewsletter[];
  raceEvents?: RaceEvent[];
  riders?: Rider[];
  onSavePartnerNewsletter?: (newsletter: PartnerNewsletter) => Promise<void>;
  onInstallDemoPartnerExample?: () => Promise<{ partnerUserFound: boolean; incomeItemId: string }>;
  partnerMarketplaceProfiles?: PartnerMarketplaceProfile[];
  teamSponsorshipNeeds?: TeamSponsorshipNeed[];
  partnershipMatchRequests?: PartnershipMatchRequest[];
  onSaveTeamSponsorshipNeed?: (need: TeamSponsorshipNeed) => Promise<void>;
  onRespondPartnershipMatchRequest?: (
    requestId: string,
    status: Extract<PartnershipMatchStatus, 'accepted' | 'declined' | 'contracted'>,
    contractedAmountEur?: number,
  ) => Promise<void>;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const FinancialSponsorsTab: React.FC<FinancialSponsorsTabProps> = ({
  incomeItems,
  teamName,
  invoiceSettings,
  canEdit,
  onSaveIncomeItem,
  onSaveInvoiceSettings,
  onOpenIncomeModal,
  onDeleteIncomeItem,
  teamId = '',
  users = [],
  partnerAccesses = [],
  currentUserId,
  onSavePartnerAccess,
  onRevokePartnerAccess,
  onOpenPartnerPortal,
  partnerNewsletters = [],
  raceEvents = [],
  riders = [],
  onSavePartnerNewsletter,
  onInstallDemoPartnerExample,
  partnerMarketplaceProfiles = [],
  teamSponsorshipNeeds = [],
  partnershipMatchRequests = [],
  onSaveTeamSponsorshipNeed,
  onRespondPartnershipMatchRequest,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';

  const [settingsDraft, setSettingsDraft] = useState<TeamInvoiceSettings>(
    invoiceSettings || DEFAULT_INVOICE_SETTINGS(teamName)
  );
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { feedback, showFeedback } = useFeedbackTimeout(4000);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalIncomeId, setPortalIncomeId] = useState('');
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalFeedback, setPortalFeedback] = useState<string | null>(null);
  const [grantScopes, setGrantScopes] = useState<PartnerScope[]>([...ALL_PARTNER_SCOPES]);
  const [demoInstalling, setDemoInstalling] = useState(false);
  const [draftingItem, setDraftingItem] = useState<IncomeItem | null>(null);
  const [draftInitialTab, setDraftInitialTab] = useState<
    'parties' | 'finance' | 'counterparts' | 'clauses' | 'preview'
  >('parties');
  const [counterpartsIncomeId, setCounterpartsIncomeId] = useState('');
  const [counterpartsDraft, setCounterpartsDraft] = useState<PartnerCounterpartDeliverable[]>([]);
  const [counterpartsText, setCounterpartsText] = useState('');
  const [counterpartsSaving, setCounterpartsSaving] = useState(false);

  useEffect(() => {
    if (invoiceSettings) setSettingsDraft(invoiceSettings);
  }, [invoiceSettings]);

  const sponsorshipItems = useMemo(
    () =>
      incomeItems
        .filter(isSponsorshipIncome)
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [incomeItems]
  );

  const hasDemoPartner = useMemo(
    () => sponsorshipItems.some((i) => isDemoPartnerIncome(i.id)),
    [sponsorshipItems],
  );

  useEffect(() => {
    if (!portalIncomeId && sponsorshipItems.length > 0) {
      setPortalIncomeId(sponsorshipItems[0].id);
    }
  }, [portalIncomeId, sponsorshipItems]);

  useEffect(() => {
    if (!counterpartsIncomeId && sponsorshipItems.length > 0) {
      setCounterpartsIncomeId(sponsorshipItems[0].id);
    }
  }, [counterpartsIncomeId, sponsorshipItems]);

  const counterpartsSourceItem = useMemo(
    () => sponsorshipItems.find((i) => i.id === counterpartsIncomeId) || null,
    [sponsorshipItems, counterpartsIncomeId]
  );

  useEffect(() => {
    if (!counterpartsSourceItem) {
      setCounterpartsDraft([]);
      setCounterpartsText('');
      return;
    }
    setCounterpartsDraft(counterpartsSourceItem.partnershipDeliverables || []);
    setCounterpartsText(counterpartsSourceItem.partnershipCounterparts || '');
  }, [counterpartsSourceItem]);

  const openContractDraft = (
    item: IncomeItem,
    tab: 'parties' | 'finance' | 'counterparts' | 'clauses' | 'preview' = 'parties'
  ) => {
    setDraftInitialTab(tab);
    setDraftingItem(item);
  };

  const handleSaveCounterpartsPanel = async () => {
    if (!counterpartsSourceItem || !canEdit) return;
    setCounterpartsSaving(true);
    try {
      const lang = language === 'en' ? 'en' : 'fr';
      const contractText =
        formatDeliverablesAsContractText(counterpartsDraft, lang) || counterpartsText;
      await onSaveIncomeItem({
        ...counterpartsSourceItem,
        partnershipDeliverables: counterpartsDraft.length ? counterpartsDraft : undefined,
        partnershipCounterparts: contractText || undefined,
      });
      showFeedback(t('counterpartsPanelSaved'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setCounterpartsSaving(false);
    }
  };

  const teamPartnerAccesses = useMemo(
    () => partnerAccesses.filter((a) => a.teamId === teamId && a.isActive),
    [partnerAccesses, teamId],
  );

  const resolveUserByEmail = (email: string): User | undefined => {
    const normalized = email.trim().toLowerCase();
    return users.find((u) => u.email?.trim().toLowerCase() === normalized);
  };

  const handleGrantPortalAccess = async () => {
    if (!canEdit || !onSavePartnerAccess || !teamId || !portalIncomeId) return;
    const income = sponsorshipItems.find((i) => i.id === portalIncomeId);
    const user = resolveUserByEmail(portalEmail);
    if (!income) {
      setPortalFeedback(t('partnerPortalGrantMissingIncome'));
      return;
    }
    if (!user?.id) {
      setPortalFeedback(t('partnerPortalGrantMissingUser'));
      return;
    }
    setPortalSaving(true);
    setPortalFeedback(null);
    try {
      const access = buildPartnerAccessFromIncome(income, user.id, teamId, currentUserId, grantScopes);
      if (!access) throw new Error('invalid access');
      await onSavePartnerAccess(access);
      setPortalEmail('');
      setPortalFeedback(t('partnerPortalGrantSuccess'));
    } catch {
      setPortalFeedback(t('partnerPortalGrantError'));
    } finally {
      setPortalSaving(false);
    }
  };

  const handleRevokePortalAccess = async (accessId: string) => {
    if (!canEdit || !onRevokePartnerAccess) return;
    try {
      await onRevokePartnerAccess(accessId);
      setPortalFeedback(t('partnerPortalRevokeSuccess'));
    } catch {
      setPortalFeedback(t('partnerPortalGrantError'));
    }
  };

  const handleInstallDemoPartner = async () => {
    if (!canEdit || !onInstallDemoPartnerExample) return;
    setDemoInstalling(true);
    setPortalFeedback(null);
    try {
      const result = await onInstallDemoPartnerExample();
      setPortalIncomeId(result.incomeItemId);
      setPortalFeedback(
        result.partnerUserFound
          ? t('partnerDemoInstallSuccessWithUser')
          : t('partnerDemoInstallSuccessNoUser').replace('{email}', DEMO_PARTNER_EMAIL),
      );
    } catch {
      setPortalFeedback(t('partnerDemoInstallError'));
    } finally {
      setDemoInstalling(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!canEdit) return;
    setSavingSettings(true);
    try {
      await onSaveInvoiceSettings(settingsDraft);
      setSettingsModalOpen(false);
      showFeedback(t('partnershipSettingsSaved'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleGenerateConvention = async (item: IncomeItem) => {
    if (!canEdit) return;
    setGeneratingId(`${item.id}-conv`);
    try {
      const { item: updated, settings: updatedSettings } = issueConvention(item, settingsDraft);
      await onSaveInvoiceSettings(updatedSettings);
      setSettingsDraft(updatedSettings);
      await onSaveIncomeItem(updated);
      exportPartnershipConventionPdf(updated, updatedSettings, teamName, language);
      showFeedback(t('partnershipConventionGenerated'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateCerfa = async (item: IncomeItem) => {
    if (!canEdit) return;
    setGeneratingId(`${item.id}-cerfa`);
    try {
      const { item: updated, settings: updatedSettings } = issueCerfaReceipt(item, settingsDraft);
      await onSaveInvoiceSettings(updatedSettings);
      setSettingsDraft(updatedSettings);
      await onSaveIncomeItem(updated);
      exportCerfaReceiptPdf(updated, updatedSettings, teamName);
      showFeedback(t('partnershipCerfaGenerated'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateBoth = async (item: IncomeItem) => {
    if (!canEdit) return;
    setGeneratingId(`${item.id}-both`);
    try {
      let current = item;
      let currentSettings = settingsDraft;
      const { item: withConv, settings: afterConv } = issueConvention(current, currentSettings);
      current = withConv;
      currentSettings = afterConv;
      const { item: withCerfa, settings: afterCerfa } = issueCerfaReceipt(current, currentSettings);
      await onSaveInvoiceSettings(afterCerfa);
      setSettingsDraft(afterCerfa);
      await onSaveIncomeItem(withCerfa);
      exportPartnershipConventionPdf(withCerfa, afterCerfa, teamName, language);
      exportCerfaReceiptPdf(withCerfa, afterCerfa, teamName);
      showFeedback(t('partnershipDocumentsGenerated'));
    } catch {
      showFeedback(t('financialSaveError'));
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">{t('financialSponsorsTitle')}</h3>
          <p className="text-sm text-slate-400">{t('partnershipDesc')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <ActionButton variant="secondary" size="sm" onClick={() => setSettingsModalOpen(true)}>
                {t('partnershipAssociationSettings')}
              </ActionButton>
              <ActionButton
                onClick={() => onOpenIncomeModal(null, IncomeCategory.SPONSORING)}
                icon={<PlusCircleIcon className="w-5 h-5" />}
              >
                {t('financialNewSponsor')}
              </ActionButton>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {feedback}
        </div>
      )}

      <div className="rounded-lg border border-sky-400/30 bg-slate-900 p-4 text-sm text-slate-200">
        <p className="font-medium text-white">{t('partnershipDocsTitle')}</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-300">
          <li>{t('partnershipDocConvention')}</li>
          <li>{t('partnershipDocCerfa')}</li>
          <li>{t('contractDraftDocsHint')}</li>
        </ul>
      </div>

      {sponsorshipItems.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          {t('financialSponsorsEmpty')}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-md bg-white shadow">
          {sponsorshipItems.map((item) => {
            const canConvention = isConventionEligible(item.category);
            const canCerfa = isCerfaEligible(item.category);
            const isMecenat = item.category === IncomeCategory.MECENAT;

            return (
              <li key={item.id} className="px-6 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{item.description}</span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {item.category}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {item.sponsorCompanyName || item.sponsorshipContactName || item.clientName || '—'}
                      {item.sponsorshipContractStart && (
                        <span className="text-gray-400">
                          {' '}
                          • {formatFinancialDate(item.sponsorshipContractStart, locale)}
                          {item.sponsorshipContractEnd &&
                            ` → ${formatFinancialDate(item.sponsorshipContractEnd, locale)}`}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {item.conventionNumber && (
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">
                          {t('partnershipConventionShort')} {item.conventionNumber}
                        </span>
                      )}
                      {item.cerfaReceiptNumber && (
                        <span className="rounded bg-purple-50 px-2 py-0.5 text-purple-700">
                          CERFA {getCerfaFormId(item.category)} — {item.cerfaReceiptNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-lg font-semibold text-green-600">
                      {formatFinancialAmount(item.amount, locale)}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => openContractDraft(item, 'counterparts')}
                            className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                          >
                            {t('counterpartsPanelOpen')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openContractDraft(item, 'parties')}
                            className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                          >
                            {t('contractDraftOpen')}
                          </button>
                        </>
                      )}
                      {canConvention && (
                        <button
                          type="button"
                          onClick={() => handleGenerateConvention(item)}
                          disabled={generatingId === `${item.id}-conv` || generatingId === `${item.id}-both`}
                          className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                        >
                          {generatingId === `${item.id}-conv` ? '…' : t('partnershipGenerateConvention')}
                        </button>
                      )}
                      {canCerfa && !isMecenat && (
                        <button
                          type="button"
                          onClick={() => handleGenerateCerfa(item)}
                          disabled={generatingId === `${item.id}-cerfa`}
                          className="rounded border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                        >
                          {generatingId === `${item.id}-cerfa` ? '…' : t('partnershipGenerateCerfa')}
                        </button>
                      )}
                      {isMecenat && (
                        <button
                          type="button"
                          onClick={() => handleGenerateBoth(item)}
                          disabled={generatingId === `${item.id}-both`}
                          className="rounded border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                        >
                          {generatingId === `${item.id}-both` ? '…' : t('partnershipGenerateMecenatPack')}
                        </button>
                      )}
                      {item.conventionNumber && (
                        <button
                          type="button"
                          onClick={() =>
                            exportPartnershipConventionPdf(item, settingsDraft, teamName, language)
                          }
                          className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          PDF {getConventionTitle(item.category, language).split(' ')[0]}
                        </button>
                      )}
                      {item.cerfaReceiptNumber && (
                        <button
                          type="button"
                          onClick={() => exportCerfaReceiptPdf(item, settingsDraft, teamName)}
                          className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          PDF CERFA
                        </button>
                      )}
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenIncomeModal(item)}
                            className="text-gray-400 hover:text-gray-600"
                            aria-label={t('financialEditIncome')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteIncomeItem(item.id)}
                            className="text-gray-400 hover:text-red-600"
                            aria-label={t('financialDeleteError')}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {sponsorshipItems.length > 0 && (
        <div className="rounded-xl border border-emerald-400/40 bg-slate-900 p-4 space-y-3 shadow-lg shadow-black/25">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">{t('counterpartsPanelTitle')}</h3>
              <p className="mt-1 text-sm text-slate-300">{t('counterpartsPanelDesc')}</p>
            </div>
            {canEdit && counterpartsSourceItem && (
              <ActionButton
                size="sm"
                onClick={handleSaveCounterpartsPanel}
                disabled={counterpartsSaving}
              >
                {counterpartsSaving ? '…' : t('counterpartsPanelSave')}
              </ActionButton>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">
              {t('partnerPortalSelectSponsor')}
            </label>
            <select
              className="w-full max-w-md rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={counterpartsIncomeId}
              onChange={(e) => setCounterpartsIncomeId(e.target.value)}
            >
              {sponsorshipItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sponsorCompanyName || item.description}
                  {(item.partnershipDeliverables?.length ?? 0) > 0
                    ? ` · ${item.partnershipDeliverables!.length} ${t('counterpartsPanelCount')}`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          {counterpartsSourceItem && (
            <PartnershipCounterpartsEditor
              items={counterpartsDraft}
              category={counterpartsSourceItem.category}
              canEdit={canEdit}
              variant="dark"
              onChange={(items, contractText) => {
                setCounterpartsDraft(items);
                setCounterpartsText(contractText);
              }}
            />
          )}
        </div>
      )}

      {canEdit && onOpenPartnerPortal && (
        <div className="rounded-xl border border-sky-400/35 bg-slate-900 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-semibold text-white">{t('partnerCommsHubTitle')}</h4>
            <p className="text-sm text-slate-300 mt-1">{t('partnerCommsHubDesc')}</p>
          </div>
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={() => onOpenPartnerPortal()}
          >
            {t('partnerCommsOpenFromFinance')}
          </ActionButton>
        </div>
      )}

      <div className="rounded-xl border border-indigo-400/35 bg-slate-900 p-4 space-y-4 shadow-lg shadow-black/25">
        {canEdit && onInstallDemoPartnerExample && (
          <div className="rounded-md border border-dashed border-indigo-400/40 bg-slate-950/70 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">{t('partnerDemoInstallTitle')}</p>
              <p className="text-xs text-slate-300 mt-0.5">{t('partnerDemoInstallDesc')}</p>
              <p className="text-xs text-indigo-200 mt-1">
                {t('partnerDemoInstallEmailHint').replace('{email}', DEMO_PARTNER_EMAIL)}
              </p>
            </div>
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={handleInstallDemoPartner}
              disabled={demoInstalling || hasDemoPartner}
            >
              {demoInstalling ? '…' : hasDemoPartner ? t('partnerDemoInstallDone') : t('partnerDemoInstallAction')}
            </ActionButton>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-semibold text-white">{t('partnerPortalWebTitle')}</h4>
            <p className="text-sm text-slate-300 mt-1">{t('partnerPortalWebDesc')}</p>
            <p className="text-xs text-indigo-200 mt-1">{t('commPartnerPortalHint')}</p>
          </div>
          {onOpenPartnerPortal && sponsorshipItems.length > 0 && (
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => onOpenPartnerPortal(portalIncomeId || sponsorshipItems[0]?.id)}
            >
              {t('partnerPortalOpenPreview')}
            </ActionButton>
          )}
        </div>

        {portalFeedback && (
          <p className="text-sm text-indigo-100">{portalFeedback}</p>
        )}

        {canEdit && onSavePartnerAccess && sponsorshipItems.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                {t('partnerPortalSelectSponsor')}
              </label>
              <select
                value={portalIncomeId}
                onChange={(e) => setPortalIncomeId(e.target.value)}
                className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                {sponsorshipItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sponsorCompanyName || item.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                {t('partnerPortalGrantEmail')}
              </label>
              <input
                type="email"
                value={portalEmail}
                onChange={(e) => setPortalEmail(e.target.value)}
                placeholder="contact@sponsor.com"
                className="w-full rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="flex items-end">
              <ActionButton
                size="sm"
                onClick={handleGrantPortalAccess}
                disabled={portalSaving || !portalEmail.trim()}
              >
                {portalSaving ? '…' : t('partnerPortalGrantAccess')}
              </ActionButton>
            </div>
          </div>
        )}

        {canEdit && onSavePartnerAccess && sponsorshipItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ALL_PARTNER_SCOPES.map((scope) => (
              <label key={scope} className="inline-flex items-center gap-1.5 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={grantScopes.includes(scope)}
                  onChange={(e) => {
                    setGrantScopes((prev) =>
                      e.target.checked ? [...prev, scope] : prev.filter((s) => s !== scope),
                    );
                  }}
                  className="rounded border-indigo-300"
                />
                {getPartnerScopeLabel(scope, language)}
              </label>
            ))}
          </div>
        )}

        {teamPartnerAccesses.length > 0 ? (
          <ul className="divide-y divide-white/10 rounded-md border border-white/15 bg-slate-950/70">
            {teamPartnerAccesses.map((access) => {
              const income = sponsorshipItems.find((i) => i.id === access.incomeItemId);
              const user = users.find((u) => u.id === access.userId);
              return (
                <li key={access.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <p className="font-medium text-white">
                      {access.sponsorCompanyName || income?.description || 'Partenariat'}
                    </p>
                    <p className="text-slate-400">
                      {user?.email || user?.firstName || access.userId}
                      {' · '}
                      {access.scopes?.length || ALL_PARTNER_SCOPES.length} {t('partnerScopes').toLowerCase()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {onOpenPartnerPortal && (
                      <button
                        type="button"
                        onClick={() => onOpenPartnerPortal(access.incomeItemId)}
                        className="rounded border border-indigo-400/40 bg-indigo-500/15 px-2 py-1 text-xs font-medium text-indigo-100 hover:bg-indigo-500/25"
                      >
                        {t('partnerPortalOpenPreview')}
                      </button>
                    )}
                    {canEdit && onRevokePartnerAccess && (
                      <button
                        type="button"
                        onClick={() => handleRevokePortalAccess(access.id)}
                        className="rounded border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                      >
                        {t('partnerPortalRevokeAccess')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">{t('partnerPortalNoAccessYet')}</p>
        )}
      </div>

      {onSaveTeamSponsorshipNeed && onRespondPartnershipMatchRequest && (
        <TeamSponsorshipMarketplacePanel
          teamId={teamId}
          teamName={teamName}
          currentUserId={currentUserId}
          canEdit={canEdit}
          sponsorshipNeeds={teamSponsorshipNeeds}
          partnerProfiles={partnerMarketplaceProfiles}
          matchRequests={partnershipMatchRequests}
          users={users}
          onSaveNeed={onSaveTeamSponsorshipNeed}
          onRespondMatchRequest={onRespondPartnershipMatchRequest}
        />
      )}

      <SponsorshipContractDraftModal
        item={draftingItem}
        isOpen={Boolean(draftingItem)}
        initialTab={draftInitialTab}
        onClose={() => {
          setDraftingItem(null);
          setDraftInitialTab('parties');
        }}
        onSave={async (updated) => {
          await onSaveIncomeItem(updated);
          showFeedback(t('contractDraftSaved'));
        }}
        invoiceSettings={settingsDraft}
        teamName={teamName}
        canEdit={canEdit}
      />

      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title={t('partnershipAssociationSettings')}
      >
        <div className="space-y-3 text-sm">
          <p className="text-gray-500">{t('partnershipSettingsHint')}</p>
          <div>
            <label className="font-medium text-gray-700">{t('invoiceIssuerName')}</label>
            <input
              type="text"
              value={settingsDraft.issuerName}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, issuerName: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="font-medium text-gray-700">{t('invoiceIssuerAddress')}</label>
            <textarea
              value={settingsDraft.issuerAddress || ''}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, issuerAddress: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="font-medium text-gray-700">SIRET</label>
              <input
                type="text"
                value={settingsDraft.issuerSiret || ''}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, issuerSiret: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="font-medium text-gray-700">{t('partnershipRna')}</label>
              <input
                type="text"
                value={settingsDraft.rnaNumber || ''}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, rnaNumber: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="font-medium text-gray-700">{t('partnershipAssociationObject')}</label>
            <textarea
              value={settingsDraft.associationObject || ''}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, associationObject: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder={t('partnershipAssociationObjectPlaceholder')}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="font-medium text-gray-700">{t('partnershipLegalRep')}</label>
              <input
                type="text"
                value={settingsDraft.legalRepresentative || ''}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, legalRepresentative: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="font-medium text-gray-700">{t('partnershipLegalRepTitle')}</label>
              <input
                type="text"
                value={settingsDraft.legalRepresentativeTitle || ''}
                onChange={(e) =>
                  setSettingsDraft((s) => ({ ...s, legalRepresentativeTitle: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Président, Directeur…"
              />
            </div>
          </div>
          <div>
            <label className="font-medium text-gray-700">{t('partnershipPrefecturalDecree')}</label>
            <input
              type="text"
              value={settingsDraft.prefecturalDecree || ''}
              onChange={(e) => setSettingsDraft((s) => ({ ...s, prefecturalDecree: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settingsDraft.isGeneralInterest ?? true}
              onChange={(e) =>
                setSettingsDraft((s) => ({ ...s, isGeneralInterest: e.target.checked }))
              }
            />
            {t('partnershipGeneralInterest')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-gray-700">{t('partnershipConventionPrefix')}</label>
              <input
                type="text"
                value={settingsDraft.conventionPrefix || 'CONV'}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, conventionPrefix: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="font-medium text-gray-700">{t('partnershipCerfaPrefix')}</label>
              <input
                type="text"
                value={settingsDraft.cerfaReceiptPrefix || 'RF'}
                onChange={(e) => setSettingsDraft((s) => ({ ...s, cerfaReceiptPrefix: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono"
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

export default FinancialSponsorsTab;
