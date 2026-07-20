import React, { useEffect, useState } from 'react';
import SectionWrapper from '../components/SectionWrapper';
import SettingsTab from '../components/riderDetailTabs/SettingsTab';
import SettingsSection, { type SettingsSectionProps } from './SettingsSection';
import PricingSection from './PricingSection';
import PerformanceConnectionsPanel from '../components/PerformanceConnectionsPanel';
import { SubscriptionPlanId, TeamLevel, User, UserRole } from '../types';
import { SubscriptionAccess } from '../utils/subscriptionEntitlements';
import { resolvePricingAudience } from '../constants/subscriptionPlans';

export type UnifiedSettingsTab = 'compte' | 'equipe' | 'connexions' | 'abonnement';

type UserSettingsSectionProps = {
  currentUser: User;
  /** Affiche l’onglet Équipe (manager / admin). */
  canManageTeam?: boolean;
  /** Affiche l’onglet Abonnement. */
  showSubscriptionTab?: boolean;
  initialTab?: UnifiedSettingsTab;
  currentPlanId?: SubscriptionPlanId;
  teamLevel?: TeamLevel;
  onSelectPlan?: (
    planId: SubscriptionPlanId,
    referralCode?: string,
    interval?: 'month' | 'year'
  ) => void | Promise<void>;
  isIndependent?: boolean;
  userRole?: UserRole | string;
  canManageTeamBilling?: boolean;
  subscriptionAccess?: SubscriptionAccess;
  teamName?: string;
} & Partial<Omit<SettingsSectionProps, 'currentUser' | 'embedded' | 'subscriptionAccess'>>;

const UserSettingsSection: React.FC<UserSettingsSectionProps> = ({
  currentUser,
  canManageTeam = false,
  showSubscriptionTab = false,
  initialTab = 'compte',
  currentPlanId,
  teamLevel,
  onSelectPlan,
  isIndependent = false,
  userRole,
  canManageTeamBilling = false,
  subscriptionAccess,
  teamName,
  ...teamSettingsProps
}) => {
  const showTeamTab = Boolean(canManageTeam && teamSettingsProps.onUpdateTeam);
  const showBillingTab = Boolean(showSubscriptionTab);
  const pricingAudience = resolvePricingAudience({
    isIndependent,
    userRole: userRole ?? currentUser.userRole,
    canManageTeamBilling: canManageTeamBilling || canManageTeam,
  });

  const abonnementHint =
    pricingAudience === 'team_admin'
      ? 'Tarifs structure'
      : pricingAudience === 'team_member'
        ? 'Accès via l’équipe'
        : pricingAudience === 'independent_staff'
          ? 'Plan staff indépendant'
          : pricingAudience === 'independent_rider'
            ? 'Plan coureur indépendant'
            : 'Plans & facturation';

  const resolveTab = (tab: UnifiedSettingsTab | undefined): UnifiedSettingsTab => {
    if (tab === 'equipe' && showTeamTab) return 'equipe';
    if (tab === 'connexions') return 'connexions';
    if (tab === 'abonnement' && showBillingTab) return 'abonnement';
    return 'compte';
  };

  const [activeTab, setActiveTab] = useState<UnifiedSettingsTab>(() => resolveTab(initialTab));

  useEffect(() => {
    setActiveTab(resolveTab(initialTab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab, showTeamTab, showBillingTab]);

  useEffect(() => {
    if (activeTab === 'equipe' && !showTeamTab) setActiveTab('compte');
    if (activeTab === 'abonnement' && !showBillingTab) setActiveTab('compte');
  }, [showTeamTab, showBillingTab, activeTab]);

  const tabs: { id: UnifiedSettingsTab; label: string; hint: string }[] = [
    {
      id: 'compte',
      label: 'Mon compte',
      hint: 'Sécurité, RGPD, suppression',
    },
    ...(showTeamTab
      ? [
          {
            id: 'equipe' as const,
            label: 'Équipe',
            hint: 'Logo, thème, niveau, profil',
          },
        ]
      : []),
    {
      id: 'connexions',
      label: 'Connexions',
      hint: 'Nolio, Garmin, TrainingPeaks…',
    },
    ...(showBillingTab
      ? [
          {
            id: 'abonnement' as const,
            label: 'Abonnement',
            hint: abonnementHint,
          },
        ]
      : []),
  ];

  return (
    <SectionWrapper title="Paramètres">
      <div className="space-y-6">
        {tabs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-[9.5rem] flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    active
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                      : 'bg-slate-900 text-slate-200 border border-white/10 hover:bg-slate-800'
                  }`}
                >
                  <span className="block">{tab.label}</span>
                  <span
                    className={`block text-[10px] font-normal mt-0.5 ${
                      active ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    {tab.hint}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'compte' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-indigo-500/30 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold text-indigo-200 mb-2">Gestion de votre compte</h3>
              <p className="text-sm text-slate-300">
                Gérez vos données personnelles (RGPD), votre sécurité et la suppression de votre compte.
                Ces paramètres sont privés et ne sont visibles que par vous.
              </p>
            </div>
            <SettingsTab currentUser={currentUser} isOwnAccount={true} />
          </div>
        )}

        {activeTab === 'equipe' && showTeamTab && (
          <SettingsSection
            embedded
            currentUser={currentUser}
            teamLogoBase64={teamSettingsProps.teamLogoBase64}
            teamLogoMimeType={teamSettingsProps.teamLogoMimeType}
            setTeamLogoBase64={teamSettingsProps.setTeamLogoBase64 || (() => {})}
            setTeamLogoMimeType={teamSettingsProps.setTeamLogoMimeType || (() => {})}
            themePrimaryColor={teamSettingsProps.themePrimaryColor}
            setThemePrimaryColor={teamSettingsProps.setThemePrimaryColor || (() => {})}
            themeAccentColor={teamSettingsProps.themeAccentColor}
            setThemeAccentColor={teamSettingsProps.setThemeAccentColor || (() => {})}
            teamLevel={teamLevel}
            setTeamLevel={teamSettingsProps.setTeamLevel || (() => {})}
            operationalSettings={teamSettingsProps.operationalSettings}
            setOperationalSettings={teamSettingsProps.setOperationalSettings || (() => {})}
            onSaveOperationalSettings={teamSettingsProps.onSaveOperationalSettings}
            onTeamLevelChanged={teamSettingsProps.onTeamLevelChanged}
            onNavigateToChecklist={teamSettingsProps.onNavigateToChecklist}
            raceEvents={teamSettingsProps.raceEvents}
            language={teamSettingsProps.language}
            setLanguage={teamSettingsProps.setLanguage || (() => {})}
            team={teamSettingsProps.team}
            onUpdateTeam={teamSettingsProps.onUpdateTeam!}
            canDeleteTeam={teamSettingsProps.canDeleteTeam}
            onDeleteTeam={teamSettingsProps.onDeleteTeam}
            subscriptionAccess={subscriptionAccess}
            onUpgradePlan={teamSettingsProps.onUpgradePlan}
            onManageBillingPortal={teamSettingsProps.onManageBillingPortal}
            onInstallPresentationDemo={teamSettingsProps.onInstallPresentationDemo}
            presentationDemoAlreadyInstalled={teamSettingsProps.presentationDemoAlreadyInstalled}
            onNavigateToSubscription={() => setActiveTab('abonnement')}
          />
        )}

        {activeTab === 'connexions' && (
          <PerformanceConnectionsPanel currentUser={currentUser} />
        )}

        {activeTab === 'abonnement' && showBillingTab && (
          <PricingSection
            currentPlanId={currentPlanId ?? subscriptionAccess?.planId}
            teamLevel={teamLevel}
            onSelectPlan={onSelectPlan || teamSettingsProps.onUpgradePlan}
            isIndependent={isIndependent}
            userRole={userRole ?? currentUser.userRole}
            canManageTeamBilling={canManageTeamBilling || canManageTeam}
            subscriptionAccess={subscriptionAccess}
            teamName={teamName}
            audience={pricingAudience}
          />
        )}
      </div>
    </SectionWrapper>
  );
};

export default UserSettingsSection;
