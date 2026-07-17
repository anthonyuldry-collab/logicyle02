import React, { useEffect, useState } from 'react';
import { Rider, User, Team, AppState, PowerProfile, RaceEvent, AppSection } from '../types';
import { TeamBenchmarkData } from '../types/teamBenchmarks';
import SectionWrapper from '../components/SectionWrapper';
import MyPerformanceProjectSection from './MyPerformanceProjectSection';
import MyPerformanceHistoryPanel from '../components/MyPerformanceHistoryPanel';
import PowerPPRTab from '../components/riderDetailTabs/PowerPPRTab';
import StageCampPerformancePanel from '../components/performance/StageCampPerformancePanel';
import ActionButton from '../components/ActionButton';
import { UsersIcon } from '../components/icons';
import { getOwnRider } from '../utils/riderAccessUtils';
import { userToRiderProfile } from '../utils/independentUtils';
import { isValidRidersArray } from '../utils/riderUtils';
import { getCurrentSeasonYear, getSeasonLabel, getPlanningYears } from '../utils/seasonUtils';
import SeasonTransitionIndicator from '../components/SeasonTransitionIndicator';
import { POWER_ANALYSIS_DURATIONS_CONFIG } from '../constants';

type CareerTab = 'ppr' | 'analyse' | 'history' | 'bilan' | 'quality' | 'project' | 'stages' | 'teams';
type PowerSubTab = 'ppr' | 'analyse' | 'history' | 'summary';

interface MyCareerSectionProps {
  riders: Rider[];
  currentUser: User;
  onSaveRider: (rider: Rider) => void;
  teams?: Team[];
  appState: AppState;
  teamBenchmarks: TeamBenchmarkData;
  onSaveRaceEvent?: (event: RaceEvent) => Promise<void>;
  navigateTo?: (section: AppSection, eventId?: string) => void;
  initialTab?: CareerTab;
}

const TABS: { id: CareerTab; label: string }[] = [
  { id: 'ppr', label: '📊 PPR' },
  { id: 'analyse', label: '📈 Analyse' },
  { id: 'history', label: '📈 Historique' },
  { id: 'stages', label: '🏔 Suivi stages' },
  { id: 'bilan', label: '📋 Bilan' },
  { id: 'quality', label: '⭐ Suivi qualité' },
  { id: 'project', label: '🎯 Projet Performance' },
  { id: 'teams', label: '👥 Équipes' },
];

const CAREER_TO_POWER_SUB: Partial<Record<CareerTab, PowerSubTab>> = {
  ppr: 'ppr',
  analyse: 'analyse',
  history: 'history',
  bilan: 'summary',
};

const MyCareerSection: React.FC<MyCareerSectionProps> = ({
  riders,
  currentUser,
  onSaveRider,
  teams = [],
  appState,
  teamBenchmarks,
  onSaveRaceEvent,
  navigateTo,
  initialTab = 'ppr',
}) => {
  const [activeTab, setActiveTab] = useState<CareerTab>(initialTab);
  const [formData, setFormData] = useState<Rider | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const ridersValid = isValidRidersArray(riders);
  const riderProfile = ridersValid
    ? getOwnRider(riders, currentUser) || userToRiderProfile(currentUser)
    : undefined;

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (riderProfile) {
      setFormData(structuredClone(riderProfile));
    } else {
      setFormData(null);
    }
  }, [riderProfile]);

  if (!ridersValid) {
    return (
      <SectionWrapper title="Ma Carrière">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <p className="mt-4 text-lg font-medium text-gray-700">Chargement des données...</p>
          <p className="mt-2 text-gray-500">Veuillez patienter pendant le chargement de vos informations.</p>
        </div>
      </SectionWrapper>
    );
  }

  if (!riderProfile || !formData) {
    return (
      <SectionWrapper title="Ma Carrière">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  const getTabButtonStyle = (tabName: CareerTab) =>
    `px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap transition-colors duration-150 focus:outline-none ${
      activeTab === tabName
        ? 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const keys = name.split('.');
    setFormData((prev) => {
      if (!prev) return prev;
      const updated = structuredClone(prev);
      let current: any = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = { ...(current[key] || {}) };
        current = current[key];
      }
      const lastKey = keys[keys.length - 1];
      if (type === 'number') {
        current[lastKey] = value === '' ? undefined : Number(value);
      } else {
        current[lastKey] = value;
      }
      return updated;
    });
  };

  const handleDeleteProfile = (
    profileKey: 'powerProfile15KJ' | 'powerProfile30KJ' | 'powerProfile45KJ'
  ) => {
    setFormData((prev) => (prev ? { ...prev, [profileKey]: undefined } : prev));
  };

  const handleSavePpr = async () => {
    if (!formData) return;
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      await onSaveRider(formData);
      setSaveFeedback('Performances enregistrées.');
    } catch (error) {
      console.error('Erreur sauvegarde PPR:', error);
      setSaveFeedback('Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScoutingToggle = async () => {
    const updatedRider = {
      ...formData,
      isSearchable: !formData.isSearchable,
    };
    try {
      await onSaveRider(updatedRider);
      setFormData(updatedRider);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil de scouting:', error);
    }
  };

  const teamRidersForAnalysis =
    teamBenchmarks.riders?.length > 0 ? teamBenchmarks.riders : appState.riders || [];

  const powerSubTab = CAREER_TO_POWER_SUB[activeTab];

  const ScoutingToggle = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Partage pour le Scouting</h3>
          <p className="text-sm text-gray-600 mt-1">
            Rendez votre profil visible pour les recruteurs et les équipes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`text-sm font-medium ${
              formData.isSearchable ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            {formData.isSearchable ? 'Profil partagé' : 'Profil privé'}
          </span>
          <button
            type="button"
            onClick={handleScoutingToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              formData.isSearchable ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.isSearchable ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPowerTabs = () => {
    if (!powerSubTab) return null;
    return (
      <div className="space-y-4">
        {activeTab === 'ppr' && <ScoutingToggle />}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {activeTab === 'ppr' && 'Profils de puissance (PPR)'}
                {activeTab === 'analyse' && 'Analyse vs groupe'}
                {activeTab === 'history' && 'Historique PPR'}
                {activeTab === 'bilan' && 'Bilan des performances'}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Mêmes outils que l&apos;onglet performance coach, pour votre dossier athlète.
              </p>
            </div>
            {activeTab === 'ppr' && (
              <div className="flex items-center gap-2">
                {saveFeedback && (
                  <span
                    className={`text-sm ${
                      saveFeedback.includes('Erreur') ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {saveFeedback}
                  </span>
                )}
                <ActionButton onClick={handleSavePpr} disabled={isSaving}>
                  {isSaving ? 'Enregistrement…' : 'Enregistrer'}
                </ActionButton>
              </div>
            )}
          </div>
          <PowerPPRTab
            formData={formData}
            handleInputChange={handleInputChange}
            formFieldsEnabled
            powerDurationsConfig={POWER_ANALYSIS_DURATIONS_CONFIG as {
              key: keyof PowerProfile;
              label: string;
              unit: string;
              sortable: boolean;
            }[]}
            theme="light"
            onDeleteProfile={handleDeleteProfile}
            onSaveRequest={handleSavePpr}
            allRiders={teamRidersForAnalysis}
            activeSubTab={powerSubTab}
            hideSubTabNav
          />
        </div>
      </div>
    );
  };

  const getYear = (dateString: string) => new Date(dateString).getFullYear();

  const formatTeamPeriod = (startDate: string, endDate?: string) => {
    const startYear = getYear(startDate);
    const endYear = endDate ? getYear(endDate) : new Date().getFullYear();
    const isCurrent = !endDate;
    if (startYear === endYear) {
      return isCurrent ? `${startYear} - Aujourd'hui` : startYear.toString();
    }
    return `${startYear} - ${isCurrent ? "Aujourd'hui" : endYear}`;
  };

  const prepareTeamsList = () => {
    const teamsHistory = formData.teamsHistory || [];
    const currentTeamName = formData.teamName;
    let allTeams = [...teamsHistory];
    if (currentTeamName && !teamsHistory.some((team) => team.teamName === currentTeamName)) {
      allTeams.unshift({
        teamName: currentTeamName,
        startDate: `${getCurrentSeasonYear()}-01-01`,
        endDate: undefined,
        role: 'Coureur',
        status: 'Actif' as const,
        achievements: [],
      });
    }
    return allTeams.sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  };

  const renderTeamsTab = () => {
    const teamList = prepareTeamsList();
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes Équipes</h3>
          {teamList.length > 0 ? (
            <div className="space-y-3">
              {teamList.map((team, index) => {
                const isCurrentTeam = !team.endDate;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isCurrentTeam ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">{team.teamName}</h4>
                        <p className="text-sm text-gray-600">
                          {formatTeamPeriod(team.startDate, team.endDate)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isCurrentTeam
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isCurrentTeam ? 'Actuel' : 'Ancien'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <UsersIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Aucune équipe renseignée</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    if (powerSubTab) return renderPowerTabs();
    if (activeTab === 'quality') {
      return (
        <MyPerformanceHistoryPanel
          rider={formData}
          appState={appState}
          teamBenchmarks={teamBenchmarks}
          currentUser={currentUser}
        />
      );
    }
    if (activeTab === 'project') {
      return (
        <MyPerformanceProjectSection
          riders={[formData]}
          currentUser={currentUser}
          onSaveRider={onSaveRider}
        />
      );
    }
    if (activeTab === 'stages') {
      return (
        <StageCampPerformancePanel
          appState={appState}
          onSaveRaceEvent={onSaveRaceEvent}
          lockedRiderId={formData.id}
          readOnly={false}
          onOpenEvent={
            navigateTo ? (eventId) => navigateTo('eventDetail', eventId) : undefined
          }
        />
      );
    }
    if (activeTab === 'teams') return renderTeamsTab();
    return null;
  };

  return (
    <SectionWrapper title="Ma Carrière">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {getSeasonLabel(getCurrentSeasonYear())}
            </h2>
            <SeasonTransitionIndicator seasonYear={getCurrentSeasonYear()} showDetails={true} />
          </div>
          <div className="text-sm text-gray-600">
            Années de planification disponibles : {getPlanningYears().join(', ')}
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={getTabButtonStyle(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {renderActiveTab()}
      </div>
    </SectionWrapper>
  );
};

export default MyCareerSection;
