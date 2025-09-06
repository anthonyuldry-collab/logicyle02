import React, { useState, useMemo } from 'react';
import { Rider, RaceEvent, RiderEventSelection, SeasonYear, TalentAvailability, User, AppSection, PermissionLevel } from '../types';
import { SEASON_YEAR_COLORS, TALENT_AVAILABILITY_COLORS, RIDER_EVENT_STATUS_COLORS, RIDER_EVENT_PREFERENCE_COLORS } from '../constants';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import CalendarIcon from '../components/icons/CalendarIcon';

interface TalentAvailabilitySectionProps {
  riders: Rider[];
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  currentUser: User;
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
}

// Fonction utilitaire pour déterminer l'année de saison d'un événement
const getEventSeasonYear = (eventDate: string): SeasonYear => {
  const date = new Date(eventDate + "T12:00:00Z");
  const year = date.getFullYear();
  
  // Retourner l'année de saison correspondante
  switch (year) {
    case 2024: return SeasonYear.SEASON_2024;
    case 2025: return SeasonYear.SEASON_2025;
    case 2026: return SeasonYear.SEASON_2026;
    case 2027: return SeasonYear.SEASON_2027;
    case 2028: return SeasonYear.SEASON_2028;
    default: return SeasonYear.SEASON_2025; // Par défaut, saison 2025
  }
};

const TalentAvailabilitySection: React.FC<TalentAvailabilitySectionProps> = ({
  riders,
  raceEvents,
  riderEventSelections,
  currentUser,
  effectivePermissions
}) => {
  const [selectedSeasonYear, setSelectedSeasonYear] = useState<SeasonYear | 'ALL'>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'byEvent' | 'byRider'>('byEvent');

  // Vérification des permissions - seulement pour les directeurs sportifs et managers
  const canViewTalentAvailability = effectivePermissions?.performance?.includes('view') || 
                                   currentUser.userRole === 'DS' || 
                                   currentUser.userRole === 'MANAGER';

  if (!canViewTalentAvailability) {
    return (
      <SectionWrapper title="Disponibilités des Talents">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <CalendarIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-700">Accès restreint</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux directeurs sportifs et managers.</p>
        </div>
      </SectionWrapper>
    );
  }

  // Filtrer les événements futurs
  const futureEvents = raceEvents.filter(event => {
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });

  // Filtrer par année de saison
  const filteredEvents = useMemo(() => {
    if (selectedSeasonYear === 'ALL') return futureEvents;
    return futureEvents.filter(event => getEventSeasonYear(event.date) === selectedSeasonYear);
  }, [futureEvents, selectedSeasonYear]);

  // Grouper les événements par année de saison
  const eventsBySeasonYear = useMemo(() => {
    const grouped: { [key: string]: typeof filteredEvents } = {};
    filteredEvents.forEach(event => {
      const seasonYear = getEventSeasonYear(event.date);
      if (!grouped[seasonYear]) {
        grouped[seasonYear] = [];
      }
      grouped[seasonYear].push(event);
    });
    return grouped;
  }, [filteredEvents]);

  // Obtenir les disponibilités pour un événement
  const getEventAvailabilities = (eventId: string) => {
    return riderEventSelections
      .filter(selection => selection.eventId === eventId)
      .map(selection => {
        const rider = riders.find(r => r.id === selection.riderId);
        return {
          ...selection,
          rider: rider
        };
      })
      .filter(item => item.rider); // Filtrer les sélections sans coureur correspondant
  };

  // Obtenir les disponibilités pour un coureur
  const getRiderAvailabilities = (riderId: string) => {
    return riderEventSelections
      .filter(selection => selection.riderId === riderId)
      .map(selection => {
        const event = raceEvents.find(e => e.id === selection.eventId);
        return {
          ...selection,
          event: event
        };
      })
      .filter(item => item.event); // Filtrer les sélections sans événement correspondant
  };

  const renderByEventView = () => (
    <div className="max-h-screen overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <div className="space-y-6">
        {Object.entries(eventsBySeasonYear).map(([seasonYear, events]) => {
        return (
          <div key={seasonYear} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {seasonYear}
              </h4>
              <span className={`px-3 py-1 text-sm rounded-full ${SEASON_YEAR_COLORS[seasonYear as SeasonYear]}`}>
                {seasonYear}
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="space-y-4">
                {events.map(event => {
                const availabilities = getEventAvailabilities(event.id);
                const selectedRiders = riders.filter(r => (event.selectedRiderIds || []).includes(r.id));
                
                return (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-semibold text-gray-900">{event.name}</h5>
                        <p className="text-sm text-gray-600">
                          {new Date(event.date + "T12:00:00Z").toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long',
                            year: 'numeric'
                          })} - {event.location}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${SEASON_YEAR_COLORS[getEventSeasonYear(event.date)]}`}>
                        {getEventSeasonYear(event.date)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedRiders.map(rider => {
                        const availability = availabilities.find(a => a.riderId === rider.id);
                        const talentAvailability = availability?.talentAvailability;
                        const riderPreference = availability?.riderPreference;
                        
                        return (
                          <div key={rider.id} className="p-3 bg-gray-50 rounded-lg border">
                            <div className="flex justify-between items-start mb-2">
                              <h6 className="font-medium text-gray-900 text-sm">
                                {rider.firstName} {rider.lastName}
                              </h6>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                RIDER_EVENT_STATUS_COLORS[availability?.status || RiderEventStatus.EN_ATTENTE]
                              }`}>
                                {availability?.status || 'En attente'}
                              </span>
                            </div>
                            
                            {/* Disponibilité du talent */}
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Disponibilité :
                              </label>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                talentAvailability 
                                  ? TALENT_AVAILABILITY_COLORS[talentAvailability]
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {talentAvailability || 'Non renseigné'}
                              </span>
                            </div>
                            
                            {/* Préférence du coureur */}
                            {riderPreference && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Préférence :
                                </label>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  RIDER_EVENT_PREFERENCE_COLORS[riderPreference]
                                }`}>
                                  {riderPreference}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );

  const renderByRiderView = () => (
    <div className="max-h-screen overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <div className="space-y-6">
        {riders.map(rider => {
        const riderAvailabilities = getRiderAvailabilities(rider.id);
        const futureRiderAvailabilities = riderAvailabilities.filter(a => {
          const eventDate = new Date(a.event!.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return eventDate >= today;
        });

        if (futureRiderAvailabilities.length === 0) return null;

        return (
          <div key={rider.id} className="bg-white p-6 rounded-lg shadow-sm border">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              {rider.firstName} {rider.lastName}
            </h4>
            <div className="max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {futureRiderAvailabilities.map(availability => {
                const event = availability.event!;
                const eventSeasonYear = getEventSeasonYear(event.date);
                
                return (
                  <div key={availability.id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900 text-sm">{event.name}</h5>
                      <span className={`px-2 py-1 text-xs rounded-full ${SEASON_YEAR_COLORS[eventSeasonYear]}`}>
                        {eventSeasonYear}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                      {new Date(event.date + "T12:00:00Z").toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })} - {event.location}
                    </p>
                    
                    {/* Disponibilité du talent */}
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Disponibilité :
                      </label>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        availability.talentAvailability 
                          ? TALENT_AVAILABILITY_COLORS[availability.talentAvailability]
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {availability.talentAvailability || 'Non renseigné'}
                      </span>
                    </div>
                    
                    {/* Préférence du coureur */}
                    {availability.riderPreference && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Préférence :
                        </label>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          RIDER_EVENT_PREFERENCE_COLORS[availability.riderPreference]
                        }`}>
                          {availability.riderPreference}
                        </span>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );

  return (
    <SectionWrapper title="Disponibilités des Talents">
      <div className="space-y-6">
        {/* Contrôles */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Choix des Talents</h3>
              <p className="text-sm text-gray-600">
                Consultez les choix de disponibilité et les préférences des talents pour chaque événement.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('byEvent')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'byEvent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Par événement
              </button>
              <button
                onClick={() => setViewMode('byRider')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'byRider'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Par coureur
              </button>
            </div>
          </div>
          
          {/* Filtre par année de saison */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <label className="text-sm font-medium text-gray-700 min-w-[140px]">Année de saison :</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSeasonYear('ALL')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    selectedSeasonYear === 'ALL'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Toutes
                </button>
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => {
                      const years = Object.values(SeasonYear);
                      if (selectedSeasonYear === 'ALL') {
                        // Si "Toutes" est sélectionné, aller à la dernière année
                        setSelectedSeasonYear(years[years.length - 1]);
                      } else {
                        const currentIndex = years.indexOf(selectedSeasonYear as SeasonYear);
                        if (currentIndex > 0) {
                          setSelectedSeasonYear(years[currentIndex - 1]);
                        }
                      }
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="px-3 py-1 text-sm font-medium text-gray-900 min-w-[60px] text-center">
                    {selectedSeasonYear === 'ALL' ? 'Toutes' : selectedSeasonYear.split(' ')[1]}
                  </span>
                  <button
                    onClick={() => {
                      const years = Object.values(SeasonYear);
                      if (selectedSeasonYear === 'ALL') {
                        // Si "Toutes" est sélectionné, aller à la première année
                        setSelectedSeasonYear(years[0]);
                      } else {
                        const currentIndex = years.indexOf(selectedSeasonYear as SeasonYear);
                        if (currentIndex < years.length - 1) {
                          setSelectedSeasonYear(years[currentIndex + 1]);
                        } else {
                          // Si on est à la dernière année, revenir à "Toutes"
                          setSelectedSeasonYear('ALL');
                        }
                      }
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow-sm border">
            <CalendarIcon className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-700">
              {selectedSeasonYear === 'ALL' 
                ? "Aucun événement à venir" 
                : `Aucun événement en ${selectedSeasonYear}`
              }
            </p>
            <p className="text-gray-500">
              Les choix des talents apparaîtront ici une fois qu'ils auront été renseignés.
            </p>
          </div>
        ) : (
          viewMode === 'byEvent' ? renderByEventView() : renderByRiderView()
        )}
      </div>
    </SectionWrapper>
  );
};

export default TalentAvailabilitySection;
