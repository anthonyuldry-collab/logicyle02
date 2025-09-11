import React, { useState, useEffect, useMemo } from 'react';
import { Rider, User, StaffMember, Team, RaceEvent, RiderEventSelection, AppState, UserRole, StaffRole, StaffStatus, FormeStatus, MoralStatus, HealthCondition, TeamRole } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from '../components/ActionButton';

interface AdminDashboardSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  appState: AppState;
  navigateTo?: (section: AppSection, eventId?: string) => void;
}

const AdminDashboardSection: React.FC<AdminDashboardSectionProps> = ({ 
  riders, 
  staff, 
  currentUser, 
  raceEvents, 
  riderEventSelections, 
  appState,
  navigateTo
}) => {
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(true);

  // Calculs des métriques d'équipe
  const teamMetrics = useMemo(() => {
    const activeRiders = riders.filter(r => r.healthCondition === HealthCondition.PRET_A_COURIR);
    const activeStaff = staff.filter(s => s.status === StaffStatus.VACATAIRE || s.status === StaffStatus.CONTRAT);
    
    // Statistiques de forme des coureurs
    const formeStats = {
      excellent: riders.filter(r => r.forme === FormeStatus.EXCELLENT).length,
      bon: riders.filter(r => r.forme === FormeStatus.BON).length,
      moyen: riders.filter(r => r.forme === FormeStatus.MOYEN).length,
      mauvais: riders.filter(r => r.forme === FormeStatus.MAUVAIS).length
    };

    // Statistiques de moral des coureurs
    const moralStats = {
      excellent: riders.filter(r => r.moral === MoralStatus.EXCELLENT).length,
      bon: riders.filter(r => r.moral === MoralStatus.BON).length,
      moyen: riders.filter(r => r.moral === MoralStatus.MOYEN).length,
      mauvais: riders.filter(r => r.moral === MoralStatus.MAUVAIS).length
    };

    // Événements à venir (30 prochains jours)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingEvents = raceEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= now && eventDate <= thirtyDaysFromNow;
    });

    // Coureurs avec des performances récentes
    const ridersWithRecentPerformance = riders.filter(r => r.generalPerformanceScore > 0);

    // Staff par rôle
    const staffByRole = {
      ds: staff.filter(s => s.role === StaffRole.DS).length,
      entraineur: staff.filter(s => s.role === StaffRole.ENTRAINEUR).length,
      assistant: staff.filter(s => s.role === StaffRole.ASSISTANT).length,
      mecano: staff.filter(s => s.role === StaffRole.MECANO).length,
      autre: staff.filter(s => s.role === StaffRole.AUTRE).length
    };

    return {
      totalRiders: riders.length,
      activeRiders: activeRiders.length,
      totalStaff: staff.length,
      activeStaff: activeStaff.length,
      upcomingEvents: upcomingEvents.length,
      ridersWithPerformance: ridersWithRecentPerformance.length,
      formeStats,
      moralStats,
      staffByRole,
      upcomingEventsList: upcomingEvents
    };
  }, [riders, staff, raceEvents]);

  // Alertes et actions requises
  const alerts = useMemo(() => {
    const alertsList = [];

    // Coureurs sans performance récente
    const ridersWithoutPerformance = riders.filter(r => r.generalPerformanceScore === 0);
    if (ridersWithoutPerformance.length > 0) {
      alertsList.push({
        type: 'warning',
        title: 'Coureurs sans performance',
        message: `${ridersWithoutPerformance.length} coureur(s) n'ont pas de score de performance`,
        action: 'Vérifier les profils de performance',
        section: 'performance'
      });
    }

    // Coureurs en mauvaise forme
    const ridersInBadForm = riders.filter(r => r.forme === FormeStatus.MAUVAIS);
    if (ridersInBadForm.length > 0) {
      alertsList.push({
        type: 'error',
        title: 'Forme préoccupante',
        message: `${ridersInBadForm.length} coureur(s) en mauvaise forme`,
        action: 'Suivi médical recommandé',
        section: 'roster'
      });
    }

    // Coureurs en mauvais moral
    const ridersInBadMoral = riders.filter(r => r.moral === MoralStatus.MAUVAIS);
    if (ridersInBadMoral.length > 0) {
      alertsList.push({
        type: 'error',
        title: 'Moral préoccupant',
        message: `${ridersInBadMoral.length} coureur(s) en mauvais moral`,
        action: 'Entretien individuel recommandé',
        section: 'roster'
      });
    }

    // Événements sans sélections de coureurs
    const eventsWithoutSelections = raceEvents.filter(event => {
      const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);
      return eventSelections.length === 0 && new Date(event.date) > new Date();
    });
    if (eventsWithoutSelections.length > 0) {
      alertsList.push({
        type: 'info',
        title: 'Sélections manquantes',
        message: `${eventsWithoutSelections.length} événement(s) sans sélection de coureurs`,
        action: 'Compléter les sélections',
        section: 'events'
      });
    }

    return alertsList;
  }, [riders, raceEvents, riderEventSelections]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <SectionWrapper title="Tableau de Bord Administrateur">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="Tableau de Bord">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header simple et fonctionnel */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {appState.teams.find(t => t.id === appState.activeTeamId)?.name || 'Équipe'}
              </h1>
              <p className="text-gray-600 mt-1">Vue d'ensemble opérationnelle</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-medium text-gray-900">{teamMetrics.totalRiders + teamMetrics.totalStaff}</div>
              <div className="text-sm text-gray-500">Membres</div>
            </div>
          </div>
        </div>

        {/* Métriques essentielles - Layout visuel moderne */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{teamMetrics.activeRiders}</div>
                <div className="text-blue-100 text-sm">Coureurs actifs</div>
                <div className="text-blue-200 text-xs">{teamMetrics.totalRiders} total</div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚴</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{teamMetrics.activeStaff}</div>
                <div className="text-green-100 text-sm">Staff actif</div>
                <div className="text-green-200 text-xs">{teamMetrics.totalStaff} total</div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">👨‍💼</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{teamMetrics.upcomingEvents}</div>
                <div className="text-purple-100 text-sm">Événements</div>
                <div className="text-purple-200 text-xs">30 prochains jours</div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{teamMetrics.ridersWithPerformance}</div>
                <div className="text-orange-100 text-sm">Performances</div>
                <div className="text-orange-200 text-xs">Avec scores</div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alertes critiques - Affichage visuel */}
        {alerts.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
            <div className="px-4 py-3 border-b border-red-200 bg-red-100">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">⚠️</span>
                </div>
                <h2 className="text-sm font-semibold text-red-900">Actions Requises</h2>
              </div>
            </div>
            <div className="divide-y divide-red-200">
              {alerts.map((alert, index) => (
                <div key={index} className="px-4 py-3 hover:bg-red-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        alert.type === 'error' ? 'bg-red-500' : 
                        alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{alert.title}</span>
                        <span className="text-sm text-gray-600 ml-2">{alert.message}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigateTo?.(alert.section as any)}
                      className="text-xs px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                    >
                      Voir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicateurs visuels - Layout moderne */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Prochaines courses - Card visuelle */}
          {teamMetrics.upcomingEventsList.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-900">Prochaine Course</h3>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📅</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-900">{teamMetrics.upcomingEventsList[0].name}</div>
                <div className="text-sm text-gray-600">{teamMetrics.upcomingEventsList[0].location}</div>
                <div className="text-xs text-blue-700 font-medium">
                  {new Date(teamMetrics.upcomingEventsList[0].date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Performance moyenne - Card visuelle */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-green-900">Performance Moyenne</h3>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-700">
                {teamMetrics.ridersWithPerformance > 0 
                  ? Math.round(riders.reduce((sum, r) => sum + (r.generalPerformanceScore || 0), 0) / teamMetrics.ridersWithPerformance)
                  : 0
                }
              </div>
              <div className="text-sm text-green-600">
                {teamMetrics.ridersWithPerformance} coureurs évalués
              </div>
            </div>
          </div>

          {/* Équipe active - Card visuelle */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-100 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-900">Équipe Active</h3>
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">👥</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-700">
                {teamMetrics.activeRiders + teamMetrics.activeStaff}
              </div>
              <div className="text-sm text-purple-600">
                {teamMetrics.activeRiders} coureurs • {teamMetrics.activeStaff} staff
              </div>
            </div>
          </div>
        </div>


        {/* Navigation rapide - Layout fonctionnel */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Navigation</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button 
                onClick={() => navigateTo?.('roster')}
                className="flex items-center justify-center p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-700">Effectif</span>
              </button>
              <button 
                onClick={() => navigateTo?.('staff')}
                className="flex items-center justify-center p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-700">Staff</span>
              </button>
              <button 
                onClick={() => navigateTo?.('events')}
                className="flex items-center justify-center p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-700">Calendrier</span>
              </button>
              <button 
                onClick={() => navigateTo?.('userManagement')}
                className="flex items-center justify-center p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-700">Gestion</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default AdminDashboardSection;
