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

  // Debug: Vérifier les données reçues
  console.log('🔍 AdminDashboardSection - appState:', appState);
  console.log('🔍 AdminDashboardSection - performanceEntries:', appState.performanceEntries?.length);
  console.log('🔍 AdminDashboardSection - eventTransportLegs:', appState.eventTransportLegs?.length);
  console.log('🔍 AdminDashboardSection - raceEvents:', appState.raceEvents?.length);

  // Calculs des métriques d'équipe
  const teamMetrics = useMemo(() => {
    const activeRiders = riders.filter(r => r.healthCondition === HealthCondition.PRET_A_COURIR);
    const activeStaff = staff.filter(s => s.status === StaffStatus.VACATAIRE || s.status === StaffStatus.SALARIE);
    
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

    // Événements à venir (tous les événements futurs)
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Début de la journée pour éviter les problèmes d'heure
    const upcomingEvents = raceEvents
      .filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0); // Début de la journée pour éviter les problèmes d'heure
        const isUpcoming = eventDate >= now;
        
        
        return isUpcoming;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

    const metrics = {
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
    
    console.log('🔍 AdminDashboardSection - teamMetrics:', metrics);
    return metrics;
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

        {/* Métriques essentielles - Version simplifiée */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{teamMetrics.totalRiders}</div>
                <div className="text-blue-100 text-lg font-medium">Coureurs</div>
              </div>
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-3xl">🚴</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{teamMetrics.totalStaff}</div>
                <div className="text-green-100 text-lg font-medium">Staff</div>
              </div>
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-3xl">👨‍💼</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{teamMetrics.upcomingEvents}</div>
                <div className="text-purple-100 text-lg font-medium">Événements</div>
                <div className="text-purple-200 text-sm">À venir</div>
              </div>
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-3xl">📅</span>
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

        {/* Prochaines courses et Dernier débriefing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prochaines courses */}
          {teamMetrics.upcomingEventsList.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-3">📅</span>
                Prochaines Courses
              </h3>
              <div className="space-y-3">
                {teamMetrics.upcomingEventsList.slice(0, 3).map((event, index) => (
                  <div key={event.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{event.name}</p>
                        <p className="text-sm text-gray-500">{event.location}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(event.date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                        </p>
                      </div>
                      <button
                        onClick={() => navigateTo?.('eventDetail', event.id)}
                        className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                      >
                        Voir
                      </button>
                    </div>
                </div>
                ))}
              </div>
            </div>
          )}

          {/* Dernier débriefing */}
          {appState.performanceEntries && appState.performanceEntries.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-3">📝</span>
                Dernier Débriefing
              </h3>
              {(() => {
                const lastDebriefing = appState.performanceEntries
                  .filter(entry => entry.generalObjectives || entry.resultsSummary || entry.keyLearnings)
                  .sort((a, b) => {
                    const dateA = new Date(a.id.split('_')[1] || 0);
                    const dateB = new Date(b.id.split('_')[1] || 0);
                    return dateB.getTime() - dateA.getTime();
                  })[0];

                if (!lastDebriefing) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">Aucun débriefing disponible</p>
              </div>
                  );
                }

                const event = appState.raceEvents.find(e => e.id === lastDebriefing.eventId);
                return (
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        {event?.name || 'Événement'}
                      </h4>
                      <p className="text-sm text-blue-600">
                        {event?.location && `${event.location} - `}
                        {new Date(event?.date || lastDebriefing.id.split('_')[1]).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </p>
              </div>
                    
                    {lastDebriefing.generalObjectives && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1 text-sm">Objectifs</h5>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-xs">
                          {lastDebriefing.generalObjectives}
                        </p>
              </div>
                    )}
                    
                    {lastDebriefing.resultsSummary && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1 text-sm">Résultats</h5>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-xs">
                          {lastDebriefing.resultsSummary}
                        </p>
            </div>
                    )}
                    
                    {lastDebriefing.keyLearnings && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1 text-sm">Enseignements</h5>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-xs">
                          {lastDebriefing.keyLearnings}
                        </p>
          </div>
                    )}
              </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-3">📝</span>
                Dernier Débriefing
              </h3>
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">Aucun débriefing disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Prochain déplacement */}
        {teamMetrics.upcomingEventsList.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3">🚗</span>
              Prochain Déplacement
            </h3>
            {(() => {
              // Prendre le prochain événement (même s'il est loin dans le temps)
              const nextEvent = teamMetrics.upcomingEventsList[0];
              
              // Chercher les transports associés à cet événement
              const eventTransports = appState.eventTransportLegs?.filter(leg => leg.eventId === nextEvent.id) || [];
              
              // Prendre le transport principal (aller vers l'événement)
              const mainTransport = eventTransports.find(leg => leg.direction === 'ALLER') || eventTransports[0];

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">
                      {nextEvent.name}
                    </h4>
                    <p className="text-sm text-green-600">
                      {nextEvent.location} - {new Date(nextEvent.date).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-green-500 mt-1">
                      {nextEvent.selectedRiderIds.length} coureur{nextEvent.selectedRiderIds.length > 1 ? 's' : ''} sélectionné{nextEvent.selectedRiderIds.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  {mainTransport ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2 text-sm">Transport</h5>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Mode:</span> {mainTransport.mode}
                          </p>
                          {mainTransport.departureLocation && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Départ:</span> {mainTransport.departureLocation}
                            </p>
                          )}
                          {mainTransport.arrivalLocation && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Arrivée:</span> {mainTransport.arrivalLocation}
                            </p>
                          )}
                          {mainTransport.departureTime && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Heure:</span> {mainTransport.departureTime}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-700 mb-2 text-sm">Logistique</h5>
                        <div className="space-y-1">
                          {mainTransport.assignedVehicleId && (() => {
                            const vehicle = appState.vehicles.find(v => v.id === mainTransport.assignedVehicleId);
                            return vehicle ? (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Véhicule:</span> {vehicle.name}
                              </p>
                            ) : null;
                          })()}
                          {mainTransport.driverId && (() => {
                            const driver = [...appState.riders, ...appState.staff].find(p => p.id === mainTransport.driverId);
                            return driver ? (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Conducteur:</span> {driver.firstName} {driver.lastName}
                              </p>
                            ) : null;
                          })()}
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Passagers:</span> {mainTransport.occupants.length} personne{mainTransport.occupants.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-700">
                        <span className="font-medium">Transport non planifié</span> - Les détails de transport ne sont pas encore définis pour cet événement.
                      </p>
                    </div>
                  )}

                  {mainTransport?.details && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1 text-sm">Détails</h5>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-xs">
                        {mainTransport.details}
                      </p>
          </div>
                  )}

                  <div className="flex justify-end">
              <button 
                      onClick={() => navigateTo?.('eventDetail', nextEvent.id)}
                      className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
              >
                      Voir l'événement
              </button>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-3">🚗</span>
              Prochain Déplacement
            </h3>
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">Aucun événement à venir</p>
            </div>
          </div>
        )}

      </div>
    </SectionWrapper>
  );
};

export default AdminDashboardSection;
