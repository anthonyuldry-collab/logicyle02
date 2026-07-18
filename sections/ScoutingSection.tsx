import React, { useState, useMemo, useEffect } from 'react';
import { ScoutingProfile, Rider, RiderQualitativeProfile, DisciplinePracticed, FormeStatus, MoralStatus, HealthCondition, PerformanceFactorDetail, PowerProfile, ScoutingStatus, Sex, User, UserRole, AppState, ProspectLevel, ScoutingDataScope, TeamRecruitmentTarget, TeamMembership } from '../types';
import { SCOUTING_STATUS_COLORS, defaultRiderCharCap, SPIDER_CHART_CHARACTERISTICS_CONFIG, initialScoutingProfileFormState, POWER_PROFILE_REFERENCE_TABLES, riderProfileKeyToRefTableKeyMap, POWER_ANALYSIS_DURATIONS_CONFIG, PROFILE_WEIGHTS, PERFORMANCE_SCORE_WEIGHTS, COLLECTIVE_SCORE_PENALTY_THRESHOLD, COLLECTIVE_SCORE_PENALTY_MULTIPLIER, CATEGORY_ID_TO_SCALE_MAP, EVENT_CATEGORY_POINTS_TABLE, COGGAN_CATEGORY_COLORS, ALL_COUNTRIES, RIDER_LEVEL_CATEGORIES, PERFORMANCE_PROJECT_FACTORS_CONFIG } from '../constants';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import Modal from '../components/Modal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ArrowUpCircleIcon from '../components/icons/ArrowUpCircleIcon';
import SearchIcon from '../components/icons/SearchIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import PaperAirplaneIcon from '../components/icons/PaperAirplaneIcon';
import TalentSearchTab from '../components/TalentSearchTab';
import { RiderDetailModal } from '../components/RiderDetailModal';
import { calculateRiderCharacteristics } from '../utils/performanceCalculations';
import { getRiderCharacteristicSafe } from '../utils/riderUtils';
import StarIcon from '../components/icons/StarIcon';
import { ResultsTab } from '../components/riderDetailTabs/ResultsTab';
import {
  buildDirectVeloSearchUrl,
  buildPcsSearchUrl,
  openExternalUrl,
} from '../utils/cyclingResultsLinks';
import { demoUserToScoutingProfile, isDemoPreviewScoutingProfile, isDemoTalentUser } from '../constants/demoTalentProfiles';
import {
  buildContactRequestMessage,
  buildWatchlistProfileFromUser,
  getProspectLevelLabel,
  isAthleteOnWatchlist,
} from '../utils/scoutingProspectUtils';
import TeamRecruitmentPanel from '../components/TeamRecruitmentPanel';
import SpiderChart from '../components/SpiderChart';

interface ScoutingSectionProps {
  scoutingProfiles: ScoutingProfile[];
  riders?: Rider[];
  onSaveScoutingProfile: (profile: ScoutingProfile) => void;
  onDeleteScoutingProfile: (profileId: string) => void;
  onSaveRider?: (rider: Rider) => void | Promise<void>;
  onCreateScoutingRequest?: (
    athleteId: string,
    message?: string,
    requestedScopes?: ScoutingDataScope[],
  ) => Promise<string>;
  effectivePermissions?: any;
  appState?: AppState;
  currentTeamId?: string | null;
  onRecruitmentTargetChange?: (target: TeamRecruitmentTarget) => void;
  onReviewRiderApplication?: (
    membership: TeamMembership,
    action: 'approve' | 'deny',
  ) => Promise<void>;
  setRecruitmentOffers?: React.Dispatch<React.SetStateAction<import('../types').TeamRecruitmentOffer[]>>;
  setRecruitmentCampaigns?: React.Dispatch<React.SetStateAction<import('../types').TeamRecruitmentCampaign[]>>;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const powerMetricsConfig: { key: keyof PowerProfile; label: string; unit: string; }[] = POWER_ANALYSIS_DURATIONS_CONFIG.map(
    ({ key, label, unit }) => ({ key, label, unit })
);

const getAge = (birthDate?: string): number | null => {
    if (!birthDate || typeof birthDate !== 'string') {
        return null;
    }
    const birthTime = Date.parse(birthDate);
    if (isNaN(birthTime)) {
        return null;
    }
    const birth = new Date(birthTime);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age >= 0 ? age : null;
};


const getInitialPerformanceFactorDetail = (factorId: keyof Pick<Rider, 'physiquePerformanceProject' | 'techniquePerformanceProject' | 'mentalPerformanceProject' | 'environnementPerformanceProject' | 'tactiquePerformanceProject'>): PerformanceFactorDetail => {
    return {
        forces: (PERFORMANCE_PROJECT_FACTORS_CONFIG.find(f => f.id === factorId)?.forcesPrompts || []).map(p => `- ${p}`).join('\n'),
        aOptimiser: '',
        aDevelopper: '',
        besoinsActions: '',
    };
};

type SortKey = keyof ScoutingProfile | 'age' | keyof PowerProfile | string;

const ScoutingSection: React.FC<ScoutingSectionProps> = ({ scoutingProfiles, riders = [], onSaveScoutingProfile, onDeleteScoutingProfile, onSaveRider, onCreateScoutingRequest, effectivePermissions, appState, currentTeamId, onRecruitmentTargetChange, onReviewRiderApplication, setRecruitmentOffers, setRecruitmentCampaigns }) => {
  // Protection minimale - seulement scoutingProfiles est requis
  if (!scoutingProfiles) {
    return (
      <SectionWrapper title="Scouting">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <h3 className="text-xl font-semibold text-gray-700">Chargement...</h3>
          <p className="mt-2 text-gray-500">Initialisation des données de scouting...</p>
        </div>
      </SectionWrapper>
    );
  }

  const [activeTab, setActiveTab] = useState<'profiles' | 'search' | 'analysis' | 'recruitment'>('profiles');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Omit<ScoutingProfile, 'id'> | ScoutingProfile>(initialScoutingProfileFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'power' | 'project' | 'interview' | 'results'>('info');
  const [confirmAction, setConfirmAction] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<ScoutingProfile | null>(null);
  
  const [addProspectModal, setAddProspectModal] = useState<{isOpen: boolean; mode: 'choice' | 'manual' | 'scout'; initialData?: ScoutingProfile | null }>({isOpen: false, mode: 'choice' });

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'potentialRating', direction: 'desc' });
  const [filters, setFilters] = useState({
      name: '',
      status: 'all',
      discipline: 'all',
      nationality: 'all'
  });
  
  const [selectedProfileIdsForAnalysis, setSelectedProfileIdsForAnalysis] = useState<string[]>([]);
  const [analysisSubTab, setAnalysisSubTab] = useState<'synthese' | 'fatigue'>('synthese');
  const [fatigueKjTab, setFatigueKjTab] = useState<'15' | '30' | '45'>('15');
  const [analysisSearch, setAnalysisSearch] = useState<string>('');
  const [analysisTypeFilter, setAnalysisTypeFilter] = useState<'all' | 'scoot' | 'n1' | 'reserve'>('all');
  const [analysisSelectedFirst, setAnalysisSelectedFirst] = useState<boolean>(true);
  const [analysisProfileFilter, setAnalysisProfileFilter] = useState<'all' | 'sprinteur' | 'puncheur' | 'grimpeur' | 'rouleur'>('all');

  const filteredProfiles = useMemo(() => {
    if (!scoutingProfiles) return [];
    let profiles = [...scoutingProfiles];
    if (filters.name) {
        profiles = profiles.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(filters.name.toLowerCase()));
    }
    if (filters.status !== 'all') {
        profiles = profiles.filter(p => p.status === filters.status);
    }
    if (filters.discipline !== 'all') {
        profiles = profiles.filter(p => p.discipline === filters.discipline);
    }
    if (filters.nationality !== 'all') {
        profiles = profiles.filter(p => p.nationality === filters.nationality);
    }

    if (sortConfig) {
        profiles.sort((a, b) => {
            let aValue: any, bValue: any;
            if (sortConfig.key === 'age') {
                aValue = getAge(a.birthDate) ?? 99;
                bValue = getAge(b.birthDate) ?? 99;
            } else if (sortConfig.key === 'charSprint' || sortConfig.key === 'charAnaerobic' || sortConfig.key === 'charPuncher' || sortConfig.key === 'charClimbing' || sortConfig.key === 'charRouleur') {
                aValue = getRiderCharacteristicSafe(a, sortConfig.key);
                bValue = getRiderCharacteristicSafe(b, sortConfig.key);
            } else {
                aValue = a[sortConfig.key as keyof ScoutingProfile] ?? '';
                bValue = b[sortConfig.key as keyof ScoutingProfile] ?? '';
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }
            return 0;
        });
    }

    return profiles;
  }, [scoutingProfiles, filters, sortConfig]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return ' ';
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const keys = name.split('.');

    setCurrentItem(prev => {
        const newFormData = structuredClone(prev);
        let currentLevel: any = newFormData;

        for (let i = 0; i < keys.length - 1; i++) {
            currentLevel = currentLevel[keys[i]] = currentLevel[keys[i]] || {};
        }

        const lastKey = keys[keys.length - 1];
        if (type === 'number') {
            currentLevel[lastKey] = value === '' ? undefined : parseFloat(String(value).replace(',', '.'));
        } else {
            currentLevel[lastKey] = value;
        }
        
        return {
          ...newFormData,
          ...calculateRiderCharacteristics(newFormData),
        };
    });
  };

  const openExternal = openExternalUrl;

  const buildPcsSearchUrlForProfile = (firstName?: string, lastName?: string) =>
    buildPcsSearchUrl(firstName, lastName);

  const buildDirectVeloSearchUrlForProfile = (firstName?: string, lastName?: string) =>
    buildDirectVeloSearchUrl(firstName, lastName);

  const handleSaveProfile = () => {
    if (isEditing && 'id' in currentItem) {
        onSaveScoutingProfile(currentItem);
    } else {
        const newProfile = { ...currentItem, id: generateId() } as ScoutingProfile;
        onSaveScoutingProfile(newProfile);
    }
    setIsModalOpen(false);
  };
  
  const buildRiderFromProfile = (profile: ScoutingProfile, rosterRole: 'principal' | 'reserve'): Rider => ({
    ...profile,
    qualitativeProfile: profile.qualitativeProfile || RiderQualitativeProfile.AUTRE,
    id: `rider_${profile.id}_${Date.now()}`,
    disciplines: [profile.discipline],
    categories: profile.categories || [],
    performanceGoals: '',
    forme: FormeStatus.INCONNU,
    moral: MoralStatus.INCONNU,
    healthCondition: HealthCondition.PRET_A_COURIR,
    favoriteRaces: [],
    resultsHistory: [],
    allergies: profile.allergies || [],
    performanceNutrition: { carbsPerHourTarget: 0, hydrationNotes: '', selectedGels: [], selectedBars: [], selectedDrinks: [], customProducts: [] },
    roadBikeSetup: { specifics: {}, cotes: {} },
    ttBikeSetup: { specifics: {}, cotes: {} },
    clothing: [],
    physiquePerformanceProject: getInitialPerformanceFactorDetail('physiquePerformanceProject'),
    techniquePerformanceProject: getInitialPerformanceFactorDetail('techniquePerformanceProject'),
    mentalPerformanceProject: getInitialPerformanceFactorDetail('mentalPerformanceProject'),
    environnementPerformanceProject: getInitialPerformanceFactorDetail('environnementPerformanceProject'),
    tactiquePerformanceProject: getInitialPerformanceFactorDetail('tactiquePerformanceProject'),
    charSprint: profile.charSprint ?? 0,
    charAnaerobic: profile.charAnaerobic ?? 0,
    charPuncher: profile.charPuncher ?? 0,
    charClimbing: profile.charClimbing ?? 0,
    charRouleur: profile.charRouleur ?? 0,
    generalPerformanceScore: profile.generalPerformanceScore ?? 0,
    fatigueResistanceScore: profile.fatigueResistanceScore ?? 0,
    rosterRole,
  });

  const handlePromoteToRoster = (profile: ScoutingProfile) => {
    setPromoteTarget(profile);
  };

  const handleConfirmPromote = async (rosterRole: 'principal' | 'reserve') => {
    const profile = promoteTarget;
    if (!profile || !onSaveRider) {
      setPromoteTarget(null);
      return;
    }
    try {
      const newRider = buildRiderFromProfile(profile, rosterRole);
      await onSaveRider(newRider);
      onDeleteScoutingProfile(profile.id);
    } catch (e) {
      console.error('Erreur lors de la promotion dans l\'effectif:', e);
      alert('Impossible d\'ajouter le coureur à l\'effectif. Vérifiez qu\'une équipe est sélectionnée.');
    } finally {
      setPromoteTarget(null);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    setConfirmAction({
      title: "Supprimer le profil",
      message: "Êtes-vous sûr de vouloir supprimer ce profil de scouting ?",
      onConfirm: () => {
        onDeleteScoutingProfile(profileId);
      }
    });
  };

  const openAddModal = () => {
    setCurrentItem({
      ...initialScoutingProfileFormState,
      ...defaultRiderCharCap,
      prospectLevel: ProspectLevel.WATCHLIST,
      powerProfileFresh: {},
      powerProfile15KJ: {},
      powerProfile30KJ: {},
      powerProfile45KJ: {},
    });
    setIsEditing(false);
    setActiveModalTab('info');
    setIsModalOpen(true);
  };
  
  const openEditModal = (profile: ScoutingProfile) => {
    setCurrentItem({
      ...structuredClone(profile),
      powerProfileFresh: profile.powerProfileFresh || {},
      powerProfile15KJ: profile.powerProfile15KJ || {},
      powerProfile30KJ: profile.powerProfile30KJ || {},
      powerProfile45KJ: profile.powerProfile45KJ || {},
    });
    setIsEditing(true);
    setActiveModalTab('info');
    setIsModalOpen(true);
  };
  
  const allProfilesForAnalysis = useMemo(() => {
    const combined = [
        ...scoutingProfiles.map(s => ({ ...s, id: s.id, name: `${s.firstName} ${s.lastName}`, type: 'Scoot' })),
        ...riders.map(r => {
            const rosterRole = (r as Rider).rosterRole ?? 'principal';
            const roleLabel = rosterRole === 'reserve' ? 'Réserve' : 'N1';
            return ({ ...r, id: r.id, name: `${r.firstName} ${r.lastName}`, type: `Équipe (${roleLabel})` });
        })
    ];
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [scoutingProfiles, riders]);

  const normalizedAnalysisSearch = analysisSearch.trim().toLowerCase();
  const filteredProfilesForPicker = useMemo(() => {
    const dominantProfile = (p: any): 'sprinteur' | 'puncheur' | 'grimpeur' | 'rouleur' => {
      const sprint = getRiderCharacteristicSafe(p, 'charSprint');
      const anaer = getRiderCharacteristicSafe(p, 'charAnaerobic');
      const punch = getRiderCharacteristicSafe(p, 'charPuncher');
      const climb = getRiderCharacteristicSafe(p, 'charClimbing');
      const roul = getRiderCharacteristicSafe(p, 'charRouleur');

      // Heuristique simple: le "sprinteur" combine sprint + anaérobie
      const sprinteurScore = sprint + anaer * 0.7;
      const puncheurScore = punch + anaer * 0.4;
      const grimpeurScore = climb;
      const rouleurScore = roul;

      const scores: Array<{ id: 'sprinteur' | 'puncheur' | 'grimpeur' | 'rouleur'; v: number }> = [
        { id: 'sprinteur', v: sprinteurScore },
        { id: 'puncheur', v: puncheurScore },
        { id: 'grimpeur', v: grimpeurScore },
        { id: 'rouleur', v: rouleurScore },
      ];
      scores.sort((a, b) => b.v - a.v);
      return scores[0]?.id ?? 'rouleur';
    };

    const matchesType = (p: any) => {
      if (analysisTypeFilter === 'all') return true;
      if (analysisTypeFilter === 'scoot') return p.type === 'Scoot';
      if (analysisTypeFilter === 'reserve') return typeof p.type === 'string' && p.type.includes('Réserve');
      if (analysisTypeFilter === 'n1') return typeof p.type === 'string' && p.type.includes('N1');
      return true;
    };

    const matchesProfile = (p: any) => {
      if (analysisProfileFilter === 'all') return true;
      return dominantProfile(p) === analysisProfileFilter;
    };

    const matchesSearch = (p: any) => {
      if (!normalizedAnalysisSearch) return true;
      const hay = `${p.name ?? ''} ${p.type ?? ''}`.toLowerCase();
      return hay.includes(normalizedAnalysisSearch);
    };

    const base = allProfilesForAnalysis.filter((p) => matchesType(p) && matchesProfile(p) && matchesSearch(p));
    if (!analysisSelectedFirst) return base;

    return [...base].sort((a, b) => {
      const aSel = selectedProfileIdsForAnalysis.includes(a.id) ? 0 : 1;
      const bSel = selectedProfileIdsForAnalysis.includes(b.id) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''));
    });
  }, [
    allProfilesForAnalysis,
    analysisTypeFilter,
    analysisProfileFilter,
    normalizedAnalysisSearch,
    analysisSelectedFirst,
    selectedProfileIdsForAnalysis,
  ]);

  const handleProfileSelectionForAnalysis = (profileId: string) => {
    setSelectedProfileIdsForAnalysis(prev => {
        if (prev.includes(profileId)) {
            return prev.filter(id => id !== profileId);
        }
        if (prev.length < 6) {
            return [...prev, profileId];
        }
        return prev;
    });
  };

  const renderProfilesTab = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center shadow-sm">
        <input
          type="text"
          name="name"
          value={filters.name}
          onChange={handleFilterChange}
          placeholder="Rechercher par nom..."
          className="input-field-sm col-span-full md:col-span-1 !rounded-full"
        />
        <select name="status" value={filters.status} onChange={handleFilterChange} className="input-field-sm !rounded-full">
          <option value="all">Tous Statuts</option>
          {Object.values(ScoutingStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="discipline" value={filters.discipline} onChange={handleFilterChange} className="input-field-sm !rounded-full">
          <option value="all">Toutes Disciplines</option>
          {Object.values(DisciplinePracticed).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select name="nationality" value={filters.nationality} onChange={handleFilterChange} className="input-field-sm !rounded-full">
          <option value="all">Toutes Nationalités</option>
          {ALL_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden shadow-xl shadow-black/20">
        <div className="overflow-x-auto max-w-full p-2 sm:p-3">
          <table className="min-w-full text-sm max-w-full border-separate border-spacing-y-2 border-spacing-x-1.5">
            <thead>
              <tr>
                <th className="rounded-xl bg-slate-800/90 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 border border-white/10 cursor-pointer" onClick={() => requestSort('firstName')}>Nom {getSortIndicator('firstName')}</th>
                <th className="rounded-xl bg-slate-800/90 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 border border-white/10 cursor-pointer" onClick={() => requestSort('age')}>Âge {getSortIndicator('age')}</th>
                <th className="rounded-xl bg-slate-800/90 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 border border-white/10">Niveau</th>
                <th className="rounded-xl bg-slate-800/90 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 border border-white/10 cursor-pointer" onClick={() => requestSort('status')}>Statut {getSortIndicator('status')}</th>
                <th className="rounded-xl bg-slate-800/90 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 border border-white/10 cursor-pointer" onClick={() => requestSort('potentialRating')}>Potentiel {getSortIndicator('potentialRating')}</th>
                <th className="rounded-xl bg-slate-800/90 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 border border-white/10 cursor-pointer" onClick={() => requestSort('qualitativeProfile')}>Profil {getSortIndicator('qualitativeProfile')}</th>
                {SPIDER_CHART_CHARACTERISTICS_CONFIG.map(char => (
                  <th key={char.key} className="rounded-xl bg-slate-800/90 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 border border-white/10 cursor-pointer" onClick={() => requestSort(char.key)}>{char.label} {getSortIndicator(char.key)}</th>
                ))}
                <th className="rounded-xl bg-slate-800/90 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 border border-white/10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map(profile => (
                <tr key={profile.id} className="group">
                  <td className="rounded-2xl border border-white/10 bg-slate-800/55 px-3 py-3 text-center font-semibold text-slate-100 group-hover:bg-slate-800/80 transition-colors">
                    {profile.firstName} {profile.lastName}
                  </td>
                  <td className="rounded-2xl border border-white/10 bg-slate-800/55 px-3 py-3 text-center text-slate-300 group-hover:bg-slate-800/80 transition-colors">
                    {getAge(profile.birthDate)}
                  </td>
                  <td className="rounded-2xl border border-white/10 bg-slate-800/55 px-3 py-3 text-center text-slate-300 text-xs group-hover:bg-slate-800/80 transition-colors">
                    {getProspectLevelLabel(profile.prospectLevel)}
                  </td>
                  <td className="rounded-2xl border border-white/10 bg-slate-800/55 px-3 py-3 text-center group-hover:bg-slate-800/80 transition-colors">
                    <span className={`inline-flex max-w-[11rem] items-center justify-center px-2.5 py-1 text-[11px] font-semibold leading-tight rounded-full whitespace-normal ${SCOUTING_STATUS_COLORS[profile.status]}`}>
                      {profile.status}
                    </span>
                  </td>
                  <td className="rounded-2xl border border-white/10 bg-slate-800/55 px-3 py-3 text-center text-slate-300 group-hover:bg-slate-800/80 transition-colors">
                    {profile.potentialRating} / 5
                  </td>
                  <td className="rounded-2xl border border-white/10 bg-slate-800/55 px-3 py-3 text-center text-slate-300 group-hover:bg-slate-800/80 transition-colors">
                    {profile.qualitativeProfile}
                  </td>
                  {SPIDER_CHART_CHARACTERISTICS_CONFIG.map(char => (
                    <td key={char.key} className="rounded-2xl border border-white/10 bg-slate-800/55 px-3 py-3 text-center font-mono text-slate-200 group-hover:bg-slate-800/80 transition-colors">
                      {getRiderCharacteristicSafe(profile, char.key).toFixed(0)}
                    </td>
                  ))}
                  <td className="rounded-2xl border border-white/10 bg-slate-800/55 px-3 py-3 text-center group-hover:bg-slate-800/80 transition-colors">
                    <div className="inline-flex items-center justify-center gap-1">
                      <ActionButton onClick={() => openEditModal(profile)} variant="secondary" size="sm" icon={<PencilIcon className="w-3 h-3"/>} />
                      <ActionButton onClick={() => handlePromoteToRoster(profile)} variant="primary" size="sm" icon={<ArrowUpCircleIcon className="w-4 h-4" />} title="Promouvoir dans l'effectif"/>
                      <ActionButton onClick={() => handleDeleteProfile(profile.id)} variant="danger" size="sm" icon={<TrashIcon className="w-3 h-3" />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSearchTab = () => {
    if (!appState || !currentTeamId) {
      return (
        <div className="text-center p-8 bg-slate-700 rounded-lg">
          <h3 className="text-xl font-semibold text-slate-300">Données non disponibles</h3>
          <p className="mt-2 text-slate-400">Les données nécessaires pour la recherche de talents ne sont pas disponibles.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-blue-300 font-semibold mb-2">Recrutement — deux niveaux de prospect</h4>
          <ul className="text-blue-200 text-sm list-disc list-inside space-y-1">
            <li>
              <strong>Suivi discret</strong> : prospect interne, l&apos;athlète n&apos;est pas informé
            </li>
            <li>
              <strong>Demande de contact</strong> : coordination, données performance et/ou projet sportif — l&apos;athlète choisit ce qu&apos;il partage
            </li>
            <li>Avant acceptation : nom, âge, nationalité et discipline uniquement</li>
          </ul>
        </div>
        
        <TalentSearchTab 
          appState={appState}
          onRecruitmentTargetChange={onRecruitmentTargetChange}
          onAddWatchlistProspect={(user) => {
            if (isAthleteOnWatchlist(user.id, scoutingProfiles)) return;
            onSaveScoutingProfile(buildWatchlistProfileFromUser(user, riders));
          }}
          onRequestScoutingAccess={async (user, requestedScopes) => {
            if (!currentTeamId || !onCreateScoutingRequest) return;
            const teamName = appState?.teams?.find((t) => t.id === currentTeamId)?.name || 'notre équipe';
            await onCreateScoutingRequest(
              user.id,
              buildContactRequestMessage(teamName, requestedScopes),
              requestedScopes,
            );
          }}
          onProfileSelect={(user) => {
          if (isDemoTalentUser(user.id)) {
            const demoProfile = demoUserToScoutingProfile(user);
            setCurrentItem(demoProfile);
            setIsEditing(false);
            setActiveModalTab('info');
            setIsModalOpen(true);
            return;
          }

          const newScoutProfile = {
            id: `scout_${generateId()}`,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            birthDate: user.signupInfo?.birthDate,
            sex: user.signupInfo?.sex,
            nationality: user.signupInfo?.nationality,
            heightCm: user.signupInfo?.heightCm,
            weightKg: user.signupInfo?.weightKg,
            qualitativeProfile: user.qualitativeProfile || RiderQualitativeProfile.AUTRE,
            categories: user.categories || [],
            forme: user.forme || 'BONNE',
            moral: user.moral || 'BON',
            healthCondition: user.healthCondition || 'BONNE',
            potentialRating: 3,
            status: 'TO_WATCH',
            prospectLevel: ProspectLevel.CONTACT_REQUEST,
            linkedAthleteUserId: user.id,
            discipline: user.disciplines?.[0] || DisciplinePracticed.ROUTE,
            powerProfile: user.powerProfile || {},
            characteristics: user.characteristics || {},
            notes: '',
            lastContactDate: new Date().toISOString().split('T')[0],
            nextContactDate: '',
            teamInterest: false,
            riderInterest: false,
            contractOffered: false,
            contractSigned: false,
            salaryOffered: 0,
            contractStartDate: '',
            scoutingSource: 'TALENT_SEARCH',
            scoutingNotes: 'Profil trouvé via recherche de talents',
            performanceData: user.performanceData || {},
            resultsHistory: user.resultsHistory || [],
            favoriteRaces: user.favoriteRaces || [],
            teamsHistory: user.teamsHistory || [],
            address: user.address,
            phone: user.phone,
            emergencyContactName: user.emergencyContactName,
            emergencyContactPhone: user.emergencyContactPhone,
            socialSecurityNumber: user.socialSecurityNumber,
            licenseNumber: user.licenseNumber,
            uciId: user.uciId,
            photoUrl: user.photoUrl,
            licenseImageUrl: user.licenseImageUrl,
            licenseImageBase64: user.licenseImageBase64,
            licenseImageMimeType: user.licenseImageMimeType,
            teamName: user.teamName,
            isSearchable: user.isSearchable,
            salary: user.salary,
            contractEndDate: user.contractEndDate,
            nextSeasonTeam: user.nextSeasonTeam,
            allergies: [],
          } as ScoutingProfile;
          
          onSaveScoutingProfile(newScoutProfile);
          setActiveTab('profiles'); // Basculer vers l'onglet profils
        }} 
        currentTeamId={currentTeamId}
      />
      </div>
    );
  };
  
  const renderAnalysisTab = () => {
    const selectedProfiles = allProfilesForAnalysis.filter(p => selectedProfileIdsForAnalysis.includes(p.id));
    const getWkg = (p: any, profileKey: string, powerKey: string): number | null => {
        const weight = typeof p?.weightKg === 'number' && !Number.isNaN(p.weightKg) && p.weightKg > 0 ? p.weightKg : null;
        if (!weight) return null;
        const profile = p?.[profileKey] ?? (profileKey === 'powerProfileFresh' ? p?.powerProfile : undefined);
        const power = profile?.[powerKey];
        if (typeof power !== 'number' || Number.isNaN(power) || power <= 0) return null;
        return power / weight;
    };

    const getDeltaPct = (p: any, fatiguedProfileKey: string, powerKey: string): number | null => {
        const fresh = getWkg(p, 'powerProfileFresh', powerKey);
        const fatigued = getWkg(p, fatiguedProfileKey, powerKey);
        if (fresh == null || fresh <= 0 || fatigued == null) return null;
        return ((fatigued - fresh) / fresh) * 100;
    };

    const baseMetrics = [
        { key: 'age', label: 'Âge', invertColor: true, format: (v: number) => v.toFixed(0) },
        { key: 'potentialRating', label: 'Potentiel ★', format: (v: number) => v.toFixed(1) },
        { key: 'generalPerformanceScore', label: 'Note Générale', format: (v: number) => v.toFixed(0) },
        { key: 'fatigueResistanceScore', label: 'Résistance Fatigue', format: (v: number) => v.toFixed(0) },
        { key: 'powerProfileFresh.power5s', label: 'PMax 5s (W/kg)', format: (v: number) => v.toFixed(1) },
        { key: 'powerProfileFresh.power1min', label: 'PMax 1min (W/kg)', format: (v: number) => v.toFixed(1) },
        { key: 'powerProfileFresh.power5min', label: 'PMax 5min (W/kg)', format: (v: number) => v.toFixed(1) },
        { key: 'powerProfileFresh.criticalPower', label: 'FTP (W/kg)', format: (v: number) => v.toFixed(1) }
    ];

    const fatiguePowerKeys: Array<{ key: keyof PowerProfile; label: string }> = [
        { key: 'power5s', label: 'PMax 5s' },
        { key: 'power1min', label: 'PMax 1min' },
        { key: 'power5min', label: 'PMax 5min' },
        { key: 'criticalPower', label: 'FTP' },
    ];

    const fatigueProfiles: Array<{ profileKey: 'powerProfile15KJ' | 'powerProfile30KJ' | 'powerProfile45KJ'; label: string }> = [
        { profileKey: 'powerProfile15KJ', label: '15 kJ/kg' },
        { profileKey: 'powerProfile30KJ', label: '30 kJ/kg' },
        { profileKey: 'powerProfile45KJ', label: '45 kJ/kg' },
    ];

    const fatigueProfileForTab = (tab: typeof fatigueKjTab): { profileKey: 'powerProfile15KJ' | 'powerProfile30KJ' | 'powerProfile45KJ'; label: string } => {
        if (tab === '30') return { profileKey: 'powerProfile30KJ', label: '30 kJ/kg' };
        if (tab === '45') return { profileKey: 'powerProfile45KJ', label: '45 kJ/kg' };
        return { profileKey: 'powerProfile15KJ', label: '15 kJ/kg' };
    };
    const selectedFatigueProfile = fatigueProfileForTab(fatigueKjTab);

    const fatigueMetrics = [
        ...fatiguePowerKeys.flatMap(({ key, label }) => ([
            {
                key: `${selectedFatigueProfile.profileKey}.${String(key)}`,
                label: `${label} (${selectedFatigueProfile.label}) (W/kg)`,
                format: (v: number) => v.toFixed(1),
            },
            {
                key: `deltaPct.${selectedFatigueProfile.profileKey}.${String(key)}`,
                label: `${label} Δ% (${selectedFatigueProfile.label})`,
                format: (v: number) => `${Math.round(v)}%`,
            },
        ])),
    ];

    const analysisMetrics = (analysisSubTab === 'fatigue' ? fatigueMetrics : baseMetrics) as Array<any>;

    const getHeatmapColor = (value: number, min: number, max: number, invert: boolean = false): string => {
        if (min === max || isNaN(value)) return 'bg-slate-700/50 text-slate-200';
        const range = max - min;
        const normalized = range > 0 ? (value - min) / range : 0.5;
        
        const finalValue = invert ? 1 - normalized : normalized;

        if (finalValue < 0.15) return 'bg-red-800/60 text-red-200';
        if (finalValue < 0.35) return 'bg-orange-800/60 text-orange-200';
        if (finalValue < 0.65) return 'bg-slate-700 text-slate-200';
        if (finalValue < 0.85) return 'bg-teal-800/60 text-teal-200';
        return 'bg-green-800/60 text-green-200';
    };

    const getDominantProfileLabel = (p: any): string => {
      const sprint = getRiderCharacteristicSafe(p, 'charSprint');
      const anaer = getRiderCharacteristicSafe(p, 'charAnaerobic');
      const punch = getRiderCharacteristicSafe(p, 'charPuncher');
      const climb = getRiderCharacteristicSafe(p, 'charClimbing');
      const roul = getRiderCharacteristicSafe(p, 'charRouleur');
      const scores: Array<{ label: string; v: number }> = [
        { label: 'Sprinteur', v: sprint + anaer * 0.7 },
        { label: 'Puncheur', v: punch + anaer * 0.4 },
        { label: 'Grimpeur', v: climb },
        { label: 'Rouleur', v: roul },
      ];
      scores.sort((a, b) => b.v - a.v);
      return scores[0]?.label ?? 'Polyvalent';
    };

    const getRecruitmentScore = (p: any): number => {
      const gen = typeof p.generalPerformanceScore === 'number' ? p.generalPerformanceScore : 0;
      const pot = 'potentialRating' in p && typeof p.potentialRating === 'number' ? p.potentialRating * 20 : 0;
      const fat = typeof p.fatigueResistanceScore === 'number' ? p.fatigueResistanceScore : 0;
      const ftp = getWkg(p, 'powerProfileFresh', 'criticalPower') ?? 0;
      const ftpNorm = Math.min(Math.max(ftp, 0), 6.5) / 6.5 * 100;
      return Math.round(gen * 0.4 + pot * 0.25 + fat * 0.2 + ftpNorm * 0.15);
    };

    const rankedProfiles = [...selectedProfiles]
      .map((p) => ({
        profile: p,
        score: getRecruitmentScore(p),
        dominant: getDominantProfileLabel(p),
        age: getAge(p.birthDate),
      }))
      .sort((a, b) => b.score - a.score);

    const leader = rankedProfiles[0];
    const keyLeaders = [
      {
        label: 'Note générale',
        winner: [...selectedProfiles].sort(
          (a, b) => (b.generalPerformanceScore || 0) - (a.generalPerformanceScore || 0),
        )[0],
        value: (p: any) => p.generalPerformanceScore,
        format: (v: number) => `${Math.round(v)}`,
      },
      {
        label: 'Potentiel',
        winner: [...selectedProfiles].sort((a, b) => {
          const av = 'potentialRating' in a ? a.potentialRating || 0 : 0;
          const bv = 'potentialRating' in b ? b.potentialRating || 0 : 0;
          return bv - av;
        })[0],
        value: (p: any) => ('potentialRating' in p ? p.potentialRating : null),
        format: (v: number) => `${v}/5`,
      },
      {
        label: 'FTP (W/kg)',
        winner: [...selectedProfiles].sort(
          (a, b) =>
            (getWkg(b, 'powerProfileFresh', 'criticalPower') ?? 0) -
            (getWkg(a, 'powerProfileFresh', 'criticalPower') ?? 0),
        )[0],
        value: (p: any) => getWkg(p, 'powerProfileFresh', 'criticalPower'),
        format: (v: number) => v.toFixed(1),
      },
      {
        label: 'Résistance fatigue',
        winner: [...selectedProfiles].sort(
          (a, b) => (b.fatigueResistanceScore || 0) - (a.fatigueResistanceScore || 0),
        )[0],
        value: (p: any) => p.fatigueResistanceScore,
        format: (v: number) => `${Math.round(v)}`,
      },
    ];

    const filterChip = (active: boolean, accent: 'indigo' | 'emerald' | 'sky' = 'indigo') => {
      if (!active) return 'bg-slate-900/70 text-slate-200 border-white/15 hover:bg-slate-800';
      if (accent === 'emerald') return 'bg-emerald-600 text-white border-emerald-400 shadow-sm';
      if (accent === 'sky') return 'bg-sky-600 text-white border-sky-400 shadow-sm';
      return 'bg-indigo-500 text-white border-indigo-400 shadow-sm';
    };

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-indigo-50 tracking-tight">
                Analyse comparative — aide au recrutement
              </h3>
              <p className="mt-1 text-sm text-indigo-100/75 max-w-2xl">
                Sélectionnez jusqu&apos;à 6 profils pour comparer puissance, profil et fatigue, puis classer les meilleurs candidats.
              </p>
            </div>
            <div className="rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-100">
              {selectedProfileIdsForAnalysis.length} / 6 sélectionnés
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="relative w-full md:flex-1">
                <input
                  type="text"
                  value={analysisSearch}
                  onChange={(e) => setAnalysisSearch(e.target.value)}
                  placeholder="Rechercher un nom…"
                  className="input-field-sm !rounded-full w-full pr-9"
                />
                {analysisSearch.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAnalysisSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
                    title="Effacer la recherche"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProfileIdsForAnalysis([])}
                  disabled={selectedProfileIdsForAnalysis.length === 0}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    selectedProfileIdsForAnalysis.length === 0
                      ? 'opacity-40 cursor-not-allowed border-white/10 text-slate-400'
                      : 'border-rose-400/40 text-rose-100 bg-rose-950/40 hover:bg-rose-900/50'
                  }`}
                >
                  Tout effacer
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisSelectedFirst((v) => !v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${filterChip(analysisSelectedFirst, 'emerald')}`}
                >
                  Sélectionnés ↑
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5">
              {([
                { id: 'all', label: 'Tous profils' },
                { id: 'sprinteur', label: 'Sprinteur' },
                { id: 'puncheur', label: 'Puncheur' },
                { id: 'grimpeur', label: 'Grimpeur' },
                { id: 'rouleur', label: 'Rouleur' },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnalysisProfileFilter(opt.id as any)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${filterChip(analysisProfileFilter === opt.id, 'sky')}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-1.5">
              {([
                { id: 'all', label: 'Tous' },
                { id: 'scoot', label: 'Prospects' },
                { id: 'n1', label: 'N1' },
                { id: 'reserve', label: 'Réserve' },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnalysisTypeFilter(opt.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${filterChip(analysisTypeFilter === opt.id, 'emerald')}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
          {filteredProfilesForPicker.map((p) => {
            const selected = selectedProfileIdsForAnalysis.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProfileSelectionForAnalysis(p.id)}
                disabled={!selected && selectedProfileIdsForAnalysis.length >= 6}
                className={`rounded-2xl border px-3 py-3 text-center transition-all disabled:opacity-40 ${
                  selected
                    ? 'border-indigo-400/60 bg-indigo-500/20 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-400/30'
                    : 'border-white/10 bg-slate-800/55 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                      selected
                        ? 'border-indigo-300 bg-indigo-500 text-white'
                        : 'border-white/25 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {selected ? '✓' : ''}
                  </span>
                  <span className="text-sm font-semibold text-slate-50">{p.name}</span>
                </div>
                <div className={`mt-1.5 text-[11px] font-medium ${p.type === 'Scoot' ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {p.type === 'Scoot' ? 'Prospect scouting' : p.type}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">{getDominantProfileLabel(p)}</div>
              </button>
            );
          })}
        </div>

        {filteredProfilesForPicker.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 py-8 text-center text-slate-400">
            Aucun profil ne correspond aux filtres
          </div>
        )}

        {selectedProfiles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-4 py-10 text-center">
            <p className="text-slate-200 font-medium">Sélectionnez au moins 2 profils</p>
            <p className="mt-1 text-sm text-slate-400">
              La synthèse recrutement, le classement et le tableau comparatif apparaîtront ici.
            </p>
          </div>
        )}

        {selectedProfiles.length === 1 && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-950/35 px-4 py-3 text-sm text-amber-100">
            Ajoutez un second profil pour activer le classement et la recommandation de recrutement.
          </div>
        )}

        {selectedProfiles.length > 1 && leader && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 to-slate-950 p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
                Recommandation recrutement
              </p>
              <h4 className="mt-1 text-xl font-semibold text-emerald-50">
                Priorité : {leader.profile.name}
              </h4>
              <p className="mt-2 text-sm text-emerald-100/80 leading-relaxed">
                Meilleur score recrutement ({leader.score}/100) — profil dominant{' '}
                <strong>{leader.dominant}</strong>
                {leader.age != null ? `, ${leader.age} ans` : ''}.
                {rankedProfiles[1]
                  ? ` Écart de ${leader.score - rankedProfiles[1].score} pts sur ${rankedProfiles[1].profile.name}.`
                  : ''}
                {' '}Utilisez le tableau ci-dessous pour valider FTP, fatigue et cohérence de profil avant contact.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {keyLeaders.map((item) => {
                const raw = item.value(item.winner);
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-3 text-center shadow-sm"
                  >
                    <p className="text-[11px] font-medium text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-50">{item.winner?.name ?? '—'}</p>
                    <p className="mt-0.5 text-xs font-mono text-indigo-200">
                      {typeof raw === 'number' && !Number.isNaN(raw) ? item.format(raw) : 'N/A'}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h4 className="text-sm font-semibold text-slate-100 text-center">Classement recrutement</h4>
              </div>
              <div className="divide-y divide-white/5">
                {rankedProfiles.map((row, index) => (
                  <div
                    key={row.profile.id}
                    className={`flex items-center gap-3 px-4 py-3 ${index === 0 ? 'bg-emerald-500/10' : ''}`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        index === 0
                          ? 'bg-emerald-500 text-white'
                          : index === 1
                            ? 'bg-slate-600 text-white'
                            : 'bg-slate-800 text-slate-300 border border-white/10'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-semibold text-slate-50 truncate">{row.profile.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {row.dominant}
                        {row.age != null ? ` · ${row.age} ans` : ''}
                        {' · '}
                        {row.profile.type === 'Scoot' ? 'Prospect' : row.profile.type}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-indigo-200">{row.score}</p>
                      <p className="text-[10px] text-slate-500">/ 100</p>
                    </div>
                    <div className="hidden sm:block w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${index === 0 ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                        style={{ width: `${Math.min(100, row.score)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedProfiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setAnalysisSubTab('synthese')}
                className={`rounded-full px-4 py-2 text-xs font-semibold border transition-colors ${filterChip(analysisSubTab === 'synthese')}`}
              >
                Synthèse
              </button>
              <button
                type="button"
                onClick={() => setAnalysisSubTab('fatigue')}
                className={`rounded-full px-4 py-2 text-xs font-semibold border transition-colors ${filterChip(analysisSubTab === 'fatigue')}`}
              >
                Fatigue & % pertes
              </button>
            </div>

            {analysisSubTab === 'fatigue' && (
              <div className="flex flex-wrap justify-center gap-2">
                {(['15', '30', '45'] as const).map((kj) => (
                  <button
                    key={kj}
                    type="button"
                    onClick={() => setFatigueKjTab(kj)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${filterChip(fatigueKjTab === kj, 'emerald')}`}
                  >
                    {kj} kJ/kg
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto p-2 sm:p-3">
                <table className="min-w-full text-sm text-center border-separate border-spacing-y-2 border-spacing-x-1.5">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 rounded-xl bg-slate-800/95 p-3 text-center font-semibold text-slate-300 border border-white/10 min-w-[9rem]">
                        Métrique
                      </th>
                      {selectedProfiles.map((p) => (
                        <th key={p.id} className="rounded-xl bg-slate-800/90 p-3 border border-white/10 min-w-[11.5rem]">
                          <p className="font-semibold text-slate-50">{p.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{getDominantProfileLabel(p)}</p>
                          <div className="mt-2 flex justify-center overflow-visible">
                            <SpiderChart
                              data={SPIDER_CHART_CHARACTERISTICS_CONFIG.map((char) => ({
                                axis: char.label,
                                value: getRiderCharacteristicSafe(p, char.key),
                              }))}
                              size={148}
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysisMetrics.map((metric) => {
                      const values = selectedProfiles
                        .map((p) => {
                          if (metric.key === 'age') return getAge(p.birthDate) || 0;
                          if (metric.key === 'potentialRating') return 'potentialRating' in p ? p.potentialRating || 0 : 0;
                          if (metric.key === 'generalPerformanceScore') return p.generalPerformanceScore || 0;
                          if (metric.key === 'fatigueResistanceScore') return p.fatigueResistanceScore || 0;
                          if (typeof metric.key === 'string' && metric.key.startsWith('deltaPct.')) {
                            const [, profileKey, powerKey] = metric.key.split('.') as [string, string, string];
                            return getDeltaPct(p, profileKey, powerKey) ?? 0;
                          }
                          if (metric.key.startsWith('powerProfile')) {
                            const [profileKey, powerKey] = metric.key.split('.') as [keyof Rider, keyof PowerProfile];
                            return getWkg(p, String(profileKey), String(powerKey)) ?? 0;
                          }
                          return 0;
                        })
                        .filter((v) => v > 0);

                      const min = values.length ? Math.min(...values) : 0;
                      const max = values.length ? Math.max(...values) : 0;

                      return (
                        <tr key={metric.key}>
                          <td className="sticky left-0 z-10 rounded-2xl bg-slate-900 border border-white/10 p-2.5 text-center font-medium text-slate-300 min-w-[9rem]">
                            {metric.label}
                          </td>
                          {selectedProfiles.map((p) => {
                            let value: number | null = null;
                            if (metric.key === 'age') {
                              const age = getAge(p.birthDate);
                              value = typeof age === 'number' && !isNaN(age) ? age : null;
                            } else if (metric.key === 'potentialRating') {
                              const rating = 'potentialRating' in p ? p.potentialRating : null;
                              value = typeof rating === 'number' && !isNaN(rating) ? rating : null;
                            } else if (metric.key === 'generalPerformanceScore') {
                              const score = p.generalPerformanceScore;
                              value = typeof score === 'number' && !isNaN(score) ? score : null;
                            } else if (metric.key === 'fatigueResistanceScore') {
                              const score = p.fatigueResistanceScore;
                              value = typeof score === 'number' && !isNaN(score) ? score : null;
                            } else if (typeof metric.key === 'string' && metric.key.startsWith('deltaPct.')) {
                              const [, profileKey, powerKey] = metric.key.split('.') as [string, string, string];
                              const d = getDeltaPct(p, profileKey, powerKey);
                              value = typeof d === 'number' && !Number.isNaN(d) ? d : null;
                            } else if (metric.key.startsWith('powerProfile')) {
                              const [profileKey, powerKey] = metric.key.split('.') as [keyof Rider, keyof PowerProfile];
                              value = getWkg(p, String(profileKey), String(powerKey));
                            }

                            const isBest =
                              value !== null &&
                              values.length > 1 &&
                              (metric.invertColor ? value === min : value === max);

                            return (
                              <td key={p.id} className="p-0 align-middle">
                                <div
                                  className={`rounded-2xl border px-2.5 py-2.5 font-mono text-center ${
                                    value !== null && typeof value === 'number'
                                      ? `${getHeatmapColor(value, min, max, metric.invertColor)} border-white/10`
                                      : 'bg-slate-800/50 text-slate-400 border-white/10'
                                  } ${isBest ? 'ring-2 ring-emerald-400/70' : ''}`}
                                >
                                  {value !== null && typeof value === 'number' ? metric.format(value) : 'N/A'}
                                  {isBest && (
                                    <span className="ml-1 text-[9px] font-sans font-bold text-emerald-200">★</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabButtonStyle = (tab: 'profiles' | 'search' | 'analysis' | 'recruitment') =>
    `inline-flex items-center justify-center px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-150 focus:outline-none ${
      activeTab === tab
        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-900/40'
        : 'bg-transparent text-slate-200 hover:bg-white/10 hover:text-white'
    }`;

  const renderRecruitmentTab = () => {
    if (!appState || !currentTeamId || !setRecruitmentOffers || !setRecruitmentCampaigns) {
      return (
        <p className="text-slate-400 text-sm text-center py-8">Équipe active requise pour le recrutement.</p>
      );
    }
    const team = appState.teams?.find((t) => t.id === currentTeamId);
    const canEdit = Boolean(effectivePermissions?.scouting?.includes('edit'));
    return (
      <TeamRecruitmentPanel
        teamId={currentTeamId}
        teamName={team?.name ?? 'Équipe'}
        users={appState.users ?? []}
        teamMemberships={appState.teamMemberships ?? []}
        recruitmentOffers={appState.recruitmentOffers ?? []}
        recruitmentCampaigns={appState.recruitmentCampaigns ?? []}
        setRecruitmentOffers={setRecruitmentOffers}
        setRecruitmentCampaigns={setRecruitmentCampaigns}
        onApproveMembership={
          onReviewRiderApplication
            ? (m) => onReviewRiderApplication(m, 'approve')
            : undefined
        }
        onDenyMembership={
          onReviewRiderApplication ? (m) => onReviewRiderApplication(m, 'deny') : undefined
        }
        canEdit={canEdit}
      />
    );
  };
  
  return (
    <SectionWrapper
      title="Scouting & Détection"
      actionButton={<ActionButton onClick={openAddModal} icon={<PlusCircleIcon className="w-5 h-5"/>}>Ajouter Prospect</ActionButton>}
    >
        <div className="mb-4 flex justify-center">
            <nav className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/10 bg-slate-950/60 p-1.5 shadow-inner shadow-black/20" aria-label="Tabs">
                <button onClick={() => setActiveTab('profiles')} className={tabButtonStyle('profiles')}>Profils Suivis</button>
                <button onClick={() => setActiveTab('search')} className={tabButtonStyle('search')}>Recherche de Talents</button>
                <button onClick={() => setActiveTab('recruitment')} className={tabButtonStyle('recruitment')}>Recrutement</button>
                <button onClick={() => setActiveTab('analysis')} className={tabButtonStyle('analysis')}>Analyse Comparative</button>
            </nav>
        </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3 sm:p-4">
          {activeTab === 'profiles' && renderProfilesTab()}
          {activeTab === 'search' && renderSearchTab()}
          {activeTab === 'recruitment' && renderRecruitmentTab()}
          {activeTab === 'analysis' && renderAnalysisTab()}
      </div>

       <RiderDetailModal
          isOpen={addProspectModal.isOpen && addProspectModal.mode === 'scout'}
          onClose={() => setAddProspectModal({ ...addProspectModal, isOpen: false })}
          onSaveRider={(newRiderData) => {
              const { 
                id,
                resultsHistory, 
                favoriteRaces, 
                clothing, 
                performanceNutrition, 
                roadBikeSetup, 
                ttBikeSetup, 
                physiquePerformanceProject, 
                techniquePerformanceProject, 
                mentalPerformanceProject, 
                environnementPerformanceProject, 
                tactiquePerformanceProject,
                ...restOfRider
              } = newRiderData;
              
              const newScoutProfile: ScoutingProfile = {
                  ...restOfRider,
                  id: `scout_${generateId()}`,
                  status: ScoutingStatus.TO_WATCH,
                  potentialRating: 3,
                  discipline: newRiderData.disciplines?.[0] || DisciplinePracticed.ROUTE,
              };

              onSaveScoutingProfile(newScoutProfile);
              setAddProspectModal({ ...addProspectModal, isOpen: false });
          }}
          isEditMode={true}
          appState={appState as AppState}
          raceEvents={[]}
          riderEventSelections={[]}
          performanceEntries={[]}
          powerDurationsConfig={POWER_ANALYSIS_DURATIONS_CONFIG}
          calculateWkg={() => ''}
      />
      
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          isDemoPreviewScoutingProfile(currentItem as ScoutingProfile)
            ? 'Aperçu — Profil exemple'
            : isEditing
            ? 'Modifier Prospect'
            : 'Nouveau Prospect'
        }
      >
        <div className="bg-slate-800 p-4 -m-6 rounded-lg">
            {isDemoPreviewScoutingProfile(currentItem as ScoutingProfile) && (
              <div className="mb-4 p-3 rounded-lg bg-violet-900/40 border border-violet-500/40 text-violet-100 text-sm">
                Profil fictif pour tester la recherche recrutement. Aucune demande n&apos;est envoyée. Vous pouvez
                l&apos;ajouter à vos prospects pour continuer le parcours scouting.
              </div>
            )}
            <nav className="flex space-x-1 border-b border-slate-600 mb-4 overflow-x-auto">
                <button onClick={() => setActiveModalTab('info')} className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${activeModalTab === 'info' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Infos</button>
                <button onClick={() => setActiveModalTab('power')} className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${activeModalTab === 'power' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Puissance</button>
                <button onClick={() => setActiveModalTab('project')} className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${activeModalTab === 'project' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Projet Perf.</button>
                <button onClick={() => setActiveModalTab('interview')} className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${activeModalTab === 'interview' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Entretiens</button>
                <button onClick={() => setActiveModalTab('results')} className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${activeModalTab === 'results' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Résultats</button>
            </nav>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {activeModalTab === 'info' && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                          <input name="firstName" value={currentItem.firstName} onChange={handleInputChange} placeholder="Prénom" className="input-field-sm" required/>
                          <input name="lastName" value={currentItem.lastName} onChange={handleInputChange} placeholder="Nom" className="input-field-sm" required/>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="email" name="email" value={currentItem.email || ''} onChange={handleInputChange} placeholder="Email" className="input-field-sm"/>
                        <input type="tel" name="phone" value={currentItem.phone || ''} onChange={handleInputChange} placeholder="Téléphone" className="input-field-sm"/>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" name="heightCm" value={currentItem.heightCm || ''} onChange={handleInputChange} placeholder="Taille (cm)" className="input-field-sm" step="any"/>
                        <input type="number" name="weightKg" value={currentItem.weightKg || ''} onChange={handleInputChange} placeholder="Poids (kg)" className="input-field-sm" step="any"/>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" name="birthDate" value={currentItem.birthDate || ''} onChange={handleInputChange} className="input-field-sm" style={{colorScheme:'dark'}}/>
                        <select name="sex" value={currentItem.sex || ''} onChange={handleInputChange} className="input-field-sm"><option value="">Sexe...</option><option value={Sex.MALE}>Homme</option><option value={Sex.FEMALE}>Femme</option></select>
                      </div>
                      <select name="nationality" value={currentItem.nationality || ''} onChange={handleInputChange} className="input-field-sm"><option value="">Nationalité...</option>{ALL_COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select>
                      <select name="discipline" value={currentItem.discipline} onChange={handleInputChange} className="input-field-sm"><option value="">Discipline...</option>{Object.values(DisciplinePracticed).map(d=><option key={d} value={d}>{d}</option>)}</select>
                      <select name="status" value={currentItem.status} onChange={handleInputChange} className="input-field-sm"><option value="">Statut...</option>{Object.values(ScoutingStatus).map(s=><option key={s} value={s}>{s}</option>)}</select>
                      <div>
                        <label className="text-xs text-slate-300">Potentiel (1-5)</label>
                        <input type="range" name="potentialRating" value={currentItem.potentialRating} onChange={handleInputChange} min="1" max="5" className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"/>
                      </div>
                      <textarea name="qualitativeNotes" value={currentItem.qualitativeNotes || ''} onChange={handleInputChange} placeholder="Notes qualitatives, points forts/faibles..." rows={3} className="input-field-sm w-full"/>
                    </>
                )}
                {activeModalTab === 'power' && (
                  <div className="space-y-4">
                      <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                              <thead className="bg-slate-700/50">
                                  <tr>
                                      <th className="px-2 py-2 text-left text-slate-300 font-semibold">Durée</th>
                                      <th className="px-2 py-2 text-center text-slate-300 font-semibold">Frais (W)</th>
                                      <th className="px-2 py-2 text-center text-slate-300 font-semibold">15 kJ/kg (W)</th>
                                      <th className="px-2 py-2 text-center text-slate-300 font-semibold">30 kJ/kg (W)</th>
                                      <th className="px-2 py-2 text-center text-slate-300 font-semibold">45 kJ/kg (W)</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700">
                                  {powerMetricsConfig.map(metric => (
                                      <tr key={metric.key}>
                                          <td className="px-2 py-1.5 font-medium text-slate-300">Puissance {metric.label}</td>
                                          {(['powerProfileFresh', 'powerProfile15KJ', 'powerProfile30KJ', 'powerProfile45KJ'] as const).map(profileKey => (
                                              <td key={profileKey} className="px-1 py-1.5">
                                                  <input
                                                      type="number"
                                                      name={`${profileKey}.${metric.key}`}
                                                      value={(currentItem[profileKey] as any)?.[metric.key] ?? ''}
                                                      onChange={handleInputChange}
                                                      placeholder="W"
                                                      className="input-field-sm w-full text-center"
                                                  />
                                              </td>
                                          ))}
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>

                      {/* ANALYSE DE FATIGUE - SYNTHÈSE DES PERTES (W/kg et Δ% vs PPR de base) */}
                      <div className="rounded-lg overflow-hidden border border-slate-600 bg-slate-800">
                          <h3 className="bg-blue-900/80 text-white px-4 py-2 text-sm font-semibold">
                              ANALYSE DE FATIGUE - SYNTHÈSE DES PERTES
                          </h3>
                          <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                  <thead className="bg-slate-700/80 text-slate-200">
                                      <tr>
                                          <th className="px-3 py-2 text-left font-semibold">Métrique</th>
                                          <th className="px-3 py-2 text-center font-semibold">Frais (W/kg)</th>
                                          <th className="px-3 py-2 text-center font-semibold">15kJ (W/kg)</th>
                                          <th className="px-3 py-2 text-center font-semibold">Δ% (15kJ)</th>
                                          <th className="px-3 py-2 text-center font-semibold">30kJ (W/kg)</th>
                                          <th className="px-3 py-2 text-center font-semibold">Δ% (30kJ)</th>
                                          <th className="px-3 py-2 text-center font-semibold">45kJ (W/kg)</th>
                                          <th className="px-3 py-2 text-center font-semibold">Δ% (45kJ)</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-700 text-white">
                                      {powerMetricsConfig.map(metric => {
                                          const weight = (currentItem.weightKg ?? 70) > 0 ? (currentItem.weightKg ?? 70) : 70;
                                          const fresh = (currentItem.powerProfileFresh as Record<string, number>)?.[metric.key];
                                          const freshWkg = fresh && weight ? (fresh / weight) : null;
                                          const v15 = (currentItem.powerProfile15KJ as Record<string, number>)?.[metric.key];
                                          const wkg15 = v15 && weight ? (v15 / weight) : null;
                                          const v30 = (currentItem.powerProfile30KJ as Record<string, number>)?.[metric.key];
                                          const wkg30 = v30 && weight ? (v30 / weight) : null;
                                          const v45 = (currentItem.powerProfile45KJ as Record<string, number>)?.[metric.key];
                                          const wkg45 = v45 && weight ? (v45 / weight) : null;
                                          const delta15 = freshWkg != null && freshWkg > 0 && wkg15 != null ? Math.round(((wkg15 - freshWkg) / freshWkg) * 100) : null;
                                          const delta30 = freshWkg != null && freshWkg > 0 && wkg30 != null ? Math.round(((wkg30 - freshWkg) / freshWkg) * 100) : null;
                                          const delta45 = freshWkg != null && freshWkg > 0 && wkg45 != null ? Math.round(((wkg45 - freshWkg) / freshWkg) * 100) : null;
                                          const metricLabel = metric.key === 'criticalPower' ? 'CP' : metric.label;
                                          const deltaClass = (d: number | null) => {
                                              if (d === null) return 'text-slate-400';
                                              if (d >= 0) return 'text-white';
                                              if (d >= -10) return 'text-amber-400';
                                              return 'text-red-400';
                                          };
                                          return (
                                              <tr key={metric.key} className="hover:bg-slate-700/50">
                                                  <td className="px-3 py-2 font-medium text-slate-200">{metricLabel}</td>
                                                  <td className="px-3 py-2 text-center">{freshWkg != null ? freshWkg.toFixed(1) : '-'}</td>
                                                  <td className="px-3 py-2 text-center">{wkg15 != null ? wkg15.toFixed(1) : '-'}</td>
                                                  <td className={`px-3 py-2 text-center ${deltaClass(delta15)}`}>{delta15 != null ? `${delta15}%` : '-'}</td>
                                                  <td className="px-3 py-2 text-center">{wkg30 != null ? wkg30.toFixed(1) : '-'}</td>
                                                  <td className={`px-3 py-2 text-center ${deltaClass(delta30)}`}>{delta30 != null ? `${delta30}%` : '-'}</td>
                                                  <td className="px-3 py-2 text-center">{wkg45 != null ? wkg45.toFixed(1) : '-'}</td>
                                                  <td className={`px-3 py-2 text-center ${deltaClass(delta45)}`}>{delta45 != null ? `${delta45}%` : '-'}</td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                          {!(currentItem.weightKg && currentItem.weightKg > 0) && (
                              <p className="text-xs text-slate-400 px-4 py-2 border-t border-slate-700">W/kg calculés avec 70 kg par défaut. Renseignez le poids dans l’onglet Infos pour des valeurs précises.</p>
                          )}
                      </div>
                  </div>
                )}
                
                {/* Onglet Projet Performance */}
                {activeModalTab === 'project' && (
                    <div className="space-y-4">
                        <div className="bg-slate-700 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-white mb-4">Objectifs de Performance</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Objectifs généraux de performance
                                    </label>
                                    <textarea
                                        name="performanceGoals"
                                        value={currentItem.performanceGoals || ''}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Décrivez les objectifs de performance du prospect..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Facteurs de Performance */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Facteurs de Performance</h3>
                            
                            {/* Physique */}
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <h4 className="text-md font-medium text-blue-400 mb-3">Physique</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Forces</label>
                                        <textarea
                                            name="physiquePerformanceProject.forces"
                                            value={currentItem.physiquePerformanceProject?.forces || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Points forts physiques..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À optimiser</label>
                                        <textarea
                                            name="physiquePerformanceProject.aOptimiser"
                                            value={currentItem.physiquePerformanceProject?.aOptimiser || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Aspects à optimiser..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À développer</label>
                                        <textarea
                                            name="physiquePerformanceProject.aDevelopper"
                                            value={currentItem.physiquePerformanceProject?.aDevelopper || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Compétences à développer..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Besoins d'actions</label>
                                        <textarea
                                            name="physiquePerformanceProject.besoinsActions"
                                            value={currentItem.physiquePerformanceProject?.besoinsActions || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Actions nécessaires..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Technique */}
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <h4 className="text-md font-medium text-green-400 mb-3">Technique</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Forces</label>
                                        <textarea
                                            name="techniquePerformanceProject.forces"
                                            value={currentItem.techniquePerformanceProject?.forces || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Points forts techniques..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À optimiser</label>
                                        <textarea
                                            name="techniquePerformanceProject.aOptimiser"
                                            value={currentItem.techniquePerformanceProject?.aOptimiser || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Aspects techniques à optimiser..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À développer</label>
                                        <textarea
                                            name="techniquePerformanceProject.aDevelopper"
                                            value={currentItem.techniquePerformanceProject?.aDevelopper || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Compétences techniques à développer..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Besoins d'actions</label>
                                        <textarea
                                            name="techniquePerformanceProject.besoinsActions"
                                            value={currentItem.techniquePerformanceProject?.besoinsActions || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Actions techniques nécessaires..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Mental */}
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <h4 className="text-md font-medium text-yellow-400 mb-3">Mental</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Forces</label>
                                        <textarea
                                            name="mentalPerformanceProject.forces"
                                            value={currentItem.mentalPerformanceProject?.forces || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Points forts mentaux..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À optimiser</label>
                                        <textarea
                                            name="mentalPerformanceProject.aOptimiser"
                                            value={currentItem.mentalPerformanceProject?.aOptimiser || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Aspects mentaux à optimiser..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À développer</label>
                                        <textarea
                                            name="mentalPerformanceProject.aDevelopper"
                                            value={currentItem.mentalPerformanceProject?.aDevelopper || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Compétences mentales à développer..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Besoins d'actions</label>
                                        <textarea
                                            name="mentalPerformanceProject.besoinsActions"
                                            value={currentItem.mentalPerformanceProject?.besoinsActions || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Actions mentales nécessaires..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Environnement */}
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <h4 className="text-md font-medium text-purple-400 mb-3">Environnement</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Forces</label>
                                        <textarea
                                            name="environnementPerformanceProject.forces"
                                            value={currentItem.environnementPerformanceProject?.forces || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Points forts environnementaux..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À optimiser</label>
                                        <textarea
                                            name="environnementPerformanceProject.aOptimiser"
                                            value={currentItem.environnementPerformanceProject?.aOptimiser || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Aspects environnementaux à optimiser..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À développer</label>
                                        <textarea
                                            name="environnementPerformanceProject.aDevelopper"
                                            value={currentItem.environnementPerformanceProject?.aDevelopper || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Compétences environnementales à développer..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Besoins d'actions</label>
                                        <textarea
                                            name="environnementPerformanceProject.besoinsActions"
                                            value={currentItem.environnementPerformanceProject?.besoinsActions || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Actions environnementales nécessaires..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tactique */}
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <h4 className="text-md font-medium text-red-400 mb-3">Tactique</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Forces</label>
                                        <textarea
                                            name="tactiquePerformanceProject.forces"
                                            value={currentItem.tactiquePerformanceProject?.forces || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Points forts tactiques..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À optimiser</label>
                                        <textarea
                                            name="tactiquePerformanceProject.aOptimiser"
                                            value={currentItem.tactiquePerformanceProject?.aOptimiser || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Aspects tactiques à optimiser..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">À développer</label>
                                        <textarea
                                            name="tactiquePerformanceProject.aDevelopper"
                                            value={currentItem.tactiquePerformanceProject?.aDevelopper || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Compétences tactiques à développer..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Besoins d'actions</label>
                                        <textarea
                                            name="tactiquePerformanceProject.besoinsActions"
                                            value={currentItem.tactiquePerformanceProject?.besoinsActions || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Actions tactiques nécessaires..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Onglet Entretiens */}
                {activeModalTab === 'interview' && (
                    <div className="space-y-6">
                        {/* Motivation et Objectifs */}
                        <div className="bg-slate-700 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-white mb-4">Motivation et Objectifs</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Pourquoi fait-il du vélo ?
                                    </label>
                                    <textarea
                                        name="cyclingMotivation"
                                        value={currentItem.cyclingMotivation || ''}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Décrivez la motivation du prospect pour le cyclisme..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Objectifs Temporels */}
                        <div className="bg-slate-700 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-white mb-4">Objectifs par Période</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Objectifs à court terme (saison suivante)
                                    </label>
                                    <textarea
                                        name="shortTermGoals"
                                        value={currentItem.shortTermGoals || ''}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Objectifs pour la saison suivante..."
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Objectifs à moyen terme (2-3 ans)
                                    </label>
                                    <textarea
                                        name="mediumTermGoals"
                                        value={currentItem.mediumTermGoals || ''}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Objectifs pour les 2-3 prochaines années..."
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Objectifs à long terme (5+ ans)
                                    </label>
                                    <textarea
                                        name="longTermGoals"
                                        value={currentItem.longTermGoals || ''}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Objectifs à long terme (5+ ans)..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Aspirations de Carrière */}
                        <div className="bg-slate-700 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-white mb-4">Aspirations de Carrière</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Aspirations de carrière
                                    </label>
                                    <textarea
                                        name="careerAspirations"
                                        value={currentItem.careerAspirations || ''}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Décrivez les aspirations de carrière du prospect..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Valeurs et Personnalité */}
                        <div className="bg-slate-700 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-white mb-4">Valeurs et Personnalité</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Valeurs personnelles
                                    </label>
                                    <textarea
                                        name="personalValues"
                                        value={currentItem.personalValues || ''}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Quelles sont les valeurs importantes pour ce prospect ?"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Défis et Soutien */}
                        <div className="bg-slate-700 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-white mb-4">Défis et Besoins de Soutien</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Défis rencontrés
                                    </label>
                                    <textarea
                                        name="challengesFaced"
                                        value={currentItem.challengesFaced || ''}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Quels défis le prospect rencontre-t-il ?"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Besoins de soutien
                                    </label>
                                    <textarea
                                        name="supportNeeds"
                                        value={currentItem.supportNeeds || ''}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="De quel type de soutien le prospect a-t-il besoin ?"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Onglet Résultats (liens + historique) */}
                {activeModalTab === 'results' && (
                  <div className="space-y-4">
                    <div className="bg-slate-700 p-4 rounded-lg space-y-3">
                      <h3 className="text-lg font-semibold text-white">Références externes</h3>
                      <p className="text-xs text-slate-300">
                        Objectif : lier une page ProCyclingStats/DirectVélo une seule fois pour retrouver facilement les résultats. L’import automatique complet nécessiterait une intégration dédiée.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-300">ProCyclingStats (URL profil)</label>
                          <input
                            name="pcsUrl"
                            value={(currentItem as any).pcsUrl || ''}
                            onChange={handleInputChange}
                            placeholder="https://www.procyclingstats.com/rider/..."
                            className="input-field-sm"
                          />
                          <div className="flex gap-2">
                            <ActionButton
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => openExternal(buildPcsSearchUrlForProfile(currentItem.firstName, currentItem.lastName))}
                              icon={<SearchIcon className="w-3 h-3" />}
                            >
                              Rechercher PCS
                            </ActionButton>
                            {(currentItem as any).pcsUrl && (
                              <ActionButton
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => openExternal(String((currentItem as any).pcsUrl))}
                              >
                                Ouvrir
                              </ActionButton>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-slate-300">DirectVélo (URL profil)</label>
                          <input
                            name="directVeloUrl"
                            value={(currentItem as any).directVeloUrl || ''}
                            onChange={handleInputChange}
                            placeholder="https://www.directvelo.com/..."
                            className="input-field-sm"
                          />
                          <div className="flex gap-2">
                            <ActionButton
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => openExternal(buildDirectVeloSearchUrlForProfile(currentItem.firstName, currentItem.lastName))}
                              icon={<SearchIcon className="w-3 h-3" />}
                            >
                              Rechercher DirectVélo
                            </ActionButton>
                            {(currentItem as any).directVeloUrl && (
                              <ActionButton
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => openExternal(String((currentItem as any).directVeloUrl))}
                              >
                                Ouvrir
                              </ActionButton>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-300">Numéro de licence (si connu)</label>
                          <input
                            name="licenseNumber"
                            value={(currentItem as any).licenseNumber || ''}
                            onChange={handleInputChange}
                            placeholder="Ex: FFC..."
                            className="input-field-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-300">UCI ID (si connu)</label>
                          <input
                            name="uciId"
                            value={(currentItem as any).uciId || ''}
                            onChange={handleInputChange}
                            placeholder="UCI ID"
                            className="input-field-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-700 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-white mb-2">Historique des résultats</h3>
                      <ResultsTab
                        formData={currentItem as any}
                        setFormData={setCurrentItem as any}
                        formFieldsEnabled={true}
                        showSimulatePcs={false}
                      />
                    </div>
                  </div>
                )}
            </div>
            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-slate-700">
                {isDemoPreviewScoutingProfile(currentItem as ScoutingProfile) ? (
                  <>
                    <ActionButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                      Fermer
                    </ActionButton>
                    <ActionButton
                      type="button"
                      onClick={() => {
                        const imported = {
                          ...currentItem,
                          id: generateId(),
                          qualitativeNotes: `${(currentItem as ScoutingProfile).qualitativeNotes || ''} (importé depuis démo)`,
                        } as ScoutingProfile;
                        onSaveScoutingProfile(imported);
                        setIsModalOpen(false);
                        setActiveTab('profiles');
                      }}
                    >
                      Ajouter aux prospects
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <ActionButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                      Annuler
                    </ActionButton>
                    <ActionButton type="button" onClick={handleSaveProfile}>
                      Sauvegarder
                    </ActionButton>
                  </>
                )}
            </div>
        </div>
      </Modal>

      {confirmAction && <ConfirmationModal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={() => {confirmAction.onConfirm(); setConfirmAction(null);}} title={confirmAction.title} message={confirmAction.message}/>}

      {promoteTarget && (
        <Modal isOpen={!!promoteTarget} onClose={() => setPromoteTarget(null)} title={`Promouvoir ${promoteTarget.firstName} ${promoteTarget.lastName} dans l'effectif`}>
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">Choisir la destination dans l'effectif :</p>
            <div className="flex flex-wrap gap-3">
              <ActionButton variant="primary" onClick={() => handleConfirmPromote('principal')} icon={<ArrowUpCircleIcon className="w-4 h-4" />}>
                Équipe première
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => handleConfirmPromote('reserve')} icon={<ArrowUpCircleIcon className="w-4 h-4" />}>
                Réserve
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => setPromoteTarget(null)}>Annuler</ActionButton>
            </div>
          </div>
        </Modal>
      )}
    </SectionWrapper>
  );
};

export default ScoutingSection;