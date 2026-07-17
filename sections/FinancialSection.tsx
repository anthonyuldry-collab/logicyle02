import React, { useState, useMemo, useCallback } from 'react';
import {
  IncomeItem,
  EventBudgetItem,
  RaceEvent,
  IncomeCategory,
  AppSection,
  PermissionLevel,
  Rider,
  StaffMember,
  SubscriptionPlanId,
  TeamSubscription,
  StaffEventSelection,
  ExpenseReceipt,
  EventTransportLeg,
  User,
  TeamSepaSettings,
  TeamInvoiceSettings,
  ClientRecord,
  SupplierInvoice,
  SepaBatch,
  BankTransaction,
  PartnerAccess,
  PartnerNewsletter,
  PartnerMarketplaceProfile,
  TeamSponsorshipNeed,
  PartnershipMatchRequest,
  PartnershipMatchStatus,
  Quote,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import { useTranslations } from '../hooks/useTranslations';
import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
} from '../components/icons';
import { exportAccountingCsv } from '../utils/accountingExport';
import {
  getBudgetItemCost,
  getEventNameById,
  formatFinancialAmount,
  formatFinancialDate,
  hasContractDates,
} from '../utils/financialUtils';
import IncomeForm from './IncomeForm';
import BudgetForm from './BudgetForm';
import FinancialPayrollTab from './financial/FinancialPayrollTab';
import FinancialReceiptsTab from './financial/FinancialReceiptsTab';
import FinancialSepaTab from './financial/FinancialSepaTab';
import FinancialInvoicingTab from './financial/FinancialInvoicingTab';
import FinancialSponsorsTab from './financial/FinancialSponsorsTab';
import FinancialAccountingTab from './financial/FinancialAccountingTab';
import FinancialClientsTab from './financial/FinancialClientsTab';
import FinancialSupplierInvoicesTab from './financial/FinancialSupplierInvoicesTab';
import FinancialBankReconciliationTab from './financial/FinancialBankReconciliationTab';
import FinancialQuotesTab from './financial/FinancialQuotesTab';
import SubNavBar from '../components/SubNavBar';
import FinancialOverviewDashboard from '../components/financial/FinancialOverviewDashboard';
import { FinancialPeriod } from '../utils/financialChartUtils';
import { hasProPayrollAccess, hasSepaExportAccess, hasAccountingExportAccess } from '../utils/contractUtils';
import { getSubscriptionAccess } from '../utils/subscriptionEntitlements';

type FinancialTab = 'overview' | 'income' | 'expenses' | 'contracts' | 'payroll' | 'receipts' | 'invoicing' | 'quotes' | 'sponsors' | 'sepa' | 'accounting' | 'clients' | 'suppliers' | 'bank';

interface FinancialSectionProps {
  incomeItems: IncomeItem[];
  budgetItems: EventBudgetItem[];
  onSaveIncomeItem: (item: IncomeItem) => Promise<void>;
  onDeleteIncomeItem: (item: IncomeItem) => Promise<void>;
  onSaveBudgetItem: (item: EventBudgetItem) => Promise<void>;
  onDeleteBudgetItem: (item: EventBudgetItem) => Promise<void>;
  effectivePermissions: Partial<Record<AppSection, PermissionLevel[]>>;
  raceEvents?: RaceEvent[];
  teamName?: string;
  riders?: Rider[];
  staff?: StaffMember[];
  staffEventSelections?: StaffEventSelection[];
  expenseReceipts?: ExpenseReceipt[];
  eventTransportLegs?: EventTransportLeg[];
  currentUser?: User;
  teamId?: string;
  onSaveExpenseReceipt?: (receipt: ExpenseReceipt) => Promise<void>;
  onSaveSepaSettings?: (settings: TeamSepaSettings) => Promise<void>;
  onSaveInvoiceSettings?: (settings: TeamInvoiceSettings) => Promise<void>;
  sepaSettings?: TeamSepaSettings;
  invoiceSettings?: TeamInvoiceSettings;
  subscription?: TeamSubscription;
  fallbackPlanId?: SubscriptionPlanId;
  clientRecords?: ClientRecord[];
  supplierInvoices?: SupplierInvoice[];
  sepaBatches?: SepaBatch[];
  bankTransactions?: BankTransaction[];
  onSaveClientRecord?: (client: ClientRecord) => Promise<void>;
  onDeleteClientRecord?: (client: ClientRecord) => Promise<void>;
  onSaveSupplierInvoice?: (invoice: SupplierInvoice) => Promise<void>;
  onDeleteSupplierInvoice?: (invoice: SupplierInvoice) => Promise<void>;
  onSaveBankTransaction?: (tx: BankTransaction) => Promise<void>;
  onImportBankTransactions?: (txs: BankTransaction[]) => Promise<void>;
  onSaveSepaBatch?: (batch: SepaBatch) => Promise<void>;
  onMarkSalariesPaid?: (sourceIds: string[]) => Promise<void>;
  users?: User[];
  partnerAccesses?: PartnerAccess[];
  onSavePartnerAccess?: (access: PartnerAccess) => Promise<string>;
  onRevokePartnerAccess?: (accessId: string) => Promise<void>;
  onOpenPartnerPortal?: (incomeItemId?: string) => void;
  partnerNewsletters?: PartnerNewsletter[];
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
  quotes?: Quote[];
  onSaveQuote?: (quote: Quote) => Promise<void>;
  onDeleteQuote?: (quote: Quote) => Promise<void>;
  onConvertQuote?: (quote: Quote, income: IncomeItem, settings: TeamInvoiceSettings) => Promise<void>;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

export const FinancialSection: React.FC<FinancialSectionProps> = ({
  incomeItems = [],
  budgetItems = [],
  onSaveIncomeItem,
  onDeleteIncomeItem,
  onSaveBudgetItem,
  onDeleteBudgetItem,
  effectivePermissions,
  raceEvents,
  teamName = 'equipe',
  riders = [],
  staff = [],
  staffEventSelections = [],
  expenseReceipts = [],
  eventTransportLegs = [],
  currentUser,
  teamId = '',
  onSaveExpenseReceipt,
  onSaveSepaSettings,
  onSaveInvoiceSettings,
  sepaSettings,
  invoiceSettings,
  subscription,
  fallbackPlanId = SubscriptionPlanId.COMPETITION,
  clientRecords = [],
  supplierInvoices = [],
  sepaBatches = [],
  bankTransactions = [],
  onSaveClientRecord,
  onDeleteClientRecord,
  onSaveSupplierInvoice,
  onDeleteSupplierInvoice,
  onSaveBankTransaction,
  onImportBankTransactions,
  onSaveSepaBatch,
  onMarkSalariesPaid,
  quotes = [],
  onSaveQuote,
  onDeleteQuote,
  onConvertQuote,
  users = [],
  partnerAccesses = [],
  onSavePartnerAccess,
  onRevokePartnerAccess,
  onOpenPartnerPortal,
  partnerNewsletters = [],
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

  const subscriptionAccess = useMemo(
    () => getSubscriptionAccess(subscription, fallbackPlanId),
    [subscription, fallbackPlanId]
  );
  const canExportPayroll =
    hasProPayrollAccess(subscriptionAccess.planId) || hasProPayrollAccess(fallbackPlanId);
  const canExportSepa =
    hasSepaExportAccess(subscriptionAccess.planId) || hasSepaExportAccess(fallbackPlanId);
  const canExportAccounting =
    hasAccountingExportAccess(subscriptionAccess.planId) || hasAccountingExportAccess(fallbackPlanId);
  const payrollContext = useMemo(
    () => ({ raceEvents, staffEventSelections }),
    [raceEvents, staffEventSelections]
  );

  const canView = effectivePermissions?.financial?.includes('view') ?? false;
  const canEdit = effectivePermissions?.financial?.includes('edit') ?? false;

  const [activeTab, setActiveTab] = useState<FinancialTab>('overview');
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingIncomeItem, setEditingIncomeItem] = useState<IncomeItem | null>(null);
  const [editingBudgetItem, setEditingBudgetItem] = useState<EventBudgetItem | null>(null);
  const [incomeSearch, setIncomeSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState<string>('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expenseEventFilter, setExpenseEventFilter] = useState<string>('all');
  const [defaultIncomeCategory, setDefaultIncomeCategory] = useState<IncomeCategory | undefined>(undefined);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [overviewPeriod, setOverviewPeriod] = useState<FinancialPeriod>('ytd');
  const [activeGroup, setActiveGroup] = useState<string>('pilotage');

  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message);
    window.setTimeout(() => setFeedbackMessage(null), 4000);
  }, []);

  const filteredIncomeItems = useMemo(() => {
    return incomeItems
      .filter((item) => {
        if (incomeCategoryFilter !== 'all' && item.category !== incomeCategoryFilter) return false;
        if (!incomeSearch.trim()) return true;
        const q = incomeSearch.toLowerCase();
        return (
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.notes || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [incomeItems, incomeCategoryFilter, incomeSearch]);

  const filteredBudgetItems = useMemo(() => {
    return budgetItems
      .filter((item) => {
        if (expenseCategoryFilter !== 'all' && item.category !== expenseCategoryFilter) return false;
        if (expenseEventFilter === 'general' && item.eventId) return false;
        if (expenseEventFilter !== 'all' && expenseEventFilter !== 'general' && item.eventId !== expenseEventFilter) {
          return false;
        }
        if (!expenseSearch.trim()) return true;
        const q = expenseSearch.toLowerCase();
        const eventName = getEventNameById(raceEvents, item.eventId).toLowerCase();
        return (
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          eventName.includes(q) ||
          (item.notes || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.description.localeCompare(b.description, locale));
  }, [budgetItems, expenseCategoryFilter, expenseEventFilter, expenseSearch, raceEvents, locale]);

  const contractItems = useMemo(
    () => incomeItems.filter(hasContractDates).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [incomeItems]
  );

  const expenseCategories = useMemo(
    () => Array.from(new Set(budgetItems.map((item) => item.category).filter(Boolean))).sort(),
    [budgetItems]
  );

  const openIncomeModal = (item?: IncomeItem | null, presetCategory?: IncomeCategory) => {
    setEditingIncomeItem(item ?? null);
    setDefaultIncomeCategory(presetCategory);
    setIsIncomeModalOpen(true);
  };

  const closeIncomeModal = () => {
    setIsIncomeModalOpen(false);
    setEditingIncomeItem(null);
    setDefaultIncomeCategory(undefined);
  };

  const handleSaveIncomeItem = async (item: IncomeItem) => {
    if (!canEdit) return;
    try {
      if (!item.description || typeof item.amount !== 'number' || isNaN(item.amount)) {
        showFeedback(t('financialSaveError'));
        return;
      }
      await onSaveIncomeItem(item);
      closeIncomeModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du revenu:', error);
      showFeedback(t('financialSaveError'));
    }
  };

  const handleDeleteIncomeItem = async (itemId: string) => {
    if (!canEdit) return;
    try {
      const item = incomeItems.find((i) => i.id === itemId);
      if (!item) return;
      const confirmed = window.confirm(
        t('financialConfirmDeleteIncome').replace('{name}', item.description)
      );
      if (confirmed) await onDeleteIncomeItem(item);
    } catch (error) {
      console.error('Erreur lors de la suppression du revenu:', error);
      showFeedback(t('financialDeleteError'));
    }
  };

  const handleSaveBudgetItem = async (item: EventBudgetItem) => {
    if (!canEdit) return;
    try {
      if (!item.description || typeof item.estimatedCost !== 'number' || isNaN(item.estimatedCost)) {
        showFeedback(t('financialSaveError'));
        return;
      }
      await onSaveBudgetItem(item);
      setIsBudgetModalOpen(false);
      setEditingBudgetItem(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la dépense:', error);
      showFeedback(t('financialSaveError'));
    }
  };

  const handleDeleteBudgetItem = async (itemId: string) => {
    if (!canEdit) return;
    const item = budgetItems.find((i) => i.id === itemId);
    if (!item || item.isAutoGenerated) return;
    try {
      const confirmed = window.confirm(
        t('financialConfirmDeleteExpense').replace('{name}', item.description)
      );
      if (confirmed) await onDeleteBudgetItem(item);
    } catch (error) {
      console.error('Erreur lors de la suppression de la dépense:', error);
      showFeedback(t('financialDeleteError'));
    }
  };

  const tabGroups: { id: string; label: string; tabs: { id: FinancialTab; label: string }[] }[] = [
    {
      id: 'pilotage',
      label: t('financialGroupPilotage'),
      tabs: [
        { id: 'overview', label: t('financialTabOverview') },
        { id: 'income', label: t('financialTabIncome') },
        { id: 'expenses', label: t('financialTabExpenses') },
        { id: 'contracts', label: t('financialTabContracts') },
        { id: 'payroll', label: t('financialTabPayroll') },
        { id: 'sponsors', label: t('financialTabSponsors') },
      ],
    },
    {
      id: 'facturation',
      label: t('financialGroupFacturation'),
      tabs: [
        { id: 'invoicing', label: t('financialTabInvoicing') },
        { id: 'quotes', label: t('financialTabQuotes') },
        { id: 'clients', label: t('financialTabClients') },
        { id: 'receipts', label: t('financialTabReceipts') },
      ],
    },
    {
      id: 'compta',
      label: t('financialGroupCompta'),
      tabs: [
        { id: 'accounting', label: t('financialTabAccounting') },
        { id: 'suppliers', label: t('financialTabSuppliers') },
        { id: 'bank', label: t('financialTabBank') },
        { id: 'sepa', label: t('financialTabSepa') },
      ],
    },
  ];


  const handleTabChange = (tab: FinancialTab) => {
    setActiveTab(tab);
    const group = tabGroups.find((g) => g.tabs.some((t) => t.id === tab));
    if (group) setActiveGroup(group.id);
  };

  const handleGroupChange = (groupId: string) => {
    setActiveGroup(groupId);
    const group = tabGroups.find((g) => g.id === groupId);
    if (group && !group.tabs.some((t) => t.id === activeTab)) {
      setActiveTab(group.tabs[0].id);
    }
  };

  if (!canView) {
    return (
      <SectionWrapper title={t('titleFinancial')}>
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <h3 className="text-xl font-semibold text-gray-700">{t('financialNoAccess')}</h3>
          <p className="mt-2 text-gray-500">{t('financialNoAccessDesc')}</p>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title={t('titleFinancial')} variant="hub" hideTitleOnMobile>
      {feedbackMessage && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {feedbackMessage}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {!canEdit && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 border border-amber-200">
            {t('financialReadOnly')}
          </span>
        )}
        <div className="ml-auto">
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => exportAccountingCsv(teamName, budgetItems, incomeItems, { raceEvents, locale })}
          >
            {t('exportAccountingCsv')}
          </ActionButton>
        </div>
      </div>

      <SubNavBar
        groups={tabGroups}
        activeGroupId={activeGroup}
        activeTabId={activeTab}
        onGroupChange={handleGroupChange}
        onTabChange={(tabId) => handleTabChange(tabId as FinancialTab)}
        ariaLabel={t('titleFinancial')}
      />

      <div className="mt-4 space-y-6" role="tabpanel">
        {activeTab === 'overview' && (
          <FinancialOverviewDashboard
            incomeItems={incomeItems}
            budgetItems={budgetItems}
            supplierInvoices={supplierInvoices}
            bankTransactions={bankTransactions}
            riders={riders}
            staff={staff}
            payrollContext={payrollContext}
            period={overviewPeriod}
            onPeriodChange={setOverviewPeriod}
            onNavigateTab={(tab) => handleTabChange(tab as FinancialTab)}
            canEdit={canEdit}
            onAddIncome={canEdit ? () => openIncomeModal() : undefined}
            onAddExpense={canEdit ? () => { setEditingBudgetItem(null); setIsBudgetModalOpen(true); } : undefined}
          />
        )}

        {activeTab === 'income' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-medium text-gray-900">{t('financialManageIncome')}</h3>
              {canEdit && (
                <ActionButton onClick={() => openIncomeModal()} icon={<PlusCircleIcon className="w-5 h-5" />}>
                  {t('financialAddIncome')}
                </ActionButton>
              )}
            </div>

            <FilterBar
              search={incomeSearch}
              onSearchChange={setIncomeSearch}
              searchPlaceholder={t('financialSearch')}
              categoryFilter={incomeCategoryFilter}
              onCategoryFilterChange={setIncomeCategoryFilter}
              categories={Object.values(IncomeCategory)}
              allCategoriesLabel={t('financialAllCategories')}
            />

            {filteredIncomeItems.length === 0 ? (
              <EmptyState message={t('financialNoIncome')} />
            ) : (
              <ul className="divide-y divide-gray-200 overflow-hidden rounded-md bg-white shadow">
                {filteredIncomeItems.map((item) => (
                  <FinancialListItem
                    key={item.id}
                    title={item.description}
                    subtitle={`${item.category} • ${formatFinancialDate(item.date, locale)}`}
                    amount={formatFinancialAmount(item.amount, locale)}
                    amountTone="green"
                    canEdit={canEdit}
                    onEdit={() => openIncomeModal(item)}
                    onDelete={() => handleDeleteIncomeItem(item.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-medium text-gray-900">{t('financialManageExpenses')}</h3>
              {canEdit && (
                <ActionButton onClick={() => setIsBudgetModalOpen(true)} icon={<PlusCircleIcon className="w-5 h-5" />}>
                  {t('financialAddExpense')}
                </ActionButton>
              )}
            </div>

            <FilterBar
              search={expenseSearch}
              onSearchChange={setExpenseSearch}
              searchPlaceholder={t('financialSearch')}
              categoryFilter={expenseCategoryFilter}
              onCategoryFilterChange={setExpenseCategoryFilter}
              categories={expenseCategories}
              allCategoriesLabel={t('financialAllCategories')}
              eventFilter={expenseEventFilter}
              onEventFilterChange={setExpenseEventFilter}
              raceEvents={raceEvents}
              allEventsLabel={t('financialAllEvents')}
              generalEventLabel={t('financialGeneral')}
            />

            {filteredBudgetItems.length === 0 ? (
              <EmptyState message={t('financialNoExpenses')} />
            ) : (
              <ul className="divide-y divide-gray-200 overflow-hidden rounded-md bg-white shadow">
                {filteredBudgetItems.map((item) => {
                  const cost = getBudgetItemCost(item);
                  const eventLabel = item.eventId
                    ? `${t('financialEvent')}: ${getEventNameById(raceEvents, item.eventId)}`
                    : t('financialGeneral');

                  return (
                    <FinancialListItem
                      key={item.id}
                      title={item.description}
                      subtitle={`${item.category} • ${eventLabel}`}
                      badge={item.isAutoGenerated ? t('financialAutoGenerated') : undefined}
                      amount={formatFinancialAmount(cost, locale)}
                      amountSubtext={
                        item.actualCost && item.actualCost > 0
                          ? `${t('financialEstimated')}: ${formatFinancialAmount(item.estimatedCost, locale)}`
                          : undefined
                      }
                      amountTone="red"
                      canEdit={canEdit && !item.isAutoGenerated}
                      editDisabledReason={item.isAutoGenerated ? t('financialAutoGeneratedReadOnly') : undefined}
                      onEdit={() => {
                        setEditingBudgetItem(item);
                        setIsBudgetModalOpen(true);
                      }}
                      onDelete={() => handleDeleteBudgetItem(item.id)}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">{t('financialContractsTitle')}</h3>
            {contractItems.length === 0 ? (
              <EmptyState message={t('financialContractsEmpty')} />
            ) : (
              <ul className="divide-y divide-gray-200 overflow-hidden rounded-md bg-white shadow">
                {contractItems.map((item) => (
                  <li key={item.id} className="px-6 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{item.description}</div>
                        <div className="text-sm text-gray-500">{item.category}</div>
                        <div className="mt-1 text-sm text-gray-600">
                          {item.sponsorshipContractStart &&
                            `${formatFinancialDate(item.sponsorshipContractStart, locale)}`}
                          {item.sponsorshipContractStart && item.sponsorshipContractEnd && ' → '}
                          {item.sponsorshipContractEnd &&
                            formatFinancialDate(item.sponsorshipContractEnd, locale)}
                        </div>
                        {item.sponsorshipContactName && (
                          <div className="text-sm text-gray-500">{item.sponsorshipContactName}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-green-600">
                          {formatFinancialAmount(item.amount, locale)}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openIncomeModal(item)}
                            className="text-gray-400 hover:text-gray-600"
                            aria-label={t('financialEditIncome')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'payroll' && (
          <FinancialPayrollTab
            riders={riders}
            staff={staff}
            teamName={teamName}
            canExport={canView && canExportPayroll}
            raceEvents={raceEvents}
            staffEventSelections={staffEventSelections}
          />
        )}

        {activeTab === 'receipts' && currentUser && onSaveExpenseReceipt && (
          <FinancialReceiptsTab
            receipts={expenseReceipts}
            raceEvents={raceEvents || []}
            transportLegs={eventTransportLegs}
            currentUser={currentUser}
            staff={staff}
            teamId={teamId}
            teamName={teamName}
            effectivePermissions={effectivePermissions}
            onSaveReceipt={onSaveExpenseReceipt}
            onSaveBudgetItem={onSaveBudgetItem}
          />
        )}

        {activeTab === 'invoicing' && onSaveInvoiceSettings && (
          <FinancialInvoicingTab
            incomeItems={incomeItems}
            teamName={teamName}
            invoiceSettings={invoiceSettings}
            canEdit={canEdit}
            onSaveIncomeItem={onSaveIncomeItem}
            onSaveInvoiceSettings={onSaveInvoiceSettings}
          />
        )}
        {activeTab === 'quotes' && onSaveQuote && onDeleteQuote && onConvertQuote && (
          <FinancialQuotesTab
            quotes={quotes}
            clients={clientRecords}
            invoiceSettings={invoiceSettings}
            teamName={teamName}
            canEdit={canEdit}
            onSaveQuote={onSaveQuote}
            onDeleteQuote={onDeleteQuote}
            onConvertToInvoice={onConvertQuote}
            onSaveInvoiceSettings={onSaveInvoiceSettings}
          />
        )}

        {activeTab === 'sepa' && onSaveSepaSettings && (
          <FinancialSepaTab
            riders={riders}
            staff={staff}
            receipts={expenseReceipts}
            raceEvents={raceEvents}
            staffEventSelections={staffEventSelections}
            teamName={teamName}
            sepaSettings={sepaSettings}
            sepaBatches={sepaBatches}
            canEdit={canEdit}
            canExport={canView && canExportSepa}
            onSaveSepaSettings={onSaveSepaSettings}
            onMarkReceiptsPaid={
              onSaveExpenseReceipt
                ? async (receiptIds) => {
                    const paidAt = new Date().toISOString();
                    await Promise.all(
                      receiptIds.map(async (id) => {
                        const receipt = expenseReceipts.find((r) => r.id === id);
                        if (!receipt) return;
                        await onSaveExpenseReceipt({ ...receipt, sepaPaidAt: paidAt });
                      })
                    );
                  }
                : undefined
            }
            onSaveSepaBatch={onSaveSepaBatch}
            onMarkSalariesPaid={onMarkSalariesPaid}
            incomeItems={incomeItems}
            clientRecords={clientRecords}
          />
        )}

        {activeTab === 'clients' && onSaveClientRecord && onDeleteClientRecord && (
          <FinancialClientsTab
            clients={clientRecords}
            incomeItems={incomeItems}
            canEdit={canEdit}
            onSaveClient={onSaveClientRecord}
            onDeleteClient={onDeleteClientRecord}
          />
        )}

        {activeTab === 'suppliers' && onSaveSupplierInvoice && onDeleteSupplierInvoice && (
          <FinancialSupplierInvoicesTab
            invoices={supplierInvoices}
            canEdit={canEdit}
            onSave={onSaveSupplierInvoice}
            onDelete={onDeleteSupplierInvoice}
          />
        )}

        {activeTab === 'accounting' && (
          <FinancialAccountingTab
            incomeItems={incomeItems}
            budgetItems={budgetItems}
            supplierInvoices={supplierInvoices}
            sepaBatches={sepaBatches}
            issuerSiret={invoiceSettings?.issuerSiret}
            canExport={canView && canExportAccounting}
          />
        )}

        {activeTab === 'bank' && onSaveBankTransaction && onImportBankTransactions && (
          <FinancialBankReconciliationTab
            transactions={bankTransactions}
            incomeItems={incomeItems}
            supplierInvoices={supplierInvoices}
            sepaBatches={sepaBatches}
            canEdit={canEdit}
            onSaveTransaction={onSaveBankTransaction}
            onImportTransactions={onImportBankTransactions}
          />
        )}

        {activeTab === 'sponsors' && onSaveInvoiceSettings && (
          <FinancialSponsorsTab
            incomeItems={incomeItems}
            teamName={teamName}
            invoiceSettings={invoiceSettings}
            canEdit={canEdit}
            onSaveIncomeItem={onSaveIncomeItem}
            onSaveInvoiceSettings={onSaveInvoiceSettings}
            onOpenIncomeModal={openIncomeModal}
            onDeleteIncomeItem={handleDeleteIncomeItem}
            teamId={teamId}
            users={users}
            partnerAccesses={partnerAccesses}
            currentUserId={currentUser?.id}
            onSavePartnerAccess={onSavePartnerAccess}
            onRevokePartnerAccess={onRevokePartnerAccess}
            onOpenPartnerPortal={onOpenPartnerPortal}
            partnerNewsletters={partnerNewsletters}
            raceEvents={raceEvents}
            riders={riders}
            onSavePartnerNewsletter={onSavePartnerNewsletter}
            onInstallDemoPartnerExample={onInstallDemoPartnerExample}
            partnerMarketplaceProfiles={partnerMarketplaceProfiles}
            teamSponsorshipNeeds={teamSponsorshipNeeds}
            partnershipMatchRequests={partnershipMatchRequests}
            onSaveTeamSponsorshipNeed={onSaveTeamSponsorshipNeed}
            onRespondPartnershipMatchRequest={onRespondPartnershipMatchRequest}
          />
        )}
      </div>

      <Modal
        isOpen={isIncomeModalOpen}
        onClose={closeIncomeModal}
        title={editingIncomeItem ? t('financialEditIncome') : t('financialAddIncome')}
      >
        <IncomeForm
          item={editingIncomeItem}
          defaultCategory={defaultIncomeCategory}
          onSave={handleSaveIncomeItem}
          onCancel={closeIncomeModal}
        />
      </Modal>

      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => {
          setIsBudgetModalOpen(false);
          setEditingBudgetItem(null);
        }}
        title={editingBudgetItem ? t('financialEditExpense') : t('financialAddExpense')}
      >
        <BudgetForm
          item={editingBudgetItem}
          raceEvents={raceEvents}
          onSave={handleSaveBudgetItem}
          onCancel={() => {
            setIsBudgetModalOpen(false);
            setEditingBudgetItem(null);
          }}
        />
      </Modal>
    </SectionWrapper>
  );
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center p-8 bg-gray-50 rounded-lg border">
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  allCategoriesLabel,
  eventFilter,
  onEventFilterChange,
  raceEvents,
  allEventsLabel,
  generalEventLabel,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: string[];
  allCategoriesLabel: string;
  eventFilter?: string;
  onEventFilterChange?: (value: string) => void;
  raceEvents?: RaceEvent[];
  allEventsLabel?: string;
  generalEventLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="all">{allCategoriesLabel}</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      {onEventFilterChange && (
        <select
          value={eventFilter ?? 'all'}
          onChange={(e) => onEventFilterChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">{allEventsLabel}</option>
          <option value="general">{generalEventLabel}</option>
          {raceEvents?.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function FinancialListItem({
  title,
  subtitle,
  amount,
  amountSubtext,
  amountTone,
  badge,
  canEdit,
  editDisabledReason,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  amount: string;
  amountSubtext?: string;
  amountTone: 'green' | 'red';
  badge?: string;
  canEdit: boolean;
  editDisabledReason?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium text-gray-900">{title}</div>
            {badge && (
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{badge}</span>
            )}
          </div>
          <div className="text-sm text-gray-500">{subtitle}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <div className={`text-lg font-semibold ${amountTone === 'green' ? 'text-green-600' : 'text-red-600'}`}>
              {amount}
            </div>
            {amountSubtext && <div className="text-sm text-gray-500">{amountSubtext}</div>}
          </div>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Edit"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-gray-400 hover:text-red-600"
                aria-label="Delete"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </>
          )}
          {!canEdit && editDisabledReason && (
            <span className="max-w-[140px] text-xs text-gray-400">{editDisabledReason}</span>
          )}
        </div>
      </div>
    </li>
  );
}
