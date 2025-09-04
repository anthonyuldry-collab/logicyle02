import React, { useMemo, useState } from 'react';
import { AppState, Rider, Sex, RaceEvent, EventType } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import UsersIcon from '../components/icons/UsersIcon';
import TrophyIcon from '../components/icons/TrophyIcon';
import TrendingUpIcon from '../components/icons/TrendingUpIcon';
import StarIcon from '../components/icons/StarIcon';
import CakeIcon from '../components/icons/CakeIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import { getAgeCategory } from '../utils/ageUtils';
import { PowerAnalysisTable } from '../components';

interface PerformancePoleSectionProps {
  appState: AppState;
}

type PerformanceTab = 'overview' | 'powerAnalysis' | 'debriefings';

const PerformancePoleSection: React.FC<PerformancePoleSectionProps> = ({ appState }) => {
  const [activeTab, setActiveTab] = useState<PerformanceTab>('overview');
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
          <button onClick={() => setActiveTab('debriefings')} className={tabButtonStyle('debriefings')}>
            <TrophyIcon className="w-4 h-4 inline mr-2" />
            Débriefings
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

          {/* Couverture Puissance */}
          <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUpIcon className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Couverture Puissance</p>
                <p className="text-3xl font-bold text-gray-900">{strategicMetrics.powerCoverage}%</p>
                <p className="text-xs text-gray-500">Profils complets</p>
              </div>
            </div>
          </div>

          {/* Moyenne CP */}
          <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <StarIcon className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Puissance Moyenne</p>
                <p className="text-3xl font-bold text-gray-900">{strategicMetrics.averageCP}W</p>
                <p className="text-xs text-gray-500">CP équipe</p>
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

        {/* Groupement par équipe avec âge moyen */}
        {strategicMetrics.teamGroups.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <UsersIcon className="w-6 h-6 text-green-600 mr-3" />
              Groupement par Équipe
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strategicMetrics.teamGroups.map(({ team, riderCount, ageStats }) => (
                <div key={team.id} className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-200">
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-green-600 mb-2">{riderCount}</div>
                    <div className="text-lg font-semibold text-gray-800">{team.name}</div>
                    <div className="text-sm text-gray-600">{team.level}</div>
                  </div>
                  
                  {riderCount > 0 && (
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="text-sm font-medium text-gray-600 mb-2">Âge Moyen de l'Équipe</div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {ageStats.average} ans
                      </div>
                      <div className="text-xs text-gray-500">
                        {ageStats.min}-{ageStats.max} ans
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Indicateurs de performance stratégique */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Indicateurs Stratégiques</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {strategicMetrics.ridersWithPower}
              </div>
              <div className="text-sm text-gray-600">Coureurs avec Profil Puissance</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {strategicMetrics.upcomingEvents}
              </div>
              <div className="text-sm text-gray-600">Événements à Venir</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {strategicMetrics.totalRiders > 0 ? Math.round(strategicMetrics.totalRiders / 3) : 0}
              </div>
              <div className="text-sm text-gray-600">Équipes Potentielles</div>
            </div>
          </div>
        </div>


        </div>
      )}

      {activeTab === 'powerAnalysis' && (
        <div className="space-y-6">
          <PowerAnalysisTable riders={riders} scoutingProfiles={scoutingProfiles} />
        </div>
      )}

      {activeTab === 'debriefings' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Gestion des Débriefings</h3>
            <p className="text-gray-600 mb-6">
              Consultez et gérez tous les debriefings des événements passés pour un suivi optimal des performances.
            </p>
            
            {/* Liste des debriefings */}
            <div className="space-y-4">
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const debriefingsWithEvents = (appState.performanceEntries || [])
                  .map(entry => {
                    const event = raceEvents.find(e => e.id === entry.eventId);
                    if (!event) return null;
                    
                    // Vérifier que l'événement est terminé depuis au moins un jour
                    const eventEndDate = new Date(event.endDate || event.date);
                    eventEndDate.setHours(23, 59, 59, 999);
                    const daysSinceEvent = Math.floor((today.getTime() - eventEndDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // L'événement doit être terminé depuis au moins 1 jour
                    if (daysSinceEvent < 1) return null;
                    
                    return { ...entry, event, daysSinceEvent };
                  })
                  .filter(Boolean)
                  .sort((a, b) => {
                    const dateA = new Date(a.event.endDate || a.event.date);
                    const dateB = new Date(b.event.endDate || b.event.date);
                    return dateB.getTime() - dateA.getTime();
                  });

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

                if (debriefingsWithEvents.length === 0 && eventsAwaitingDebriefing.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <TrophyIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Aucun debriefing disponible</p>
                      <p className="text-sm">Les debriefings apparaîtront ici une fois les événements terminés.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
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

                    {/* Debriefings disponibles */}
                    {debriefingsWithEvents.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Débriefings Disponibles</h4>
                        <div className="space-y-4">
                          {debriefingsWithEvents.map((debriefing, index) => (
                  <div key={debriefing.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">{debriefing.event.name}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(debriefing.event.endDate || debriefing.event.date).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long',
                            year: 'numeric' 
                          })} - {debriefing.event.location}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Débriefé
                        </span>
                        <button
                          onClick={() => window.location.href = `#eventDetail-${debriefing.event.id}`}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Voir l'événement
                        </button>
                      </div>
                    </div>
                    
                    {/* Résumé du debriefing */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {debriefing.generalObjectives && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Objectifs</h5>
                          <p className="text-gray-600 line-clamp-2">{debriefing.generalObjectives}</p>
                        </div>
                      )}
                      {debriefing.resultsSummary && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Résultats</h5>
                          <p className="text-gray-600 line-clamp-2">{debriefing.resultsSummary}</p>
                        </div>
                      )}
                      {debriefing.keyLearnings && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Enseignements</h5>
                          <p className="text-gray-600 line-clamp-2">{debriefing.keyLearnings}</p>
                        </div>
                      )}
                    </div>
                  </div>
                          ))}
                        </div>
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
  );
};

export default PerformancePoleSection;
