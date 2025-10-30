import React, { useMemo, useState } from 'react';
import { AppState, Rider, Sex, RaceEvent, EventType, PerformanceArchive, GroupAverageArchive, RiderQualityArchive, StaffQualityArchive, TeamMetricsArchive, User, AppSection, PermissionLevel, RiderQualitativeProfile } from '../types';
import { generatePerformanceArchive } from '../utils/performanceArchiveUtils';
import SectionWrapper from '../components/SectionWrapper';
import UsersIcon from '../components/icons/UsersIcon';
import TrophyIcon from '../components/icons/TrophyIcon';
import StarIcon from '../components/icons/StarIcon';
import CakeIcon from '../components/icons/CakeIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import { getAgeCategory } from '../utils/ageUtils';
import { PowerAnalysisTable } from '../components';
import PerformanceProjectSynergyAnalyzer from '../components/PerformanceProjectSynergyAnalyzer';
import WorkGroupManager from '../components/WorkGroupManager';
import PerformanceOverviewEnhanced from '../components/PerformanceOverviewEnhanced';
import PerformanceProjectDetails from '../components/PerformanceProjectDetails';

interface PerformancePoleSectionProps {
  appState: AppState;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  currentUser?: User;
}

type PerformanceTab = 'overview' | 'powerAnalysis' | 'debriefings' | 'archives' | 'performanceProjects';
type PerformanceViewMode = 'overview' | 'synergy' | 'workgroups' | 'details';

const PerformancePoleSection: React.FC<PerformancePoleSectionProps> = ({ appState, effectivePermissions, currentUser }) => {
  const [activeTab, setActiveTab] = useState<PerformanceTab>('overview');
  const [selectedYear, setSelectedYear] = useState<number | null>(2025); // Par défaut 2025
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [performanceViewMode, setPerformanceViewMode] = useState<PerformanceViewMode>('overview');
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
      
      // Moyennes de puissance par catégorie
      const powerAverages = {
        cp: 0,
        power20min: 0,
        power12min: 0,
        power5min: 0,
        power1min: 0,
        power30s: 0
      };
      
      if (categoryRiders.length > 0) {
        const ridersWithPower = categoryRiders.filter(r => r.powerProfileFresh);
        if (ridersWithPower.length > 0) {
          powerAverages.cp = Math.round(
            ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.criticalPower || 0), 0) / ridersWithPower.length
          );
          powerAverages.power20min = Math.round(
            ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power20min || 0), 0) / ridersWithPower.length
          );
          powerAverages.power12min = Math.round(
            ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power12min || 0), 0) / ridersWithPower.length
          );
          powerAverages.power5min = Math.round(
            ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power5min || 0), 0) / ridersWithPower.length
          );
          powerAverages.power1min = Math.round(
            ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power1min || 0), 0) / ridersWithPower.length
          );
          powerAverages.power30s = Math.round(
            ridersWithPower.reduce((sum, r) => sum + (r.powerProfileFresh?.power30s || 0), 0) / ridersWithPower.length
          );
        }
      }
      
      return {
        category,
        count: categoryRiders.length,
        ageStats: categoryAgeStats,
        powerAverages
      };
    });

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

  return (
    <>
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

        {/* Répartition par âge - Vue stratégique améliorée */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <TrophyIcon className="w-6 h-6 text-blue-600 mr-3" />
            Répartition Stratégique par Catégorie
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategicMetrics.ageDistribution.map(({ category, count, ageStats, powerAverages }) => (
              <div key={category} className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{count}</div>
                  <div className="text-lg font-semibold text-gray-800">{category}</div>
                  <div className="text-sm text-gray-600">
                    {strategicMetrics.totalRiders > 0 
                      ? Math.round((count / strategicMetrics.totalRiders) * 100) 
                      : 0}% de l'effectif
                  </div>
                </div>
                
                {count > 0 && powerAverages.cp > 0 && (
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm font-medium text-gray-600 mb-2">Moyennes Puissance</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">CP:</span>
                        <span className="font-semibold ml-1">{powerAverages.cp}W</span>
                      </div>
                      <div>
                        <span className="text-gray-500">20min:</span>
                        <span className="font-semibold ml-1">{powerAverages.power20min}W</span>
                      </div>
                      <div>
                        <span className="text-gray-500">12min:</span>
                        <span className="font-semibold ml-1">{powerAverages.power12min}W</span>
                      </div>
                      <div>
                        <span className="text-gray-500">5min:</span>
                        <span className="font-semibold ml-1">{powerAverages.power5min}W</span>
                      </div>
                      <div>
                        <span className="text-gray-500">1min:</span>
                        <span className="font-semibold ml-1">{powerAverages.power1min}W</span>
                      </div>
                      <div>
                        <span className="text-gray-500">30s:</span>
                        <span className="font-semibold ml-1">{powerAverages.power30s}W</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>


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
              Consultez les notes de qualité d'effectifs et les moyennes du groupe pour la saison 2025. Les archives des années précédentes apparaîtront automatiquement à la fin de chaque saison.
            </p>
            

            {/* Affichage des archives */}
            <div className="space-y-6">
              {(() => {
                // Utiliser les archives existantes ou générer uniquement pour 2025
                const existingArchives = appState.performanceArchives || [];
                
                // Générer uniquement l'archive pour 2025
                const archives: PerformanceArchive[] = existingArchives.length > 0 
                  ? existingArchives.filter(archive => archive.season === 2025)
                  : (() => {
                      const archive2025 = generatePerformanceArchive(appState, 2025);
                      return archive2025.groupAverages.totalRiders > 0 || 
                             archive2025.teamMetrics.totalEvents > 0 ||
                             archive2025.riderQualityNotes.length > 0 ||
                             archive2025.staffQualityNotes.length > 0
                        ? [archive2025] : [];
                    })();

                const filteredArchives = selectedYear 
                  ? archives.filter(archive => archive.season === selectedYear)
                  : archives;

                if (filteredArchives.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Aucune donnée disponible pour 2025</p>
                      <p className="text-sm">Les archives apparaîtront ici une fois que vous aurez des coureurs et des événements enregistrés.</p>
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

                    {/* Détails des notes de qualité pour l'année sélectionnée */}
                    {selectedYear && (() => {
                      const selectedArchive = archives.find(a => a.season === selectedYear);
                      if (!selectedArchive || selectedArchive.riderQualityNotes.length === 0) {
                        return null;
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
                                  const getSortValue = (rider: RiderQualityArchive, field: string) => {
                                    const riderInfo = riders.find(r => r.id === rider.riderId);
                                    if (!riderInfo) return '';
                                    
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
                                    // Récupérer les informations du coureur
                                    const riderInfo = riders.find(r => r.id === rider.riderId);
                                    const riderName = riderInfo ? `${riderInfo.firstName} ${riderInfo.lastName}` : `Coureur #${index + 1}`;
                                    const riderSex = riderInfo?.sex;
                                    
                                    // Calculer l'âge du coureur figé à l'année de l'archive
                                    const riderAge = riderInfo?.birthDate 
                                      ? selectedYear - new Date(riderInfo.birthDate).getFullYear()
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
  scoutingProfiles?: any[];
}

const PowerAnalysisSubSection: React.FC<PowerAnalysisSubSectionProps> = ({ riders, scoutingProfiles }) => {
  const [subTab, setSubTab] = useState<PowerAnalysisSubTab>('powers');
  
  // Configuration des durées de puissance
  const powerDurations = [
    { key: '1s', label: '1s', field: 'power1s' },
    { key: '5s', label: '5s', field: 'power5s' },
    { key: '30s', label: '30s', field: 'power30s' },
    { key: '1min', label: '1min', field: 'power1min' },
    { key: '3min', label: '3min', field: 'power3min' },
    { key: '5min', label: '5min', field: 'power5min' },
    { key: '12min', label: '12min', field: 'power12min' },
    { key: '20min', label: '20min', field: 'power20min' },
    { key: 'cp', label: 'CP', field: 'criticalPower' }
  ];
  
  // États pour les filtres de la vue durabilité
  const [durabilityGenderFilter, setDurabilityGenderFilter] = useState<'all' | Sex>('all');
  const [durabilityCategoryFilter, setDurabilityCategoryFilter] = useState<'all' | string>('all');
  const [durabilityDurationFilter, setDurabilityDurationFilter] = useState<string[]>(powerDurations.map(d => d.key)); // Toutes les durées par défaut
  const [durabilityKjFilter, setDurabilityKjFilter] = useState<'all' | '15kj' | '30kj' | '45kj'>('all');
  
  // États pour le tri et la mise en évidence des priorités
  const [durabilitySortColumn, setDurabilitySortColumn] = useState<string>('');
  const [durabilitySortDirection, setDurabilitySortDirection] = useState<'asc' | 'desc'>('asc');
  const [showPriorities, setShowPriorities] = useState<boolean>(true);

  // Calcul des indicateurs de durabilité (Δ% pour 15/30/45 kJ/kg en W/kg)
  const getDropPercentages = (rider: Rider | any): Record<string, { d15?: number; d30?: number; d45?: number }> => {
    const results: Record<string, { d15?: number; d30?: number; d45?: number }> = {};
    
    // Uniquement pour les riders - ce filtre a déjà été fait en amont
    if (!rider) return results;

    const weight = rider.weightKg || 0;
    if (!weight || weight <= 0) return results;

    powerDurations.forEach(duration => {
      const fresh = (rider.powerProfileFresh as any)?.[duration.field];
      const k15 = (rider.powerProfile15KJ as any)?.[duration.field];
      const k30 = (rider.powerProfile30KJ as any)?.[duration.field];
      const k45 = (rider.powerProfile45KJ as any)?.[duration.field];

      if (!fresh || fresh <= 0) {
        results[duration.key] = {};
        return;
      }

      const freshWkg = fresh / weight;
      const calc = (v?: number) => (v && v > 0 ? ((v / weight - freshWkg) / freshWkg) * 100 : undefined);

      results[duration.key] = {
        d15: calc(k15),
        d30: calc(k30),
        d45: calc(k45)
      };
    });

    return results;
  };

  const getColorClass = (drop?: number): string => {
    if (drop === undefined || drop >= -2) return 'text-gray-800';
    const absDrop = Math.abs(drop);
    if (absDrop <= 10) return 'text-yellow-600 font-semibold';
    if (absDrop <= 20) return 'text-orange-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  // Fonction pour obtenir la valeur à trier
  const getDurabilityValue = (item: Rider | any, durationKey: string, kjLevel: 'd15' | 'd30' | 'd45'): number => {
    const durability = getDropPercentages(item);
    const drops = durability[durationKey] || {};
    const value = drops[kjLevel];
    return value !== undefined ? value : -999; // -999 pour mettre les valeurs manquantes en fin
  };

  // Fonction de tri
  const handleDurabilitySort = (durationKey: string) => {
    if (durabilitySortColumn === durationKey) {
      setDurabilitySortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setDurabilitySortColumn(durationKey);
      setDurabilitySortDirection('asc');
    }
  };

  // Fonction pour déterminer si une cellule est prioritaire (régression forte)
  const isPriorityCell = (drop?: number): boolean => {
    if (drop === undefined) return false;
    return drop < -20; // Régression de plus de 20%
  };

  // Filtrage et tri des données pour la vue durabilité
  const filteredDurabilityData = useMemo(() => {
    // Exclure les scouts - seulement les riders de l'équipe
    const allData = [...riders];
    let filtered = allData.filter(item => {
      // Filtre par sexe
      if (durabilityGenderFilter !== 'all' && item.sex !== durabilityGenderFilter) return false;
      
      // Filtre par catégorie d'âge
      if (durabilityCategoryFilter !== 'all') {
        const { category } = getAgeCategory(item.birthDate);
        if (category !== durabilityCategoryFilter) return false;
      }
      
      return true;
    });

    // Tri si une colonne est sélectionnée
    if (durabilitySortColumn && durabilityKjFilter !== 'all') {
      const kjLevel = durabilityKjFilter === '15kj' ? 'd15' : durabilityKjFilter === '30kj' ? 'd30' : 'd45';
      filtered.sort((a, b) => {
        const aValue = getDurabilityValue(a, durabilitySortColumn, kjLevel as 'd15' | 'd30' | 'd45');
        const bValue = getDurabilityValue(b, durabilitySortColumn, kjLevel as 'd15' | 'd30' | 'd45');
        
        if (durabilitySortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

    return filtered;
  }, [riders, durabilityGenderFilter, durabilityCategoryFilter, durabilitySortColumn, durabilitySortDirection, durabilityKjFilter]);

  // Durées affichées selon le filtre
  const visibleDurations = powerDurations.filter(d => durabilityDurationFilter.includes(d.key));

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
      </div>

      {/* Contenu du sous-onglet actif */}
      {subTab === 'powers' && (
        <PowerAnalysisTable riders={riders} scoutingProfiles={scoutingProfiles} />
      )}

      {subTab === 'durability' && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
            <h2 className="text-xl font-bold mb-2">Indicateurs de Durabilité</h2>
            <p className="text-sm text-blue-100">
              Analyse des régressions (%) de puissance entre le profil frais et après 15, 30 et 45 kJ/kg en W/kg
            </p>
          </div>

          {/* Barre de filtres */}
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtre par sexe */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Sexe:</label>
                <select
                  value={durabilityGenderFilter}
                  onChange={(e) => setDurabilityGenderFilter(e.target.value as 'all' | Sex)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value={Sex.MALE}>Hommes</option>
                  <option value={Sex.FEMALE}>Femmes</option>
                </select>
              </div>

              {/* Filtre par catégorie */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Catégorie:</label>
                <select
                  value={durabilityCategoryFilter}
                  onChange={(e) => setDurabilityCategoryFilter(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes</option>
                  <option value="U15">U15</option>
                  <option value="U17">U17</option>
                  <option value="U19">U19</option>
                  <option value="U23">U23</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>

              {/* Filtre par niveau kJ/kg */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Afficher:</label>
                <select
                  value={durabilityKjFilter}
                  onChange={(e) => setDurabilityKjFilter(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous (15/30/45kJ)</option>
                  <option value="15kj">15 kJ/kg uniquement</option>
                  <option value="30kj">30 kJ/kg uniquement</option>
                  <option value="45kj">45 kJ/kg uniquement</option>
                </select>
              </div>

              {/* Durées sélectionnées */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Durées:</label>
                <select
                  value={durabilityDurationFilter.length === powerDurations.length ? 'all' : durabilityDurationFilter.join(',')}
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setDurabilityDurationFilter(powerDurations.map(d => d.key));
                    } else {
                      setDurabilityDurationFilter([e.target.value]);
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={powerDurations.map(d => d.key).join(',')}>Toutes</option>
                  {powerDurations.map(d => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ligne supplémentaire avec compteur et option de priorité */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredDurabilityData.length} athlète{filteredDurabilityData.length !== 1 ? 's' : ''} affiché{filteredDurabilityData.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Mettre en évidence les priorités:</label>
                <button
                  onClick={() => setShowPriorities(!showPriorities)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    showPriorities 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  }`}
                >
                  {showPriorities ? '✓ Activé' : '✗ Désactivé'}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider z-10">
                    Coureur
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Profil
                  </th>
                  {visibleDurations.map(duration => {
                    const colSpan = durabilityKjFilter === 'all' ? 3 : 1;
                    const isSortable = durabilityKjFilter !== 'all'; // Triable uniquement si un kJ est sélectionné
                    const isSorted = durabilitySortColumn === duration.key;
                    return (
                      <th 
                        key={duration.key} 
                        colSpan={colSpan} 
                        className={`px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-l border-gray-300 ${
                          isSortable ? 'cursor-pointer hover:bg-gray-100' : ''
                        } ${isSorted ? 'bg-blue-100' : ''}`}
                        onClick={() => isSortable && handleDurabilitySort(duration.key)}
                        title={isSortable ? 'Cliquer pour trier par cette colonne' : ''}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>{duration.label}</span>
                          {isSorted && (
                            <span className="text-blue-600 font-bold">
                              {durabilitySortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 px-4 py-2 text-left text-xs font-medium text-gray-500 z-10"></th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500"></th>
                  {visibleDurations.map(duration => {
                    if (durabilityKjFilter === 'all') {
                      return (
                        <React.Fragment key={duration.key}>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-300">
                            Δ% 15kJ
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                            Δ% 30kJ
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                            Δ% 45kJ
                          </th>
                        </React.Fragment>
                      );
                    } else {
                      return (
                        <th key={duration.key} className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-300">
                          Δ% {durabilityKjFilter}
                        </th>
                      );
                    }
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDurabilityData.map((item, index) => {
                  const durability = getDropPercentages(item);
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 bg-white px-4 py-3 whitespace-nowrap z-10">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            {item.photoUrl ? (
                              <img className="h-8 w-8 rounded-full" src={item.photoUrl} alt={`${item.firstName} ${item.lastName}`} />
                            ) : (
                              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-300">
                                <span className="text-xs font-medium text-gray-600">
                                  {`${item.firstName}`.charAt(0)}{`${item.lastName}`.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {item.firstName} {item.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getAgeCategory(item.birthDate).category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.qualitativeProfile === RiderQualitativeProfile.SPRINTEUR ? 'bg-yellow-100 text-yellow-800' :
                            item.qualitativeProfile === RiderQualitativeProfile.GRIMPEUR ? 'bg-green-100 text-green-800' :
                            item.qualitativeProfile === RiderQualitativeProfile.PUNCHEUR ? 'bg-blue-100 text-blue-800' :
                            item.qualitativeProfile === RiderQualitativeProfile.ROULEUR ? 'bg-purple-100 text-purple-800' :
                            item.qualitativeProfile === RiderQualitativeProfile.COMPLET ? 'bg-indigo-100 text-indigo-800' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                          {item.qualitativeProfile || 'N/A'}
                      </span>
                    </td>
                    {visibleDurations.map(duration => {
                      const drops = durability[duration.key] || {};
                      
                      if (durabilityKjFilter === 'all') {
                        // Afficher les 3 colonnes (15, 30, 45 kJ)
                        const isPriority15 = showPriorities && isPriorityCell(drops.d15);
                        const isPriority30 = showPriorities && isPriorityCell(drops.d30);
                        const isPriority45 = showPriorities && isPriorityCell(drops.d45);
                        
                        return (
                          <React.Fragment key={duration.key}>
                            <td className={`px-2 py-3 whitespace-nowrap text-sm text-center border-l border-gray-200 ${isPriority15 ? 'bg-red-100 font-bold' : ''}`}>
                              <span className={getColorClass(drops.d15)}>
                                {drops.d15 !== undefined ? `${drops.d15.toFixed(0)}%` : '-'}
                              </span>
                            </td>
                            <td className={`px-2 py-3 whitespace-nowrap text-sm text-center ${isPriority30 ? 'bg-red-100 font-bold' : ''}`}>
                              <span className={getColorClass(drops.d30)}>
                                {drops.d30 !== undefined ? `${drops.d30.toFixed(0)}%` : '-'}
                              </span>
                            </td>
                            <td className={`px-2 py-3 whitespace-nowrap text-sm text-center ${isPriority45 ? 'bg-red-100 font-bold' : ''}`}>
                              <span className={getColorClass(drops.d45)}>
                                {drops.d45 !== undefined ? `${drops.d45.toFixed(0)}%` : '-'}
                              </span>
                            </td>
                          </React.Fragment>
                        );
                      } else {
                        // Afficher uniquement la colonne filtrée (15, 30 ou 45 kJ)
                        let dropValue: number | undefined;
                        if (durabilityKjFilter === '15kj') dropValue = drops.d15;
                        else if (durabilityKjFilter === '30kj') dropValue = drops.d30;
                        else if (durabilityKjFilter === '45kj') dropValue = drops.d45;
                        
                        const isPriority = showPriorities && isPriorityCell(dropValue);
                        
                        return (
                          <td key={duration.key} className={`px-2 py-3 whitespace-nowrap text-sm text-center border-l border-gray-200 ${isPriority ? 'bg-red-100 font-bold' : ''}`}>
                            <span className={getColorClass(dropValue)}>
                              {dropValue !== undefined ? `${dropValue.toFixed(0)}%` : '-'}
                            </span>
                          </td>
                        );
                      }
                    })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 p-4 border-t border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-gray-600">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                  <span>Δ% ≥ -10%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-orange-400 rounded"></div>
                  <span>-10% &gt; Δ% &gt; -20%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-400 rounded"></div>
                  <span>Δ% ≤ -20%</span>
                </div>
                {showPriorities && (
                  <div className="flex items-center space-x-1 ml-2">
                    <div className="w-6 h-6 bg-red-100 rounded border-2 border-red-500"></div>
                    <span className="font-semibold">Priorité (Δ% &lt; -20%)</span>
                  </div>
                )}
              </div>
              <div>
                Calculé en W/kg pour chaque durée de puissance
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformancePoleSection;
