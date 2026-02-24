import React, { useState, useMemo, useEffect } from 'react';
import { ScoutingProfile, Rider, RiderQualitativeProfile, DisciplinePracticed, FormeStatus, MoralStatus, HealthCondition, PerformanceFactorDetail, PowerProfile, ScoutingStatus, Sex, User, UserRole, AppState } from '../types';
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

interface ScoutingSectionProps {
  scoutingProfiles: ScoutingProfile[];
  riders?: Rider[];
  onSaveScoutingProfile: (profile: ScoutingProfile) => void;
  onDeleteScoutingProfile: (profileId: string) => void;
  onSaveRider?: (rider: Rider) => void | Promise<void>;
  effectivePermissions?: any;
  appState?: AppState;
  currentTeamId?: string | null;
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

const SpiderChart: React.FC<{ data: { axis: string; value: number }[]; size?: number; maxValue?: number }> = ({ data, size = 150, maxValue = 100 }) => {
    const numAxes = data.length;
    if (numAxes < 3) return <p className="text-xs text-center text-gray-400">Données insuffisantes pour le graphique radar.</p>;

    const angleSlice = (Math.PI * 2) / numAxes;
    const radius = size / 3;
    const center = size / 2;

    const points = data.map((d, i) => {
        const value = Math.max(0, Math.min(d.value || 0, maxValue));
        const x = center + radius * (value / maxValue) * Math.cos(angleSlice * i - Math.PI / 2);
        const y = center + radius * (value / maxValue) * Math.sin(angleSlice * i - Math.PI / 2);
        return `${x},${y}`;
    }).join(' ');

    const axisLines = data.map((d, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        
        const x2 = center + radius * cosAngle;
        const y2 = center + radius * sinAngle;

        const labelOffset = 10;
        const lx = center + (radius + labelOffset) * cosAngle;
        const ly = center + (radius + labelOffset) * sinAngle;
        
        const anchorTolerance = 3;
        let textAnchor = "middle";
        if (lx > center + anchorTolerance) {
            textAnchor = "start";
        } else if (lx < center - anchorTolerance) {
            textAnchor = "end";
        }

        return { x1: center, y1: center, x2, y2, label: d.axis, lx, ly, textAnchor };
    });
    
    const gridLevels = 5;
    const concentricPolygons = Array.from({ length: gridLevels }).map((_, levelIndex) => {
        const levelRadius = radius * ((levelIndex + 1) / gridLevels);
        return data.map((d, i) => {
            const x = center + levelRadius * Math.cos(angleSlice * i - Math.PI / 2);
            const y = center + levelRadius * Math.sin(angleSlice * i - Math.PI / 2);
            return `${x},${y}`;
        }).join(' ');
    });

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
            <g>
                {concentricPolygons.map((polyPoints, i) => (
                    <polygon key={`grid-${i}`} points={polyPoints} fill="none" stroke="rgba(107, 114, 128, 0.5)" strokeWidth="0.5" />
                ))}
                {axisLines.map((line, i) => (
                    <line key={`axis-${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="rgba(107, 114, 128, 0.7)" strokeWidth="0.5" />
                ))}
                <polygon points={points} fill="rgba(74, 222, 128, 0.4)" stroke="rgba(74, 222, 128, 1)" strokeWidth="1" />
                {axisLines.map((line, i) => (
                    <text
                        key={`label-${i}`}
                        x={line.lx}
                        y={line.ly}
                        fontSize="6"
                        fill="rgb(203, 213, 225)"
                        textAnchor={line.textAnchor as any}
                        dominantBaseline="middle"
                    >
                        {line.label}
                    </text>
                ))}
            </g>
        </svg>
    );
};

const ScoutingSection: React.FC<ScoutingSectionProps> = ({ scoutingProfiles, riders = [], onSaveScoutingProfile, onDeleteScoutingProfile, onSaveRider, effectivePermissions, appState, currentTeamId }) => {
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

  const [activeTab, setActiveTab] = useState<'profiles' | 'search' | 'analysis'>('profiles');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Omit<ScoutingProfile, 'id'> | ScoutingProfile>(initialScoutingProfileFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'power' | 'project' | 'interview'>('info');
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
        ...scoutingProfiles.map(s => ({ ...s, id: s.id, name: `${s.firstName} ${s.lastName}`, type: 'Prospect' })),
        ...riders.map(r => ({ ...r, id: r.id, name: `${r.firstName} ${r.lastName}`, type: 'Membre équipe' }))
    ];
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [scoutingProfiles, riders]);

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
    <>
      <div className="mb-4 p-3 bg-slate-700 rounded-md grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <input type="text" name="name" value={filters.name} onChange={handleFilterChange} placeholder="Rechercher par nom..." className="input-field-sm col-span-full md:col-span-1" />
        <select name="status" value={filters.status} onChange={handleFilterChange} className="input-field-sm"><option value="all">Tous Statuts</option>{Object.values(ScoutingStatus).map(s => <option key={s} value={s}>{s}</option>)}</select>
        <select name="discipline" value={filters.discipline} onChange={handleFilterChange} className="input-field-sm"><option value="all">Toutes Disciplines</option>{Object.values(DisciplinePracticed).map(d => <option key={d} value={d}>{d}</option>)}</select>
        <select name="nationality" value={filters.nationality} onChange={handleFilterChange} className="input-field-sm"><option value="all">Toutes Nationalités</option>{ALL_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
      </div>

      <div className="overflow-x-auto max-w-full">
        <table className="min-w-full text-sm max-w-full">
          <thead className="bg-slate-700 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => requestSort('firstName')}>Nom {getSortIndicator('firstName')}</th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => requestSort('age')}>Âge {getSortIndicator('age')}</th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => requestSort('status')}>Statut {getSortIndicator('status')}</th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => requestSort('potentialRating')}>Potentiel {getSortIndicator('potentialRating')}</th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => requestSort('qualitativeProfile')}>Profil {getSortIndicator('qualitativeProfile')}</th>
              {SPIDER_CHART_CHARACTERISTICS_CONFIG.map(char => (
                  <th key={char.key} className="px-3 py-2 text-left cursor-pointer" onClick={() => requestSort(char.key)}>{char.label} {getSortIndicator(char.key)}</th>
              ))}
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredProfiles.map(profile => (
              <tr key={profile.id} className="hover:bg-slate-700/50">
                <td className="px-3 py-2 font-medium text-slate-100">{profile.firstName} {profile.lastName}</td>
                <td className="px-3 py-2 text-slate-300">{getAge(profile.birthDate)}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${SCOUTING_STATUS_COLORS[profile.status]}`}>{profile.status}</span></td>
                <td className="px-3 py-2 text-slate-300">{profile.potentialRating} / 5</td>
                <td className="px-3 py-2 text-slate-300">{profile.qualitativeProfile}</td>
                {SPIDER_CHART_CHARACTERISTICS_CONFIG.map(char => (
                    <td key={char.key} className="px-3 py-2 font-mono text-slate-200">{getRiderCharacteristicSafe(profile, char.key).toFixed(0)}</td>
                ))}
                <td className="px-3 py-2 text-right space-x-1">
                  <ActionButton onClick={() => openEditModal(profile)} variant="secondary" size="sm" icon={<PencilIcon className="w-3 h-3"/>} />
                  <ActionButton onClick={() => handlePromoteToRoster(profile)} variant="primary" size="sm" icon={<ArrowUpCircleIcon className="w-4 h-4" />} title="Promouvoir dans l'effectif"/>
                  <ActionButton onClick={() => handleDeleteProfile(profile.id)} variant="danger" size="sm" icon={<TrashIcon className="w-3 h-3" />} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
          <h4 className="text-blue-300 font-semibold mb-2">ℹ️ Comment voir des profils de coureurs ?</h4>
          <p className="text-blue-200 text-sm mb-2">
            Pour que des profils de coureurs apparaissent dans cette recherche, ils doivent :
          </p>
          <ul className="text-blue-200 text-sm list-disc list-inside space-y-1">
            <li>Se connecter à l'application avec le rôle "Coureur"</li>
            <li>Aller dans la section "Ma Carrière"</li>
            <li>Activer l'option "Profil visible pour le recrutement"</li>
            <li>Ne pas être déjà membre de votre équipe</li>
          </ul>
        </div>
        
        <TalentSearchTab 
          appState={appState} 
          onProfileSelect={(user) => {
          // Créer un profil de scouting à partir de l'utilisateur sélectionné
          const newScoutProfile: ScoutingProfile = {
            id: `scout_${generateId()}`,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            birthDate: user.signupInfo?.birthDate,
            sex: user.signupInfo?.sex,
            nationality: user.signupInfo?.nationality,
            heightCm: user.signupInfo?.heightCm,
            weightKg: user.signupInfo?.weightKg,
            qualitativeProfile: user.qualitativeProfile || 'N/A',
            disciplines: user.disciplines || [],
            categories: user.categories || [],
            forme: user.forme || 'BONNE',
            moral: user.moral || 'BON',
            healthCondition: user.healthCondition || 'BONNE',
            potentialRating: 3,
            status: 'TO_WATCH',
            discipline: user.disciplines?.[0] || 'ROUTE',
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
            nextSeasonTeam: user.nextSeasonTeam
          };
          
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
    const analysisMetrics = [
        { key: 'age', label: 'Âge', invertColor: true, format: (v: number) => v.toFixed(0) },
        { key: 'potentialRating', label: 'Potentiel ★', format: (v: number) => v.toFixed(1) },
        { key: 'generalPerformanceScore', label: 'Note Générale', format: (v: number) => v.toFixed(0) },
        { key: 'fatigueResistanceScore', label: 'Résistance Fatigue', format: (v: number) => v.toFixed(0) },
        { key: 'powerProfileFresh.power5s', label: 'PMax 5s (W/kg)', format: (v: number) => v.toFixed(1) },
        { key: 'powerProfileFresh.power1min', label: 'PMax 1min (W/kg)', format: (v: number) => v.toFixed(1) },
        { key: 'powerProfileFresh.power5min', label: 'PMax 5min (W/kg)', format: (v: number) => v.toFixed(1) },
        { key: 'powerProfileFresh.criticalPower', label: 'FTP (W/kg)', format: (v: number) => v.toFixed(1) }
    ];

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

    return (
      <div className="space-y-4">
        <div className="space-y-4">
            <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-200 font-medium">Sélectionner les profils à comparer ({selectedProfileIdsForAnalysis.length} / 6)</span>
                    <div className="text-xs text-slate-400">
                        {selectedProfileIdsForAnalysis.length > 0 && (
                            <button 
                                onClick={() => setSelectedProfileIdsForAnalysis([])}
                                className="text-red-400 hover:text-red-300 underline"
                            >
                                Effacer la sélection
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {allProfilesForAnalysis.map(p => (
                        <div key={p.id} className={`flex items-center p-2 rounded border transition-colors ${
                            selectedProfileIdsForAnalysis.includes(p.id) 
                                ? 'bg-blue-600/20 border-blue-500' 
                                : 'bg-slate-600/50 border-slate-500 hover:bg-slate-600'
                        }`}>
                            <input 
                                type="checkbox" 
                                id={`analysis-select-${p.id}`} 
                                checked={selectedProfileIdsForAnalysis.includes(p.id)} 
                                onChange={() => handleProfileSelectionForAnalysis(p.id)} 
                                disabled={!selectedProfileIdsForAnalysis.includes(p.id) && selectedProfileIdsForAnalysis.length >= 6} 
                                className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <label htmlFor={`analysis-select-${p.id}`} className="ml-3 flex-1 cursor-pointer">
                                <div className="text-slate-200 font-medium">{p.name}</div>
                                <div className={`text-xs ${
                                    p.type === 'Prospect' ? 'text-yellow-400' : 'text-green-400'
                                }`}>
                                    {p.type}
                                </div>
                            </label>
                        </div>
                    ))}
                </div>
                
                {allProfilesForAnalysis.length === 0 && (
                    <div className="text-center py-4 text-slate-400">
                        Aucun profil disponible pour la comparaison
                    </div>
                )}
            </div>
        </div>

        {selectedProfiles.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-center border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800">
                  <th className="sticky left-0 bg-slate-800 p-2 text-left font-semibold text-slate-300 w-48">Métrique</th>
                  {selectedProfiles.map(p => (
                    <th key={p.id} className="p-2 border-l border-slate-700">
                      <p className="font-bold text-slate-100">{p.name}</p>
                      <SpiderChart data={SPIDER_CHART_CHARACTERISTICS_CONFIG.map(char => ({ axis: char.label, value: getRiderCharacteristicSafe(p, char.key) }))} size={80}/>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {analysisMetrics.map(metric => {
                  const values = selectedProfiles.map(p => {
                      if (metric.key === 'age') return getAge(p.birthDate) || 0;
                      if (metric.key === 'potentialRating') return 'potentialRating' in p ? p.potentialRating || 0 : 0;
                      if (metric.key === 'generalPerformanceScore') return p.generalPerformanceScore || 0;
                      if (metric.key === 'fatigueResistanceScore') return p.fatigueResistanceScore || 0;
                      if (metric.key.startsWith('powerProfile')) {
                          const [profileKey, powerKey] = metric.key.split('.') as [keyof Rider, keyof PowerProfile];
                          const power = (p[profileKey] as PowerProfile)?.[powerKey];
                          return (power && p.weightKg) ? power / p.weightKg : 0;
                      }
                      return 0;
                  }).filter(v => v > 0);
                  
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  
                  return (
                      <tr key={metric.key}>
                          <td className="sticky left-0 bg-slate-800 p-2 text-left font-medium text-slate-300 w-48">{metric.label}</td>
                          {selectedProfiles.map(p => {
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
                              } else if (metric.key.startsWith('powerProfile')) {
                                const [profileKey, powerKey] = metric.key.split('.') as [keyof Rider, keyof PowerProfile];
                                const power = (p[profileKey] as PowerProfile)?.[powerKey];
                                if (typeof power === 'number' && !isNaN(power) && typeof p.weightKg === 'number' && !isNaN(p.weightKg) && p.weightKg > 0) {
                                  value = power / p.weightKg;
                                } else {
                                  value = null;
                                }
                              }
                              
                              return (
                                  <td key={p.id} className={`p-2 font-mono border-l border-slate-700 ${value !== null && typeof value === 'number' ? getHeatmapColor(value, min, max, metric.invertColor) : 'bg-slate-700/50 text-slate-400'}`}>
                                      {value !== null && typeof value === 'number' ? metric.format(value) : 'N/A'}
                                  </td>
                              )
                          })}
                      </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const tabButtonStyle = (tab: 'profiles' | 'search' | 'analysis') => 
    `px-3 py-2 font-medium text-sm rounded-t-md whitespace-nowrap transition-colors duration-150 focus:outline-none ${
      activeTab === tab 
        ? 'bg-slate-800 text-white border-b-2 border-blue-500' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-slate-700'
    }`;
  
  return (
    <SectionWrapper
      title="Scouting & Détection"
      actionButton={<ActionButton onClick={openAddModal} icon={<PlusCircleIcon className="w-5 h-5"/>}>Ajouter Prospect</ActionButton>}
    >
        <div className="mb-4 border-b border-slate-600">
            <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
                <button onClick={() => setActiveTab('profiles')} className={tabButtonStyle('profiles')}>Profils Suivis</button>
                <button onClick={() => setActiveTab('search')} className={tabButtonStyle('search')}>Recherche de Talents</button>
                <button onClick={() => setActiveTab('analysis')} className={tabButtonStyle('analysis')}>Analyse Comparative</button>
            </nav>
        </div>
      <div className="bg-slate-800 p-4 rounded-b-lg">
          {activeTab === 'profiles' && renderProfilesTab()}
          {activeTab === 'search' && renderSearchTab()}
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
          appState={{ riders: [], teams: [], raceEvents: [], teamProducts: [] }}
          raceEvents={[]}
          riderEventSelections={[]}
          performanceEntries={[]}
          powerDurationsConfig={POWER_ANALYSIS_DURATIONS_CONFIG}
          calculateWkg={() => ''}
      />
      
       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? "Modifier Prospect" : "Nouveau Prospect"}>
        <div className="bg-slate-800 p-4 -m-6 rounded-lg">
            <nav className="flex space-x-1 border-b border-slate-600 mb-4 overflow-x-auto">
                <button onClick={() => setActiveModalTab('info')} className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${activeModalTab === 'info' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Infos</button>
                <button onClick={() => setActiveModalTab('power')} className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${activeModalTab === 'power' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Puissance</button>
                <button onClick={() => setActiveModalTab('project')} className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${activeModalTab === 'project' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Projet Perf.</button>
                <button onClick={() => setActiveModalTab('interview')} className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${activeModalTab === 'interview' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>Entretiens</button>
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
            </div>
            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-slate-700">
                <ActionButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</ActionButton>
                <ActionButton type="button" onClick={handleSaveProfile}>Sauvegarder</ActionButton>
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