import React, { useState, useMemo } from 'react';
import { Rider, RaceEvent, RiderEventSelection, RiderEventStatus, RiderEventPreference, User, AppSection, PermissionLevel, SeasonYear, TalentAvailability } from '../types';
import { RIDER_EVENT_STATUS_COLORS, RIDER_EVENT_PREFERENCE_COLORS, SEASON_YEAR_COLORS, TALENT_AVAILABILITY_COLORS } from '../constants';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import CalendarIcon from '../components/icons/CalendarIcon';
import { getAgeCategory } from '../../utils/ageUtils';
import { isFutureEvent } from '../utils/dateUtils';

interface MyCalendarSectionProps {
  riders: Rider[];
  currentUser: User;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  setRiderEventSelections: (updater: React.SetStateAction<RiderEventSelection[]>) => void;
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

const MyCalendarSection: React.FC<MyCalendarSectionProps> = ({
  riders,
  currentUser,
  raceEvents,
  riderEventSelections,
  setRiderEventSelections,
  effectivePermissions
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showAllEvents, setShowAllEvents] = useState(true);
  const [editingGlobalPrefs, setEditingGlobalPrefs] = useState(false);
  const [globalWishes, setGlobalWishes] = useState('');
  const [seasonObjectives, setSeasonObjectives] = useState('');
  const [selectedSeasonYear, setSelectedSeasonYear] = useState<SeasonYear | 'ALL'>('ALL');

  // Trouver le profil du coureur
  const riderProfile = riders.find(r => r.email === currentUser.email);
  const riderId = riderProfile?.id;

  // Vérification des permissions
  const canViewFinancialInfo = effectivePermissions?.financial?.includes('view') || false;
  const canViewDebriefing = currentUser?.userRole === 'COUREUR' ? 
      (currentUser.id === riderId) : 
      (effectivePermissions?.performance?.includes('view') || false);

  // Filtrer les événements futurs (utilise la même logique que les autres composants)
  const futureEvents = raceEvents.filter(event => isFutureEvent(event.date));

  // Événements pour le coureur
  const eventsForRider = useMemo(() => {
      if (!riderId) return [];
      
      return futureEvents
          .filter(event => (event.selectedRiderIds || []).includes(riderId))
          .map(event => {
              const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
              return {
                  ...event,
                  status: selection?.status || RiderEventStatus.EN_ATTENTE,
                  riderPreference: selection?.riderPreference || RiderEventPreference.EN_ATTENTE,
                  riderObjectives: selection?.riderObjectives || '',
                  notes: selection?.notes || '',
                  isSelected: true
              };
          })
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [futureEvents, riderEventSelections, riderId]);

  // Tous les événements de l'équipe
  const allTeamEvents = useMemo(() => {
      if (!showAllEvents) return eventsForRider;
      
      return futureEvents.map(event => {
          const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
          const isSelected = (event.selectedRiderIds || []).includes(riderId || '');
          return {
              ...event,
              status: selection?.status || (isSelected ? RiderEventStatus.EN_ATTENTE : RiderEventStatus.NON_SELECTIONNE),
              riderPreference: selection?.riderPreference || RiderEventPreference.EN_ATTENTE,
              riderObjectives: selection?.riderObjectives || '',
              notes: selection?.notes || '',
              isSelected
          };
      }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [futureEvents, riderEventSelections, riderId, showAllEvents, eventsForRider]);

  // Filtrer les événements par année de saison sélectionnée
  const filteredEvents = useMemo(() => {
      if (selectedSeasonYear === 'ALL') {
          // Si "Toutes" est sélectionné, utiliser tous les événements futurs, pas seulement allTeamEvents
          return futureEvents.map(event => {
              const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
              const isSelected = (event.selectedRiderIds || []).includes(riderId || '');
              return {
                  ...event,
                  status: selection?.status || (isSelected ? RiderEventStatus.EN_ATTENTE : RiderEventStatus.NON_SELECTIONNE),
                  riderPreference: selection?.riderPreference || RiderEventPreference.EN_ATTENTE,
                  riderObjectives: selection?.riderObjectives || '',
                  notes: selection?.notes || '',
                  isSelected
              };
          }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      return allTeamEvents.filter(event => getEventSeasonYear(event.date) === selectedSeasonYear);
  }, [allTeamEvents, selectedSeasonYear, futureEvents, riderEventSelections, riderId]);

  // Grouper les événements par année de saison (utilise les événements filtrés)
  const eventsBySeasonYear = useMemo(() => {
      const grouped: { [key: string]: typeof filteredEvents } = {};
      filteredEvents.forEach(event => {
          const seasonYear = getEventSeasonYear(event.date);
          const seasonYearKey = seasonYear;
          if (!grouped[seasonYearKey]) {
              grouped[seasonYearKey] = [];
          }
          grouped[seasonYearKey].push(event);
      });
      return grouped;
  }, [filteredEvents]);

  const handlePreferenceChange = (eventId: string, preference: RiderEventPreference) => {
      if (!riderId) return;
      
      const existingSelection = riderEventSelections.find(sel => sel.eventId === eventId && sel.riderId === riderId);
      
      if (existingSelection) {
          setRiderEventSelections(prev => prev.map(sel => 
              sel.eventId === eventId && sel.riderId === riderId
                  ? { ...sel, riderPreference: preference }
                  : sel
          ));
      } else {
          const newSelection = {
              id: `selection_${Date.now()}`,
              eventId,
              riderId,
              status: RiderEventStatus.EN_ATTENTE,
              riderPreference: preference,
              riderObjectives: '',
              notes: ''
          };
          setRiderEventSelections(prev => [...prev, newSelection]);
      }
  };

  const handleTalentAvailabilityChange = (eventId: string, availability: TalentAvailability) => {
      if (!riderId) return;
      
      const existingSelection = riderEventSelections.find(sel => sel.eventId === eventId && sel.riderId === riderId);
      
      if (existingSelection) {
          setRiderEventSelections(prev => prev.map(sel => 
              sel.eventId === eventId && sel.riderId === riderId
                  ? { ...sel, talentAvailability: availability }
                  : sel
          ));
      } else {
          const newSelection = {
              id: `selection_${Date.now()}`,
              eventId,
              riderId,
              status: RiderEventStatus.EN_ATTENTE,
              riderPreference: RiderEventPreference.EN_ATTENTE,
              talentAvailability: availability,
              riderObjectives: '',
              notes: ''
          };
          setRiderEventSelections(prev => [...prev, newSelection]);
      }
  };

  const renderCalendarView = () => (
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {events.map(event => {
                              const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
                              const talentAvailability = selection?.talentAvailability;
                              
                              return (
                                  <div key={event.id} className={`p-4 rounded-lg border ${
                                      event.isSelected 
                                          ? 'bg-blue-50 border-blue-200' 
                                          : 'bg-gray-50 border-gray-200'
                                  }`}>
                                      <div className="flex justify-between items-start mb-2">
                                          <h5 className="font-medium text-gray-900 text-sm">{event.name}</h5>
                                          <span className={`px-2 py-1 text-xs rounded-full ${
                                              event.isSelected 
                                                  ? RIDER_EVENT_STATUS_COLORS[event.status] || 'bg-blue-100 text-blue-800'
                                                  : 'bg-gray-100 text-gray-600'
                                          }`}>
                                              {event.isSelected ? event.status : 'Non sélectionné'}
                                          </span>
                                      </div>
                                      <p className="text-xs text-gray-600 mb-2">
                                          {new Date(event.date + "T12:00:00Z").toLocaleDateString('fr-FR', { 
                                              day: 'numeric', 
                                              month: 'short',
                                              year: 'numeric'
                                          })} - {event.location}
                                      </p>
                                      
                                      {/* Informations de sélection pour l'événement */}
                                      <div className="mb-3">
                                          {(() => {
                                              const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);
                                              const titulaires = eventSelections.filter(sel => sel.status === RiderEventStatus.TITULAIRE);
                                              const preselections = eventSelections.filter(sel => sel.status === RiderEventStatus.PRE_SELECTION);
                                              const remplacants = eventSelections.filter(sel => sel.status === RiderEventStatus.REMPLACANT);
                                              
                                              return (
                                                  <div className="flex flex-wrap gap-2 text-xs">
                                                      {titulaires.length > 0 && (
                                                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                                                              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                                              {titulaires.length} Titulaire{titulaires.length > 1 ? 's' : ''}
                                                          </span>
                                                      )}
                                                      {preselections.length > 0 && (
                                                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                                                              {preselections.length} Pré-sél.
                                                          </span>
                                                      )}
                                                      {remplacants.length > 0 && (
                                                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                                                              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                                                              {remplacants.length} Remplaçant{remplacants.length > 1 ? 's' : ''}
                                                          </span>
                                                      )}
                                                      {eventSelections.length === 0 && (
                                                          <span className="text-gray-500 italic">Aucune sélection</span>
                                                      )}
                                                  </div>
                                              );
                                          })()}
                                      </div>
                                      
                                      {/* Options de disponibilité pour les talents */}
                                      <div className="mt-3">
                                          <label className="block text-xs font-medium text-gray-700 mb-2">
                                              Ma disponibilité :
                                          </label>
                                          <div className="flex flex-wrap gap-1">
                                              {Object.values(TalentAvailability).map(availability => (
                                                  <button
                                                      key={availability}
                                                      onClick={() => handleTalentAvailabilityChange(event.id, availability)}
                                                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                                                          talentAvailability === availability
                                                              ? TALENT_AVAILABILITY_COLORS[availability]
                                                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                      }`}
                                                  >
                                                      {availability}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>

                                      {event.isSelected && (
                                          <div className="mt-3">
                                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                                  Ma préférence :
                                              </label>
                                              <div className="flex flex-wrap gap-1">
                                                  {Object.values(RiderEventPreference).map(preference => (
                                                      <button
                                                          key={preference}
                                                          onClick={() => handlePreferenceChange(event.id, preference)}
                                                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                                                              event.riderPreference === preference
                                                                  ? RIDER_EVENT_PREFERENCE_COLORS[preference]
                                                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                          }`}
                                                      >
                                                          {preference}
                                                      </button>
                                                  ))}
                                              </div>
                                              
                                              {/* Section pour les objectifs spécifiques */}
                                              {event.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES && (
                                                  <div className="mt-3">
                                                      <label className="block text-xs font-medium text-gray-700 mb-2">
                                                          Mes objectifs pour cet événement :
                                                      </label>
                                                      <textarea
                                                          value={event.riderObjectives || ''}
                                                          onChange={(e) => {
                                                              const existingSelection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
                                                              if (existingSelection) {
                                                                  setRiderEventSelections(prev => prev.map(sel => 
                                                                      sel.eventId === event.id && sel.riderId === riderId
                                                                          ? { ...sel, riderObjectives: e.target.value }
                                                                          : sel
                                                                  ));
                                                              }
                                                          }}
                                                          placeholder="Décrivez vos objectifs spécifiques pour cet événement..."
                                                          className="w-full p-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                          rows={3}
                                                      />
                                                  </div>
                                              )}
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

  const renderListView = () => (
      <div className="max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="space-y-4">
              {filteredEvents.map(event => {
              const selection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
              const talentAvailability = selection?.talentAvailability;
              const eventSeasonYear = getEventSeasonYear(event.date);
              
              return (
                  <div key={event.id} className={`p-4 rounded-lg border ${
                      event.isSelected 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-200'
                  }`}>
                      <div className="flex justify-between items-start mb-3">
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{event.name}</h4>
                                  <span className={`px-2 py-1 text-xs rounded-full ${SEASON_YEAR_COLORS[eventSeasonYear]}`}>
                                      {eventSeasonYear}
                                  </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                  {new Date(event.date + "T12:00:00Z").toLocaleDateString('fr-FR', { 
                                      weekday: 'long', 
                                      day: 'numeric', 
                                      month: 'long',
                                      year: 'numeric'
                                  })} - {event.location}
                              </p>
                              
                              {/* Informations de sélection pour l'événement */}
                              <div className="mt-2">
                                  {(() => {
                                      const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);
                                      const titulaires = eventSelections.filter(sel => sel.status === RiderEventStatus.TITULAIRE);
                                      const preselections = eventSelections.filter(sel => sel.status === RiderEventStatus.PRE_SELECTION);
                                      const remplacants = eventSelections.filter(sel => sel.status === RiderEventStatus.REMPLACANT);
                                      
                                      return (
                                          <div className="flex flex-wrap gap-2 text-sm">
                                              {titulaires.length > 0 && (
                                                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800">
                                                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                                      {titulaires.length} Titulaire{titulaires.length > 1 ? 's' : ''}
                                                  </span>
                                              )}
                                              {preselections.length > 0 && (
                                                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                                      {preselections.length} Pré-sélectionné{preselections.length > 1 ? 's' : ''}
                                                  </span>
                                              )}
                                              {remplacants.length > 0 && (
                                                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
                                                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                                                      {remplacants.length} Remplaçant{remplacants.length > 1 ? 's' : ''}
                                                  </span>
                                              )}
                                              {eventSelections.length === 0 && (
                                                  <span className="text-gray-500 italic">Aucune sélection</span>
                                              )}
                                          </div>
                                      );
                                  })()}
                              </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                              event.isSelected 
                                  ? RIDER_EVENT_STATUS_COLORS[event.status] || 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-600'
                          }`}>
                              {event.isSelected ? event.status : 'Non sélectionné'}
                          </span>
                      </div>

                      {/* Options de disponibilité pour les talents */}
                      <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                              Ma disponibilité :
                          </label>
                          <div className="flex flex-wrap gap-2">
                              {Object.values(TalentAvailability).map(availability => (
                                  <button
                                      key={availability}
                                      onClick={() => handleTalentAvailabilityChange(event.id, availability)}
                                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                          talentAvailability === availability
                                              ? TALENT_AVAILABILITY_COLORS[availability]
                                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                  >
                                      {availability}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {event.isSelected && (
                          <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Ma préférence pour cet événement :
                              </label>
                              <div className="flex flex-wrap gap-2">
                                  {Object.values(RiderEventPreference).map(preference => (
                                      <button
                                          key={preference}
                                          onClick={() => handlePreferenceChange(event.id, preference)}
                                          className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                              event.riderPreference === preference
                                                  ? RIDER_EVENT_PREFERENCE_COLORS[preference]
                                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                          }`}
                                      >
                                          {preference}
                                      </button>
                                  ))}
                              </div>
                              
                              {/* Section pour les objectifs spécifiques */}
                              {event.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES && (
                                  <div className="mt-3">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Mes objectifs pour cet événement :
                                      </label>
                                      <textarea
                                          value={event.riderObjectives || ''}
                                          onChange={(e) => {
                                              const existingSelection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === riderId);
                                              if (existingSelection) {
                                                  setRiderEventSelections(prev => prev.map(sel => 
                                                      sel.eventId === event.id && sel.riderId === riderId
                                                          ? { ...sel, riderObjectives: e.target.value }
                                                          : sel
                                                  ));
                                              }
                                          }}
                                          placeholder="Décrivez vos objectifs spécifiques pour cet événement..."
                                          className="w-full p-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          rows={3}
                                      />
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              );
              })}
          </div>
      </div>
  );

  if (!riderProfile) {
      return (
          <SectionWrapper title="Mon Calendrier">
              <div className="text-center p-8 bg-gray-50 rounded-lg border">
                  <CalendarIcon className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
                  <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
              </div>
          </SectionWrapper>
      );
  }

  return (
      <SectionWrapper title="Mon Calendrier">
          <div className="space-y-6">
              {/* Contrôles */}
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                          <h3 className="text-lg font-semibold text-gray-900">Calendrier Prévisionnel d'Équipe</h3>
                          <p className="text-sm text-gray-600">
                              Consultez tous les événements de l'équipe organisés par années de saison et exprimez vos préférences.
                          </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex items-center gap-2">
                              <input
                                  type="checkbox"
                                  id="show-all-events"
                                  checked={showAllEvents}
                                  onChange={(e) => setShowAllEvents(e.target.checked)}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="show-all-events" className="text-sm text-gray-700">
                                  Afficher tous les événements
                              </label>
                          </div>
                          <div className="flex gap-1">
                              <button
                                  onClick={() => setViewMode('calendar')}
                                  className={`px-3 py-1 text-sm rounded ${
                                      viewMode === 'calendar'
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                              >
                                  Calendrier
                              </button>
                              <button
                                  onClick={() => setViewMode('list')}
                                  className={`px-3 py-1 text-sm rounded ${
                                      viewMode === 'list'
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                              >
                                  Liste
                              </button>
                          </div>
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
                          {showAllEvents 
                              ? "Les événements de l'équipe apparaîtront ici une fois ajoutés."
                              : "Les événements apparaîtront ici une fois que vous serez sélectionné."
                          }
                      </p>
                  </div>
              ) : (
                  viewMode === 'calendar' ? renderCalendarView() : renderListView()
              )}
          </div>
      </SectionWrapper>
  );
};

export default MyCalendarSection;
