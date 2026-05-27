import React, { useMemo, useState } from 'react';
import { AppState, Rider, ScoutingProfile, Sex, RaceEvent, EventType, PerformanceArchive, GroupAverageArchive, RiderQualityArchive, StaffQualityArchive, TeamMetricsArchive, User, AppSection, PermissionLevel, RiderQualitativeProfile } from '../types';
import {
  getMergedPerformanceArchive,
  getAllTimePowerAnalysisRiders,
  getAllScoutingProfilesForAnalysis,
  getAllTimeWinnerRiderIds,
  getAllTimeArchivedRiderIds,
  ALL_TIME_STATS_SEASON,
} from '../utils/performanceArchiveUtils';
import { getCurrentSeasonYear } from '../utils/seasonUtils';
import SectionWrapper from '../components/SectionWrapper';
import UsersIcon from '../components/icons/UsersIcon';
import TrophyIcon from '../components/icons/TrophyIcon';
import StarIcon from '../components/icons/StarIcon';
import CakeIcon from '../components/icons/CakeIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import { getAgeCategory } from '../utils/ageUtils';
import { DurabilityAnalysisTable, PowerAnalysisTable } from '../components';
import { countSeasonWins } from '../utils/fatigueDurabilityUtils';
import PerformanceProjectSynergyAnalyzer from '../components/PerformanceProjectSynergyAnalyzer';
import WorkGroupManager from '../components/WorkGroupManager';
import PerformanceOverviewEnhanced from '../components/PerformanceOverviewEnhanced';
import PerformanceProjectDetails from '../components/PerformanceProjectDetails';
import PerformanceInsightsAlerts from '../components/PerformanceInsightsAlerts';
import Modal from '../components/Modal';

interface PerformancePoleSectionProps {
  appState: AppState;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  currentUser?: User;
}

type PerformanceTab = 'overview' | 'powerAnalysis' | 'debriefings' | 'archives' | 'performanceProjects';
type PerformanceViewMode = 'overview' | 'synergy' | 'workgroups' | 'details';
type ArchiveDetailTab = 'quality' | 'powers' | 'durability';

const PerformancePoleSection: React.FC<PerformancePoleSectionProps> = ({ appState, effectivePermissions, currentUser }) => {
  const [activeTab, setActiveTab] = useState<PerformanceTab>('overview');
  const [selectedYear, setSelectedYear] = useState<number | null>(getCurrentSeasonYear());
  const [archiveDetailTab, setArchiveDetailTab] = useState<ArchiveDetailTab>('quality');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [performanceViewMode, setPerformanceViewMode] = useState<PerformanceViewMode>('overview');
  const [categoryDetail, setCategoryDetail] = useState<{ type: 'age' | 'roster'; key: string; label: string; riders: Rider[] } | null>(null);

  /** Puissances / fatigue archives : all time (effectif + archives + scouts auto) */
  const allTimePowerRiders = useMemo(() => {
    if (!appState) return [];
    return getAllTimePowerAnalysisRiders(appState);
  }, [appState]);

  const allTimeScouts = useMemo(() => {
    if (!appState) return [];
    return getAllScoutingProfilesForAnalysis(appState);
  }, [appState]);

  const allTimeArchivedRiderIds = useMemo(() => {
    if (!appState) return new Set<string>();
    return getAllTimeArchivedRiderIds(appState);
  }, [appState]);

  const hasAllTimePowerData = useMemo(() => {
    return allTimePowerRiders.length > 0 || allTimeScouts.length > 0;
  }, [allTimePowerRiders, allTimeScouts]);

  const allTimeWinnerRiderIds = useMemo(() => {
    if (!appState) return new Set<string>();
    return getAllTimeWinnerRiderIds(appState, allTimePowerRiders);
  }, [appState, allTimePowerRiders]);

  // Protection contre appState null/undefined
  if (!appState) {
    return (
      <SectionWrapper title="Vue d'Ensemble">
        <div className="p-6 text-center text-gray-500">
          Chargement des données...
        </div>
      </SectionWrapper>
    );
  }

  // Vérification des permissions d'accès
  const canViewPerformance = effectivePermissions?.performance?.includes('view') || false;
  if (!canViewPerformance) {
    return (
      <SectionWrapper title="Centre Stratégique des Performances">
        <div className="p-6 text-center text-gray-500">
          <ChartBarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700">Accès non autorisé</p>
          <p className="mt-2 text-gray-500">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
        </div>
      </SectionWrapper>
    );
  }

  const riders = appState.riders || [];
  const raceEvents = appState.raceEvents || [];
  const scoutingProfiles = appState.scoutingProfiles || [];

  // Calculs stratégiques améliorés
  const strategicMetrics = useMemo(() => {
    const totalRiders = riders.length;
    const femaleRiders = riders.filter(r => r.sex === Sex.FEMALE).length;
    const maleRiders = riders.filter(r => r.sex === Sex.MALE).length;
    
    // Calculs d'âge
    const currentDate = new Date();
    const ages = riders.map(rider => {
      const birthDate = new Date(rider.birthDate);
      return currentDate.getFullYear() - birthDate.getFullYear();
    }).filter(age => !isNaN(age));
    
    const ageStats = ages.length > 0 ? {
      average: Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length),
      min: Math.min(...ages),
      max: Math.max(...ages)
    } : { average: 0, min: 0, max: 0 };
    
    // Répartition par catégorie d'âge avec métriques de puissance
    const ageDistribution = ['U19', 'U23', 'Senior'].map(category => {
      const categoryRiders = riders.filter(r => {
        const { category: riderCategory } = getAgeCategory(r.birthDate);
        return riderCategory === category;
      });
      
      const categoryAges = categoryRiders.map(r => {
        const birthDate = new Date(r.birthDate);
        return currentDate.getFullYear() - birthDate.getFullYear();
      }).filter(age => !isNaN(age));
      
      const categoryAgeStats = categoryAges.length > 0 ? {
        average: Math.round(categoryAges.reduce((sum, age) => sum + age, 0) / categoryAges.length),
        min: Math.min(...categoryAges),
        max: Math.max(...categoryAges)
      } : { average: 0, min: 0, max: 0 };
      
      // Moyennes de puissance par catégorie (W et W/kg)
      const powerAverages = { cp: 0, power20min: 0, power12min: 0, power5min: 0, power1min: 0, power30s: 0, power5s: 0, power1s: 0 };
      const powerAveragesWkg = { cp: 0, power20min: 0, power12min: 0, power5min: 0, power1min: 0, power30s: 0, power5s: 0, power1s: 0 };
      
      if (categoryRiders.length > 0) {
        const ridersWithPower = categoryRiders.filter(r => r.powerProfileFresh);
        if (ridersWithPower.length > 0) {
          const keys = ['criticalPower', 'power20min', 'power12min', 'power5min', 'power1min', 'power30s', 'power5s', 'power1s'] as const;
          const avgKeys = ['cp', 'power20min', 'power12min', 'power5min', 'power1min', 'power30s', 'power5s', 'power1s'] as const;
          keys.forEach((k, i) => {
            const sumW = ridersWithPower.reduce((s, r) => s + ((r.powerProfileFresh as any)?.[k] || 0), 0);
            powerAverages[avgKeys[i]] = Math.round(sumW / ridersWithPower.length);
            const sumWkg = ridersWithPower.reduce((s, r) => {
              const w = (r.powerProfileFresh as any)?.[k] || 0;
              const kg = r.weightKg && r.weightKg > 0 ? r.weightKg : 70;
              return s + w / kg;
            }, 0);
            powerAveragesWkg[avgKeys[i]] = Math.round((sumWkg / ridersWithPower.length) * 10) / 10;
          });
        }
      }
      
      return {
        category,
        count: categoryRiders.length,
        riders: categoryRiders,
        ageStats: categoryAgeStats,
        powerAverages,
        powerAveragesWkg
      };
    });

    // Répartition par équipe (Première / Réserve)
    const principalRiders = riders.filter(r => r.rosterRole !== 'reserve');
    const reserveRiders = riders.filter(r => r.rosterRole === 'reserve');
    const computeRosterAverages = (list: Rider[]) => {
      const powerAverages = { cp: 0, power20min: 0, power12min: 0, power5min: 0, power1min: 0, power30s: 0, power5s: 0, power1s: 0 };
      const powerAveragesWkg = { cp: 0, power20min: 0, power12min: 0, power5min: 0, power1min: 0, power30s: 0, power5s: 0, power1s: 0 };
      const withPower = list.filter(r => r.powerProfileFresh);
      if (withPower.length > 0) {
        const keys = ['criticalPower', 'power20min', 'power12min', 'power5min', 'power1min', 'power30s', 'power5s', 'power1s'] as const;
        const avgKeys = ['cp', 'power20min', 'power12min', 'power5min', 'power1min', 'power30s', 'power5s', 'power1s'] as const;
        keys.forEach((k, i) => {
          powerAverages[avgKeys[i]] = Math.round(withPower.reduce((s, r) => s + ((r.powerProfileFresh as any)?.[k] || 0), 0) / withPower.length);
          powerAveragesWkg[avgKeys[i]] = Math.round((withPower.reduce((s, r) => {
            const w = (r.powerProfileFresh as any)?.[k] || 0;
            const kg = r.weightKg && r.weightKg > 0 ? r.weightKg : 70;
            return s + w / kg;
          }, 0) / withPower.length) * 10) / 10;
        });
      }
      return { powerAverages, powerAveragesWkg };
    };
    const principalAvg = computeRosterAverages(principalRiders);
    const reserveAvg = computeRosterAverages(reserveRiders);
    const rosterDistribution = [
      { role: 'principal' as const, label: 'Équipe première', count: principalRiders.length, riders: principalRiders, ...principalAvg },
      { role: 'reserve' as const, label: 'Réserve', count: reserveRiders.length, riders: reserveRiders, ...reserveAvg }
    ];

    // Coureurs avec profil de puissance
    const ridersWithPower = riders.filter(r => r.powerProfileFresh?.criticalPower).length;
    
    // Événements à venir
    const upcomingEvents = raceEvents.filter(event => 
      event.type === EventType.COMPETITION && 
      new Date(event.startDate) > new Date()
    ).length;

    // Moyenne CP de l'équipe
    const averageCP = riders.length > 0 
      ? Math.round(riders.reduce((sum, r) => {
          const cp = r.powerProfileFresh?.criticalPower || 0;
          return sum + cp;
        }, 0) / riders.length)
      : 0;

    // Derniers résultats de l'équipe
    const recentResults = appState.performanceEntries
      ?.filter(entry => {
        const event = raceEvents.find(e => e.id === entry.eventId);
        return event && new Date(event.startDate) <= new Date();
      })
      ?.sort((a, b) => {
        const eventA = raceEvents.find(e => e.id === a.eventId);
        const eventB = raceEvents.find(e => e.id === b.eventId);
        return new Date(eventB?.startDate || 0).getTime() - new Date(eventA?.startDate || 0).getTime();
      })
      ?.slice(0, 3) || [];

    // Groupement par équipe (si disponible)
    const teamGroups = appState.teams?.map(team => {
      const teamRiders = riders.filter(rider => {
        // Logique pour associer les coureurs à l'équipe
        // Pour l'instant, on prend tous les coureurs si c'est l'équipe active
        return appState.activeTeamId === team.id;
      });
      
      const teamAges = teamRiders.map(rider => {
        const birthDate = new Date(rider.birthDate);
        return currentDate.getFullYear() - birthDate.getFullYear();
      }).filter(age => !isNaN(age));
      
      const teamAgeStats = teamAges.length > 0 ? {
        average: Math.round(teamAges.reduce((sum, age) => sum + age, 0) / teamAges.length),
        min: Math.min(...teamAges),
        max: Math.max(...teamAges)
      } : { average: 0, min: 0, max: 0 };
      
      return {
        team,
        riderCount: teamRiders.length,
        ageStats: teamAgeStats
      };
    }).filter(group => group.riderCount > 0) || [];

    return {
      totalRiders,
      femaleRiders,
      maleRiders,
      ageStats,
      ageDistribution,
      rosterDistribution,
      ridersWithPower,
      upcomingEvents,
      averageCP,
      powerCoverage: totalRiders > 0 ? Math.round((ridersWithPower / totalRiders) * 100) : 0,
      recentResults,
      teamGroups
    };
  }, [riders, raceEvents, appState.performanceEntries]);

  const tabButtonStyle = (tabName: PerformanceTab) => 
    `px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap transition-colors duration-150 focus:outline-none ${
      activeTab === tabName 
        ? 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  const durationLabels: { key: string; label: string }[] = [
    { key: 'power1s', label: '1s' },
    { key: 'power5s', label: '5s' },
    { key: 'power30s', label: '30s' },
    { key: 'power1min', label: '1min' },
    { key: 'power5min', label: '5min' },
    { key: 'power12min', label: '12min' },
    { key: 'power20min', label: '20min' },
    { key: 'criticalPower', label: 'CP' }
  ];
  const fatigueProfiles = [
    { key: 'powerProfileFresh', label: 'Frais' },
    { key: 'powerProfile15KJ', label: '15 kJ/kg' },
    { key: 'powerProfile30KJ', label: '30 kJ/kg' },
    { key: 'powerProfile45KJ', label: '45 kJ/kg' }
  ] as const;

  const getRiderName = (r: Rider) => `${(r.firstName || '').trim()} ${(r.lastName || '').trim()}`.trim() || '–';

  const categoryStats = useMemo(() => {
    if (!categoryDetail || categoryDetail.riders.length === 0) return null;
    const riders = categoryDetail.riders;
    const std = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
      return Math.sqrt(variance);
    };
    type CellStat = {
      meanW: number; stdW: number; meanWkg: number; stdWkg: number; n: number;
      minW: number; maxW: number; minWkg: number; maxWkg: number;
      minWRiderName: string; maxWRiderName: string; minWkgRiderName: string; maxWkgRiderName: string;
    };
    const result: Record<string, Record<string, CellStat>> = {};
    fatigueProfiles.forEach(({ key: profileKey }) => {
      result[profileKey] = {};
      durationLabels.forEach(({ key: durationKey }) => {
        const entries: { w: number; wkg: number; rider: Rider }[] = [];
        riders.forEach((r) => {
          const profile = (r as any)[profileKey];
          const raw = profile?.[durationKey] ?? 0;
          if (raw <= 0) return;
          const weight = r.weightKg && r.weightKg > 0 ? r.weightKg : 70;
          entries.push({ w: raw, wkg: raw / weight, rider: r });
        });
        if (entries.length > 0) {
          const valuesW = entries.map((e) => e.w);
          const valuesWkg = entries.map((e) => e.wkg);
          const meanW = valuesW.reduce((a, b) => a + b, 0) / valuesW.length;
          const meanWkg = valuesWkg.reduce((a, b) => a + b, 0) / valuesWkg.length;
          const minW = Math.min(...valuesW);
          const maxW = Math.max(...valuesW);
          const minWkg = Math.min(...valuesWkg);
          const maxWkg = Math.max(...valuesWkg);
          const minWRider = entries.find((e) => e.w === minW);
          const maxWRider = entries.find((e) => e.w === maxW);
          const minWkgRider = entries.find((e) => e.wkg === minWkg);
          const maxWkgRider = entries.find((e) => e.wkg === maxWkg);
          result[profileKey][durationKey] = {
            meanW,
            stdW: std(valuesW),
            meanWkg,
            stdWkg: std(valuesWkg),
            n: entries.length,
            minW,
            maxW,
            minWkg,
            maxWkg,
            minWRiderName: minWRider ? getRiderName(minWRider.rider) : '–',
            maxWRiderName: maxWRider ? getRiderName(maxWRider.rider) : '–',
            minWkgRiderName: minWkgRider ? getRiderName(minWkgRider.rider) : '–',
            maxWkgRiderName: maxWkgRider ? getRiderName(maxWkgRider.rider) : '–'
          };
        }
      });
    });
    return result;
  }, [categoryDetail]);

  return (
    <>
      <Modal
        isOpen={!!categoryDetail}
        onClose={() => setCategoryDetail(null)}
        title={categoryDetail ? `Détail · ${categoryDetail.label}` : ''}
      >
        {categoryDetail && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{categoryDetail.riders.length} coureur(s) · Moyennes, écart-type, min et max (avec noms)</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 pr-4 text-gray-700 font-semibold">Durée</th>
                    {fatigueProfiles.map(({ key, label }) => (
                      <th key={key} className="text-center py-2 px-2 text-gray-700 font-semibold">{label}</th>
                    ))}
                  </tr>
                  <tr className="text-xs text-gray-500">
                    <th className="text-left py-1 pr-4"></th>
                    {fatigueProfiles.map(({ key }) => (
                      <th key={key} className="text-center py-1 px-1">moy ± σ (W · W/kg)</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {durationLabels.map(({ key: durationKey, label }) => (
                    <tr key={durationKey} className="border-b border-gray-200">
                      <td className="py-2 pr-4 font-medium text-gray-700">{label}</td>
                      {fatigueProfiles.map(({ key: profileKey }) => {
                        const stat = categoryStats?.[profileKey]?.[durationKey];
                        if (!stat) return <td key={profileKey} className="py-2 px-2 text-center text-gray-400">–</td>;
                        const w = `${Math.round(stat.meanW)} ± ${Math.round(stat.stdW)}`;
                        const wkg = `${stat.meanWkg.toFixed(1)} ± ${stat.stdWkg.toFixed(1)}`;
                        return (
                          <td key={profileKey} className="py-2 px-2 text-center text-gray-800 align-top">
                            <span className="font-medium">{w}</span> W<br />
                            <span className="text-blue-600 text-xs">{wkg}</span> W/kg
                            <div className="mt-1.5 pt-1.5 border-t border-gray-200 text-xs text-gray-500 text-left">
                              <div>Min: {Math.round(stat.minW)} W · <span className="font-medium text-gray-700">{stat.minWRiderName}</span></div>
                              <div>Max: {Math.round(stat.maxW)} W · <span className="font-medium text-gray-700">{stat.maxWRiderName}</span></div>
                              <div>Min: {stat.minWkg.toFixed(1)} W/kg · <span className="font-medium text-gray-700">{stat.minWkgRiderName}</span></div>
                              <div>Max: {stat.maxWkg.toFixed(1)} W/kg · <span className="font-medium text-gray-700">{stat.maxWkgRiderName}</span></div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
      <style jsx={true}>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider:focus {
          outline: none;
        }
        
        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
        
        .slider:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
      `}</style>
      <SectionWrapper title="Vue d'Ensemble">
      {/* Onglets principaux */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
          <button onClick={() => setActiveTab('overview')} className={tabButtonStyle('overview')}>
            <UsersIcon className="w-4 h-4 inline mr-2" />
            Vue d'Ensemble
          </button>
          <button onClick={() => setActiveTab('powerAnalysis')} className={tabButtonStyle('powerAnalysis')}>
            <ChartBarIcon className="w-4 h-4 inline mr-2" />
            Analyse des Puissances
          </button>
          <button onClick={() => setActiveTab('performanceProjects')} className={tabButtonStyle('performanceProjects')}>
            <StarIcon className="w-4 h-4 inline mr-2" />
            Projets Performance
          </button>
          <button onClick={() => setActiveTab('debriefings')} className={tabButtonStyle('debriefings')}>
            <TrophyIcon className="w-4 h-4 inline mr-2" />
            Débriefings
          </button>
          <button onClick={() => setActiveTab('archives')} className={tabButtonStyle('archives')}>
            <ChartBarIcon className="w-4 h-4 inline mr-2" />
            Archives
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* En-tête stratégique */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Vue d'Ensemble Stratégique</h2>
            <p className="text-blue-100">
              Tableau de bord centralisé pour la prise de décision stratégique du pôle performance
            </p>
          </div>

        {/* Métriques clés en grille */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Coureurs */}
          <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <UsersIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Effectif Total</p>
                <p className="text-3xl font-bold text-gray-900">{strategicMetrics.totalRiders}</p>
                <p className="text-xs text-gray-500">Coureurs actifs</p>
              </div>
            </div>
          </div>

          {/* Âge Moyen */}
          <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-orange-500">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-full">
                <CakeIcon className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Âge Moyen</p>
                <p className="text-3xl font-bold text-gray-900">{strategicMetrics.ageStats.average} ans</p>
                <p className="text-xs text-gray-500">
                  {strategicMetrics.ageStats.min}-{strategicMetrics.ageStats.max} ans
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Répartition par catégorie d'âge (cliquable → détail + profils fatigue) */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <TrophyIcon className="w-6 h-6 text-blue-600 mr-3" />
            Répartition par catégorie d&apos;âge
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategicMetrics.ageDistribution.map(({ category, count, ageStats, powerAverages, powerAveragesWkg, riders: categoryRiders }) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryDetail({ type: 'age', key: category, label: category, riders: categoryRiders })}
                className="text-left bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{count}</div>
                  <div className="text-lg font-semibold text-gray-800">{category}</div>
                  <div className="text-sm text-gray-600">
                    {strategicMetrics.totalRiders > 0 ? Math.round((count / strategicMetrics.totalRiders) * 100) : 0}% de l&apos;effectif
                  </div>
                </div>
                {count > 0 && powerAverages.cp > 0 && (
                  <div className="bg-white p-3 rounded-lg border space-y-2">
                    <div className="text-xs text-gray-500 font-medium">Moyennes · W (brut)</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div><span className="text-gray-500">CP:</span> <span className="font-semibold">{powerAverages.cp}W</span></div>
                      <div><span className="text-gray-500">20min:</span> <span className="font-semibold">{powerAverages.power20min}W</span></div>
                      <div><span className="text-gray-500">12min:</span> <span className="font-semibold">{powerAverages.power12min}W</span></div>
                      <div><span className="text-gray-500">5min:</span> <span className="font-semibold">{powerAverages.power5min}W</span></div>
                      <div><span className="text-gray-500">1min:</span> <span className="font-semibold">{powerAverages.power1min}W</span></div>
                      <div><span className="text-gray-500">30s:</span> <span className="font-semibold">{powerAverages.power30s}W</span></div>
                      <div><span className="text-gray-500">5s:</span> <span className="font-semibold">{powerAverages.power5s}W</span></div>
                      <div><span className="text-gray-500">1s:</span> <span className="font-semibold">{powerAverages.power1s}W</span></div>
                    </div>
                    <div className="text-xs text-gray-500 font-medium pt-1 border-t">Moyennes · W/kg</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div><span className="text-gray-500">CP:</span> <span className="font-semibold">{powerAveragesWkg.cp} W/kg</span></div>
                      <div><span className="text-gray-500">20min:</span> <span className="font-semibold">{powerAveragesWkg.power20min} W/kg</span></div>
                      <div><span className="text-gray-500">12min:</span> <span className="font-semibold">{powerAveragesWkg.power12min} W/kg</span></div>
                      <div><span className="text-gray-500">5min:</span> <span className="font-semibold">{powerAveragesWkg.power5min} W/kg</span></div>
                      <div><span className="text-gray-500">1min:</span> <span className="font-semibold">{powerAveragesWkg.power1min} W/kg</span></div>
                      <div><span className="text-gray-500">30s:</span> <span className="font-semibold">{powerAveragesWkg.power30s} W/kg</span></div>
                      <div><span className="text-gray-500">5s:</span> <span className="font-semibold">{powerAveragesWkg.power5s} W/kg</span></div>
                      <div><span className="text-gray-500">1s:</span> <span className="font-semibold">{powerAveragesWkg.power1s} W/kg</span></div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-blue-600 mt-2">Cliquer pour voir le détail et les profils de fatigue</p>
              </button>
            ))}
          </div>
        </div>

        {/* Répartition par équipe (Première / Réserve) — W brut et W/kg, cliquable */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <UsersIcon className="w-6 h-6 text-indigo-600 mr-3" />
            Répartition par équipe
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {strategicMetrics.rosterDistribution.map(({ role, label, count, riders: rosterRiders, powerAverages, powerAveragesWkg }) => (
              <button
                key={role}
                type="button"
                onClick={() => setCategoryDetail({ type: 'roster', key: role, label, riders: rosterRiders })}
                className="text-left bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">{count}</div>
                  <div className="text-lg font-semibold text-gray-800">{label}</div>
                  <div className="text-sm text-gray-600">
                    {strategicMetrics.totalRiders > 0 ? Math.round((count / strategicMetrics.totalRiders) * 100) : 0}% de l&apos;effectif
                  </div>
                </div>
                {count > 0 && powerAverages.cp > 0 && (
                  <div className="bg-white p-3 rounded-lg border space-y-2">
                    <div className="text-xs text-gray-500 font-medium">Moyennes · W (brut)</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div><span className="text-gray-500">CP:</span> <span className="font-semibold">{powerAverages.cp}W</span></div>
                      <div><span className="text-gray-500">20min:</span> <span className="font-semibold">{powerAverages.power20min}W</span></div>
                      <div><span className="text-gray-500">12min:</span> <span className="font-semibold">{powerAverages.power12min}W</span></div>
                      <div><span className="text-gray-500">5min:</span> <span className="font-semibold">{powerAverages.power5min}W</span></div>
                      <div><span className="text-gray-500">1min:</span> <span className="font-semibold">{powerAverages.power1min}W</span></div>
                      <div><span className="text-gray-500">30s:</span> <span className="font-semibold">{powerAverages.power30s}W</span></div>
                      <div><span className="text-gray-500">5s:</span> <span className="font-semibold">{powerAverages.power5s}W</span></div>
                      <div><span className="text-gray-500">1s:</span> <span className="font-semibold">{powerAverages.power1s}W</span></div>
                    </div>
                    <div className="text-xs text-gray-500 font-medium pt-1 border-t">Moyennes · W/kg</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div><span className="text-gray-500">CP:</span> <span className="font-semibold">{powerAveragesWkg.cp} W/kg</span></div>
                      <div><span className="text-gray-500">20min:</span> <span className="font-semibold">{powerAveragesWkg.power20min} W/kg</span></div>
                      <div><span className="text-gray-500">12min:</span> <span className="font-semibold">{powerAveragesWkg.power12min} W/kg</span></div>
                      <div><span className="text-gray-500">5min:</span> <span className="font-semibold">{powerAveragesWkg.power5min} W/kg</span></div>
                      <div><span className="text-gray-500">1min:</span> <span className="font-semibold">{powerAveragesWkg.power1min} W/kg</span></div>
                      <div><span className="text-gray-500">30s:</span> <span className="font-semibold">{powerAveragesWkg.power30s} W/kg</span></div>
                      <div><span className="text-gray-500">5s:</span> <span className="font-semibold">{powerAveragesWkg.power5s} W/kg</span></div>
                      <div><span className="text-gray-500">1s:</span> <span className="font-semibold">{powerAveragesWkg.power1s} W/kg</span></div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-indigo-600 mt-2">Cliquer pour voir le détail et les profils de fatigue</p>
              </button>
            ))}
          </div>
        </div>

        {/* Alertes et valeurs intéressantes (détection intelligente vs profils / moyennes) */}
        <PerformanceInsightsAlerts
          riders={riders}
          scoutingProfiles={scoutingProfiles}
          maxAlerts={5}
          maxInsights={8}
          showInsights
          showAlerts
        />

        {/* Derniers résultats de l'équipe */}
        {strategicMetrics.recentResults.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <TrophyIcon className="w-6 h-6 text-yellow-600 mr-3" />
              Derniers Résultats de l'Équipe
            </h3>
            <div className="space-y-4">
              {strategicMetrics.recentResults.map((result, index) => {
                const event = raceEvents.find(e => e.id === result.eventId);
                if (!event) return null;
                
                return (
                  <div key={result.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{event.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {new Date(event.startDate).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        {result.raceOverallRanking && (
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Classement général:</span> {result.raceOverallRanking}
                          </p>
                        )}
                        {result.resultsSummary && (
                          <p className="text-sm text-gray-700 mt-1">
                            <span className="font-medium">Résumé:</span> {result.resultsSummary}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-yellow-600">#{index + 1}</div>
                        <div className="text-xs text-gray-500">Dernier</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        </div>
      )}

      {activeTab === 'powerAnalysis' && (
        <PowerAnalysisSubSection riders={riders} scoutingProfiles={scoutingProfiles} />
      )}

      {activeTab === 'performanceProjects' && (
        <div className="space-y-6">
          {/* En-tête avec navigation */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Projets Performance</h3>
                <p className="text-gray-600">Vue d'ensemble des objectifs athlètes et analyse des synergies</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">{riders.length}</div>
                <div className="text-sm text-gray-500">athlètes</div>
            </div>
          </div>

            {/* Navigation des vues */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPerformanceViewMode('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  performanceViewMode === 'overview'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Vue d'ensemble
              </button>
              <button
                onClick={() => setPerformanceViewMode('synergy')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  performanceViewMode === 'synergy'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Analyse des synergies
              </button>
              <button
                onClick={() => setPerformanceViewMode('workgroups')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  performanceViewMode === 'workgroups'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Groupes de travail
              </button>
              <button
                onClick={() => setPerformanceViewMode('details')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  performanceViewMode === 'details'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Détails des domaines
              </button>
            </div>
          </div>
          
          {/* Contenu conditionnel selon le mode de vue */}
          {performanceViewMode === 'overview' && (
            <PerformanceOverviewEnhanced 
              riders={riders}
              onRiderSelect={(rider) => {
                console.log('Athlète sélectionné:', rider);
                // Ici vous pouvez ajouter une logique pour afficher les détails de l'athlète
              }}
            />
          )}

          {performanceViewMode === 'synergy' && (
            <PerformanceProjectSynergyAnalyzer 
              riders={riders}
              onGroupSelect={(group) => {
                console.log('Groupe sélectionné:', group);
                // Ici vous pouvez ajouter une logique pour afficher les détails du groupe
              }}
            />
          )}

          {performanceViewMode === 'workgroups' && (
            <WorkGroupManager 
              riders={riders}
              staffMembers={appState.staff || []}
              onGroupCreate={(group) => {
                console.log('Groupe créé:', group);
                // Ici vous pouvez ajouter une logique pour sauvegarder le groupe
              }}
              onGroupUpdate={(group) => {
                console.log('Groupe modifié:', group);
                // Ici vous pouvez ajouter une logique pour mettre à jour le groupe
              }}
              onGroupDelete={(groupId) => {
                console.log('Groupe supprimé:', groupId);
                // Ici vous pouvez ajouter une logique pour supprimer le groupe
              }}
            />
          )}


          {performanceViewMode === 'details' && (
            <PerformanceProjectDetails 
              riders={riders}
              onRiderSelect={(rider) => {
                console.log('Athlète sélectionné:', rider);
                // Ici vous pouvez ajouter une logique pour afficher les détails de l'athlète
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'debriefings' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Historique des Débriefings</h3>
            <p className="text-gray-600 mb-6">
              Consultez l'historique des débriefings saison par saison pour analyser l'évolution des performances d'une année sur l'autre.
            </p>
            
            {/* Curseur de sélection d'année */}
            <div className="mb-6">
              {(() => {
                const today = new Date();
                const currentYear = today.getFullYear();
                
                // Grouper les débriefings par saison pour obtenir les années disponibles
                const debriefingsBySeason = (appState.performanceEntries || [])
                  .map(entry => {
                    const event = raceEvents.find(e => e.id === entry.eventId);
                    if (!event) return null;
                    
                    const eventEndDate = new Date(event.endDate || event.date);
                    eventEndDate.setHours(23, 59, 59, 999);
                    const daysSinceEvent = Math.floor((today.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysSinceEvent < 1) return null;
                    
                    const eventYear = new Date(event.endDate || event.date).getFullYear();
                    return { ...entry, event, daysSinceEvent, season: eventYear };
                  })
                  .filter(Boolean)
                  .reduce((acc, debriefing) => {
                    const season = debriefing.season;
                    if (!acc[season]) {
                      acc[season] = [];
                    }
                    acc[season].push(debriefing);
                    return acc;
                  }, {} as Record<number, any[]>);

                const availableYears = Object.keys(debriefingsBySeason)
                  .map(Number)
                  .sort((a, b) => b - a);

                if (availableYears.length === 0) return null;

                const minYear = Math.min(...availableYears);
                const maxYear = Math.max(...availableYears);

                return (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Filtrer par année</h4>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedYear(null)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            selectedYear === null 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          Toutes
                        </button>
                        <span className="text-xs text-gray-500">
                          {selectedYear ? `Saison ${selectedYear}` : `${availableYears.length} saisons`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-gray-500 font-medium">{minYear}</span>
                      <div className="flex-1 relative">
                        <input
                          type="range"
                          min={minYear}
                          max={maxYear}
                          value={selectedYear || maxYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((selectedYear || maxYear) - minYear) / (maxYear - minYear) * 100}%, #e5e7eb ${((selectedYear || maxYear) - minYear) / (maxYear - minYear) * 100}%, #e5e7eb 100%)`
                          }}
                        />
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gray-200 rounded-lg pointer-events-none"></div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{maxYear}</span>
                    </div>
                    
                    {/* Années disponibles en boutons rapides */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {availableYears.map(year => (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            selectedYear === year 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Historique des débriefings par saison */}
            <div className="space-y-6">
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Grouper les débriefings par saison (année)
                const debriefingsBySeason = (appState.performanceEntries || [])
                  .map(entry => {
                    const event = raceEvents.find(e => e.id === entry.eventId);
                    if (!event) return null;
                    
                    // Vérifier que l'événement est terminé depuis au moins un jour
                    const eventEndDate = new Date(event.endDate || event.date);
                    eventEndDate.setHours(23, 59, 59, 999);
                    const daysSinceEvent = Math.floor((today.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // L'événement doit être terminé depuis au moins 1 jour
                    if (daysSinceEvent < 1) return null;
                    
                    const eventYear = new Date(event.endDate || event.date).getFullYear();
                    return { ...entry, event, daysSinceEvent, season: eventYear };
                  })
                  .filter(Boolean)
                  .reduce((acc, debriefing) => {
                    const season = debriefing.season;
                    if (!acc[season]) {
                      acc[season] = [];
                    }
                    acc[season].push(debriefing);
                    return acc;
                  }, {} as Record<number, any[]>);

                // Trier les saisons par ordre décroissant (plus récent en premier)
                let sortedSeasons = Object.keys(debriefingsBySeason)
                  .map(Number)
                  .sort((a, b) => b - a);

                // Filtrer par année sélectionnée si applicable
                if (selectedYear !== null) {
                  sortedSeasons = sortedSeasons.filter(year => year === selectedYear);
                }

                // Événements en attente de debriefing (terminés aujourd'hui ou hier)
                const eventsAwaitingDebriefing = raceEvents
                  .filter(event => {
                    const eventEndDate = new Date(event.endDate || event.date);
                    eventEndDate.setHours(23, 59, 59, 999);
                    const daysSinceEvent = Math.floor((today.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // L'événement s'est terminé aujourd'hui (0 jours) ou hier (1 jour) mais n'a pas encore de debriefing
                    return daysSinceEvent >= 0 && daysSinceEvent < 1 && !(appState.performanceEntries || []).some(pe => pe.eventId === event.id);
                  })
                  .sort((a, b) => {
                    const dateA = new Date(a.endDate || a.date);
                    const dateB = new Date(b.endDate || b.date);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .slice(0, 3);

                if (sortedSeasons.length === 0 && eventsAwaitingDebriefing.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <TrophyIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Aucun debriefing disponible</p>
                      <p className="text-sm">Les debriefings apparaîtront ici une fois les événements terminés.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-8">
                    {/* Événements en attente de debriefing */}
                    {eventsAwaitingDebriefing.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                          <TrophyIcon className="w-5 h-5 mr-2" />
                          Événements en Attente de Débriefing
                        </h4>
                        <div className="space-y-2">
                          {eventsAwaitingDebriefing.map(event => (
                            <div key={event.id} className="flex justify-between items-center p-3 bg-white rounded border border-yellow-200">
                              <div>
                                <p className="font-medium text-gray-800">{event.name}</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(event.endDate || event.date).toLocaleDateString('fr-FR', { 
                                    weekday: 'long', 
                                    day: 'numeric', 
                                    month: 'long' 
                                  })} - {event.location}
                                </p>
                              </div>
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                Débriefing demain
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Historique par saison */}
                    {sortedSeasons.map(season => {
                      const seasonDebriefings = debriefingsBySeason[season];
                      const seasonStats = {
                        totalEvents: seasonDebriefings.length,
                        avgRanking: seasonDebriefings.reduce((sum, d) => sum + (d.raceOverallRanking || 0), 0) / seasonDebriefings.length,
                        completedDebriefings: seasonDebriefings.filter(d => d.generalObjectives || d.resultsSummary).length
                      };

                      return (
                        <div key={season} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          {/* En-tête de saison */}
                          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xl font-bold">Saison {season}</h4>
                                <p className="text-blue-100 text-sm">
                                  {seasonStats.totalEvents} événement(s) • {seasonStats.completedDebriefings} débriefé(s)
                                  {seasonStats.avgRanking > 0 && ` • Rang moyen: ${Math.round(seasonStats.avgRanking)}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">{seasonStats.totalEvents}</div>
                                <div className="text-blue-100 text-sm">Événements</div>
                              </div>
                            </div>
                          </div>

                          {/* Liste des débriefings de la saison */}
                          <div className="divide-y divide-gray-200">
                            {seasonDebriefings
                              .sort((a, b) => {
                                const dateA = new Date(a.event.endDate || a.event.date);
                                const dateB = new Date(b.event.endDate || b.event.date);
                                return dateB.getTime() - dateA.getTime();
                              })
                              .map((debriefing, index) => (
                                <div key={debriefing.id} className="p-4 hover:bg-gray-50 transition-colors">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                          <span className="text-blue-600 font-semibold text-sm">#{index + 1}</span>
                                        </div>
                                        <div>
                                          <h5 className="text-lg font-semibold text-gray-800">{debriefing.event.name}</h5>
                                          <p className="text-sm text-gray-600">
                                            {new Date(debriefing.event.endDate || debriefing.event.date).toLocaleDateString('fr-FR', { 
                                              weekday: 'long', 
                                              day: 'numeric', 
                                              month: 'long',
                                              year: 'numeric' 
                                            })} - {debriefing.event.location}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {debriefing.raceOverallRanking && (
                                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                          Rang {debriefing.raceOverallRanking}
                                        </span>
                                      )}
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        debriefing.generalObjectives || debriefing.resultsSummary 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {debriefing.generalObjectives || debriefing.resultsSummary ? 'Complet' : 'Partiel'}
                                      </span>
                                      <button
                                        onClick={() => window.location.href = `#eventDetail-${debriefing.event.id}`}
                                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                      >
                                        Voir
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Résumé du debriefing */}
                                  {(debriefing.generalObjectives || debriefing.resultsSummary || debriefing.keyLearnings) && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm ml-11">
                                      {debriefing.generalObjectives && (
                                        <div>
                                          <h6 className="font-medium text-gray-700 mb-1">Objectifs</h6>
                                          <p className="text-gray-600 line-clamp-2">{debriefing.generalObjectives}</p>
                                        </div>
                                      )}
                                      {debriefing.resultsSummary && (
                                        <div>
                                          <h6 className="font-medium text-gray-700 mb-1">Résultats</h6>
                                          <p className="text-gray-600 line-clamp-2">{debriefing.resultsSummary}</p>
                                        </div>
                                      )}
                                      {debriefing.keyLearnings && (
                                        <div>
                                          <h6 className="font-medium text-gray-700 mb-1">Enseignements</h6>
                                          <p className="text-gray-600 line-clamp-2">{debriefing.keyLearnings}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'archives' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Archives des Performances</h3>
            <p className="text-gray-600 mb-6">
              Les <strong>notes de qualité</strong> restent liées à la saison sélectionnée. Les onglets{' '}
              <strong>Puissances</strong> et <strong>Pertes fatigue</strong> utilisent une vue{' '}
              <strong>all time</strong> : effectif actuel, toutes les coureuses archivées en base et{' '}
              <strong>tous les scouts</strong> inclus automatiquement.
            </p>
            

            {/* Affichage des archives */}
            <div className="space-y-6">
              {(() => {
                const currentSeason = getCurrentSeasonYear();
                const mergedArchive = getMergedPerformanceArchive(appState, currentSeason);
                const archives: PerformanceArchive[] = mergedArchive ? [mergedArchive] : [];

                const filteredArchives = selectedYear 
                  ? archives.filter(archive => archive.season === selectedYear)
                  : archives;

                if (filteredArchives.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Aucune donnée disponible pour {getCurrentSeasonYear()}</p>
                      <p className="text-sm">Les archives apparaîtront ici une fois que vous aurez des coureurs et des événements enregistrés. Les coureuses retirées de l&apos;effectif restent visibles dans cet historique.</p>
                    </div>
                  );
                }


                return (
                  <div className="space-y-8">
                    {/* Tableau visuel des archives */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                        <h4 className="text-xl font-bold">Tableau des Archives par Saison</h4>
                        <p className="text-blue-100 text-sm">Cliquez sur une année pour voir les détails des notes de qualité d'effectifs</p>
                      </div>
                      
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saison</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effectif</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moyenne Générale</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Âge Moyen</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredArchives.map(archive => {
                              // Calculer la moyenne générale des notes de qualité (pas sur 5)
                              const averageGeneralScore = archive.riderQualityNotes.length > 0
                                ? Math.round((archive.riderQualityNotes.reduce((sum, rider) => 
                                    sum + rider.generalPerformanceScore, 0
                                  ) / archive.riderQualityNotes.length) * 10) / 10
                                : 0;

                              return (
                                <tr 
                                  key={archive.id} 
                                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                                    selectedYear === archive.season ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                  }`} 
                                  onClick={() => setSelectedYear(archive.season)}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="text-lg font-bold text-gray-900">{archive.season}</div>
                                      {selectedYear === archive.season && (
                                        <div className="ml-2 flex items-center">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                          <span className="text-xs text-blue-600 font-medium">Sélectionné</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{archive.groupAverages.totalRiders}</div>
                                    <div className="text-sm text-gray-500">coureurs</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-2xl font-bold text-blue-600">{averageGeneralScore}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{archive.groupAverages.averageAge} ans</div>
                                    <div className="text-sm text-gray-500">moyenne</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedYear(archive.season);
                                      }}
                                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                    >
                                      Voir détails
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Détails : qualité = saison ; puissances / fatigue = all time */}
                    {(selectedYear || hasAllTimePowerData) && (
                      <div className="space-y-4">
                        <nav className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setArchiveDetailTab('quality')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                              archiveDetailTab === 'quality'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            Notes de qualité
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchiveDetailTab('powers')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                              archiveDetailTab === 'powers'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            Analyse des puissances
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchiveDetailTab('durability')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                              archiveDetailTab === 'durability'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            Pertes fatigue
                          </button>
                        </nav>

                        {archiveDetailTab === 'powers' && (
                          hasAllTimePowerData ? (
                            <PowerAnalysisTable
                              riders={allTimePowerRiders}
                              scoutingProfiles={allTimeScouts}
                              title="Analyse des Puissances — All time"
                              alwaysIncludeScouts
                              removedRiderIds={allTimeArchivedRiderIds}
                              season={ALL_TIME_STATS_SEASON}
                              winnerRiderIds={allTimeWinnerRiderIds}
                              scopeLabel="All time (toutes saisons, toute la base)"
                            />
                          ) : (
                            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                              <p className="text-sm">
                                Aucun profil de puissance en base. Ajoutez des PPR aux coureuses ou aux
                                scouts du module Scouting.
                              </p>
                            </div>
                          )
                        )}

                        {archiveDetailTab === 'durability' && (
                          <DurabilityAnalysisTable
                            riders={allTimePowerRiders}
                            scoutingProfiles={allTimeScouts}
                            title="Pertes sous fatigue — All time"
                            subtitle="Effectif actuel, coureuses archivées et scouts — repères sur toute la base."
                            season={ALL_TIME_STATS_SEASON}
                            winnerRiderIds={allTimeWinnerRiderIds}
                            removedRiderIds={allTimeArchivedRiderIds}
                            showBenchmarkPanel
                            alwaysIncludeScouts
                            scopeLabel="All time (toutes saisons, toute la base)"
                          />
                        )}

                        {archiveDetailTab === 'quality' && !selectedYear && (
                          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                            <p className="text-sm">Sélectionnez une saison dans le tableau pour les notes de qualité.</p>
                          </div>
                        )}

                        {archiveDetailTab === 'quality' && selectedYear && (() => {
                      const selectedArchive = archives.find(a => a.season === selectedYear);
                      if (!selectedArchive || selectedArchive.riderQualityNotes.length === 0) {
                        return (
                          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                            <p className="text-sm">Aucune note de qualité pour cette saison.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xl font-bold">Notes de Qualité d'Effectifs - Saison {selectedYear}</h4>
                                <p className="text-green-100 text-sm">Détail des évaluations par coureur</p>
                              </div>
                              <button
                                onClick={() => setSelectedYear(null)}
                                className="text-white hover:text-gray-200 transition-colors"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* Résumé des moyennes pour l'année sélectionnée */}
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-6 border-b">
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                              <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600 mb-1">
                                  {(() => {
                                    const generalScores = selectedArchive.riderQualityNotes
                                      .map(rider => rider.generalPerformanceScore);
                                    return generalScores.length > 0 
                                      ? Math.round((generalScores.reduce((sum, score) => sum + score, 0) / generalScores.length) * 10) / 10
                                      : 0;
                                  })()}
                                </div>
                                <div className="text-sm font-medium text-gray-700">MOY Générale</div>
                              </div>
                              <div className="text-center">
                                <div className="text-3xl font-bold text-green-600 mb-1">
                                  {(() => {
                                    const mountainScores = selectedArchive.riderQualityNotes
                                      .map(rider => rider.charClimbing);
                                    return mountainScores.length > 0 
                                      ? Math.round((mountainScores.reduce((sum, score) => sum + score, 0) / mountainScores.length) * 10) / 10
                                      : 0;
                                  })()}
                                </div>
                                <div className="text-sm font-medium text-gray-700">MON Moyenne</div>
                              </div>
                              <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-600 mb-1">
                                  {(() => {
                                    const sprintScores = selectedArchive.riderQualityNotes
                                      .map(rider => rider.charSprint);
                                    return sprintScores.length > 0 
                                      ? Math.round((sprintScores.reduce((sum, score) => sum + score, 0) / sprintScores.length) * 10) / 10
                                      : 0;
                                  })()}
                                </div>
                                <div className="text-sm font-medium text-gray-700">SPR Moyenne</div>
                              </div>
                              <div className="text-center">
                                <div className="text-3xl font-bold text-purple-600 mb-1">
                                  {(() => {
                                    const puncherScores = selectedArchive.riderQualityNotes
                                      .map(rider => rider.charPuncher);
                                    return puncherScores.length > 0 
                                      ? Math.round((puncherScores.reduce((sum, score) => sum + score, 0) / puncherScores.length) * 10) / 10
                                      : 0;
                                  })()}
                                </div>
                                <div className="text-sm font-medium text-gray-700">PUN Moyenne</div>
                              </div>
                              <div className="text-center">
                                <div className="text-3xl font-bold text-indigo-600 mb-1">
                                  {(() => {
                                    const rouleurScores = selectedArchive.riderQualityNotes
                                      .map(rider => rider.charRouleur);
                                    return rouleurScores.length > 0 
                                      ? Math.round((rouleurScores.reduce((sum, score) => sum + score, 0) / rouleurScores.length) * 10) / 10
                                      : 0;
                                  })()}
                                </div>
                                <div className="text-sm font-medium text-gray-700">ROU Moyenne</div>
                              </div>
                              <div className="text-center">
                                <div className="text-3xl font-bold text-orange-600 mb-1">
                                  {(() => {
                                    const resistanceScores = selectedArchive.riderQualityNotes
                                      .map(rider => rider.fatigueResistanceScore);
                                    return resistanceScores.length > 0 
                                      ? Math.round((resistanceScores.reduce((sum, score) => sum + score, 0) / resistanceScores.length) * 10) / 10
                                      : 0;
                                  })()}
                                </div>
                                <div className="text-sm font-medium text-gray-700">RES Moyenne</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="overflow-x-auto">
                            {(() => {
                              // Fonction de tri
                              const handleSort = (field: string) => {
                                if (sortField === field) {
                                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setSortField(field);
                                  setSortDirection('asc');
                                }
                              };

                              return (
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => handleSort('lastName')}
                                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                    >
                                      <span>Coureur</span>
                                      <div className="flex flex-col">
                                        <svg className={`w-3 h-3 ${sortField === 'lastName' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                        <svg className={`w-3 h-3 ${sortField === 'lastName' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                                        </svg>
                                      </div>
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => handleSort('age')}
                                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                    >
                                      <span>Âge</span>
                                      <div className="flex flex-col">
                                        <svg className={`w-3 h-3 ${sortField === 'age' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                        <svg className={`w-3 h-3 ${sortField === 'age' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                                        </svg>
                                      </div>
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => handleSort('general')}
                                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                    >
                                      <span>MOY</span>
                                      <div className="flex flex-col">
                                        <svg className={`w-3 h-3 ${sortField === 'general' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                        <svg className={`w-3 h-3 ${sortField === 'general' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                                        </svg>
                                      </div>
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => handleSort('sprint')}
                                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                    >
                                      <span>SPR</span>
                                      <div className="flex flex-col">
                                        <svg className={`w-3 h-3 ${sortField === 'sprint' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                        <svg className={`w-3 h-3 ${sortField === 'sprint' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                                        </svg>
                                      </div>
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => handleSort('climbing')}
                                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                    >
                                      <span>MON</span>
                                      <div className="flex flex-col">
                                        <svg className={`w-3 h-3 ${sortField === 'climbing' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                        <svg className={`w-3 h-3 ${sortField === 'climbing' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                                        </svg>
                                      </div>
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => handleSort('puncher')}
                                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                    >
                                      <span>PUN</span>
                                      <div className="flex flex-col">
                                        <svg className={`w-3 h-3 ${sortField === 'puncher' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                        <svg className={`w-3 h-3 ${sortField === 'puncher' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                                        </svg>
                                      </div>
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => handleSort('rouleur')}
                                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                    >
                                      <span>ROU</span>
                                      <div className="flex flex-col">
                                        <svg className={`w-3 h-3 ${sortField === 'rouleur' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                        <svg className={`w-3 h-3 ${sortField === 'rouleur' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                                        </svg>
                                      </div>
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => handleSort('resistance')}
                                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                    >
                                      <span>RES</span>
                                      <div className="flex flex-col">
                                        <svg className={`w-3 h-3 ${sortField === 'resistance' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                        <svg className={`w-3 h-3 ${sortField === 'resistance' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                                        </svg>
                                      </div>
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {(() => {

                                  // Fonction pour obtenir la valeur de tri
                                  const getRiderArchiveInfo = (riderNote: RiderQualityArchive) => {
                                    const live = riders.find(r => r.id === riderNote.riderId);
                                    return {
                                      firstName: riderNote.firstName || live?.firstName || '',
                                      lastName: riderNote.lastName || live?.lastName || '',
                                      birthDate: riderNote.birthDate || live?.birthDate,
                                      sex: riderNote.sex ?? live?.sex,
                                    };
                                  };

                                  const getSortValue = (rider: RiderQualityArchive, field: string) => {
                                    const riderInfo = getRiderArchiveInfo(rider);
                                    if (!riderInfo.firstName && !riderInfo.lastName && field !== 'age') return '';
                                    
                                    switch (field) {
                                      case 'firstName':
                                        return riderInfo.firstName.toLowerCase();
                                      case 'lastName':
                                        return riderInfo.lastName.toLowerCase();
                                      case 'age':
                                        return riderInfo.birthDate 
                                          ? selectedYear - new Date(riderInfo.birthDate).getFullYear()
                                          : 0;
                                      case 'general':
                                        return rider.generalPerformanceScore;
                                      case 'sprint':
                                        return rider.charSprint;
                                      case 'climbing':
                                        return rider.charClimbing;
                                      case 'puncher':
                                        return rider.charPuncher;
                                      case 'rouleur':
                                        return rider.charRouleur;
                                      case 'resistance':
                                        return rider.fatigueResistanceScore;
                                      default:
                                        return '';
                                    }
                                  };

                                  // Trier les coureurs
                                  const sortedRiders = [...selectedArchive.riderQualityNotes].sort((a, b) => {
                                    const aValue = getSortValue(a, sortField);
                                    const bValue = getSortValue(b, sortField);
                                    
                                    if (typeof aValue === 'string' && typeof bValue === 'string') {
                                      return sortDirection === 'asc' 
                                        ? aValue.localeCompare(bValue)
                                        : bValue.localeCompare(aValue);
                                    } else {
                                      return sortDirection === 'asc' 
                                        ? (aValue as number) - (bValue as number)
                                        : (bValue as number) - (aValue as number);
                                    }
                                  });

                                  return sortedRiders.map((rider, index) => {
                                    const archiveInfo = getRiderArchiveInfo(rider);
                                    const riderName = archiveInfo.firstName || archiveInfo.lastName
                                      ? `${archiveInfo.firstName} ${archiveInfo.lastName}`.trim()
                                      : `Coureur #${index + 1}`;
                                    const riderSex = archiveInfo.sex;
                                    
                                    const riderAge = archiveInfo.birthDate 
                                      ? selectedYear - new Date(archiveInfo.birthDate).getFullYear()
                                      : 0;
                                  
                                  // Fonction pour déterminer la couleur du score
                                  const getScoreColor = (score: number) => {
                                    if (score >= 80) return 'text-green-600';
                                    if (score >= 60) return 'text-blue-600';
                                    if (score >= 40) return 'text-yellow-600';
                                    return 'text-red-600';
                                  };
                                  
                                  return (
                                    <tr key={rider.riderId} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                            riderSex === Sex.FEMALE ? 'bg-pink-100' : 'bg-blue-100'
                                          }`}>
                                            <span className={`font-semibold text-sm ${
                                              riderSex === Sex.FEMALE ? 'text-pink-600' : 'text-blue-600'
                                            }`}>
                                              {index + 1}
                                            </span>
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium text-gray-900">{riderName}</div>
                                            <div className="text-sm text-gray-500">
                                              {riderSex === Sex.FEMALE ? 'Féminine' : 'Masculine'} • {riderAge} ans
                                              {rider.isRemovedFromRoster && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                  Retirée
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{riderAge} ans</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-lg font-bold ${getScoreColor(rider.generalPerformanceScore)}`}>
                                          {rider.generalPerformanceScore}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-lg font-bold ${getScoreColor(rider.charSprint)}`}>
                                          {rider.charSprint}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-lg font-bold ${getScoreColor(rider.charClimbing)}`}>
                                          {rider.charClimbing}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-lg font-bold ${getScoreColor(rider.charPuncher)}`}>
                                          {rider.charPuncher}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-lg font-bold ${getScoreColor(rider.charRouleur)}`}>
                                          {rider.charRouleur}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-lg font-bold ${getScoreColor(rider.fatigueResistanceScore)}`}>
                                          {rider.fatigueResistanceScore}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex space-x-2">
                                          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                          </button>
                                          <button className="p-2 text-gray-400 hover:text-yellow-600 transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                    });
                                  })()}
                                  </tbody>
                                </table>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}
                      </div>
                    )}


                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </SectionWrapper>
    </>
  );
};

// Composant pour la sous-section Analyse de Puissance avec sous-onglets
type PowerAnalysisSubTab = 'powers' | 'durability';

interface PowerAnalysisSubSectionProps {
  riders: Rider[];
  scoutingProfiles?: ScoutingProfile[];
}

const PowerAnalysisSubSection: React.FC<PowerAnalysisSubSectionProps> = ({
  riders,
  scoutingProfiles = [],
}) => {
  const [subTab, setSubTab] = useState<PowerAnalysisSubTab>('powers');
  const [roleFilter, setRoleFilter] = useState<'both' | 'team1' | 'reserve'>('both');

  const currentSeason = getCurrentSeasonYear();

  const filteredRidersByRole = useMemo(() => {
    if (roleFilter === 'both') return riders;
    return riders.filter(
      r => (r.rosterRole ?? 'principal') === (roleFilter === 'team1' ? 'principal' : 'reserve')
    );
  }, [riders, roleFilter]);

  const winnerRiderIds = useMemo(() => {
    const ids = new Set<string>();
    filteredRidersByRole.forEach(r => {
      if (countSeasonWins(r, currentSeason) > 0) ids.add(r.id);
    });
    return ids;
  }, [filteredRidersByRole, currentSeason]);


  return (
    <div className="space-y-6">
      {/* Navigation des sous-onglets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
        <nav className="flex space-x-1">
          <button
            onClick={() => setSubTab('powers')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              subTab === 'powers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChartBarIcon className="w-4 h-4 inline mr-2" />
            Analyse des Puissances
          </button>
          <button
            onClick={() => setSubTab('durability')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              subTab === 'durability'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 Indicateurs de Durabilité
          </button>
        </nav>
        {/* Filtre Équipe 1 / Réserve */}
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Effectif :</span>
          <div className="flex rounded-md overflow-hidden border border-gray-300">
            {(['both', 'team1', 'reserve'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRoleFilter(value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  roleFilter === value
                    ? 'bg-slate-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {value === 'both' ? 'Tous' : value === 'team1' ? 'Équipe 1' : 'Réserve'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu du sous-onglet actif */}
      <p className="text-sm text-gray-600 px-1">
        Saison <strong>{currentSeason}</strong> · effectif actuel uniquement (historique complet dans{' '}
        <strong>Archives</strong>).
      </p>

      {subTab === 'powers' && (
        <PowerAnalysisTable
          riders={filteredRidersByRole}
          scoutingProfiles={scoutingProfiles}
          title={`Analyse des Puissances — Saison ${currentSeason}`}
          season={currentSeason}
          winnerRiderIds={winnerRiderIds}
          defaultIncludeScouts={false}
          scopeLabel={`Saison ${currentSeason} · effectif actuel`}
        />
      )}

      {subTab === 'durability' && (
        <DurabilityAnalysisTable
          riders={filteredRidersByRole}
          scoutingProfiles={scoutingProfiles}
          title={`Pertes sous fatigue — Saison ${currentSeason}`}
          subtitle="Effectif de la saison en cours — repères calculés sur cet effectif."
          season={currentSeason}
          winnerRiderIds={winnerRiderIds}
          showBenchmarkPanel
          defaultIncludeScouts={false}
          scopeLabel={`Saison ${currentSeason} · effectif actuel`}
        />
      )}
    </div>
  );
};

export default PerformancePoleSection;
