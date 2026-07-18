import React, { useState, useMemo, useEffect } from 'react';
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
  TableCellsIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { RiderDetailModal } from '../components/RiderDetailModal';
import { 
  Rider, 
  RaceEvent, 
  RiderEventSelection, 
  RiderEventStatus, 
  RiderEventPreference, 
  TalentAvailability,
  User,
  AppState,
  AppSection,
  RiderQualitativeProfile,
  Sex,
  ScoutingProfile,
  TeamProduct,
  PerformanceEntry as AppPerformanceEntry,
} from '../types';
import { getAge, getAgeCategory, getLevelCategory } from '../utils/ageUtils';
import { isFutureEvent, getEventYear, formatEventDate, formatEventDateRange } from '../utils/dateUtils';
import { getEffectivePermissions } from '../services/firebaseService';
import { sendDigitalConvocationNotifications } from '../services/notificationService';
import {
  analyzeRiderEventIssues,
  getActiveRiders,
  getUpcomingEventsWithSelections,
  resolveRiderEventSelection,
} from '../utils/talentAvailabilityUtils';

/** Statuts qui font apparaître l'athlète dans l'événement (onglet Participants / calendrier) */
const RIDER_STATUS_IN_EVENT: RiderEventStatus[] = [
  RiderEventStatus.TITULAIRE,
  RiderEventStatus.PRE_SELECTION,
  RiderEventStatus.REMPLACANT,
];

interface SeasonPlanningSectionProps {
  riders: Rider[];
  onSaveRider: (rider: Rider) => void;
  onDeleteRider: (rider: Rider) => void;
  raceEvents: RaceEvent[];
  setRaceEvents: (updater: React.SetStateAction<RaceEvent[]>) => void;
  riderEventSelections: RiderEventSelection[];
  setRiderEventSelections: (updater: React.SetStateAction<RiderEventSelection[]>) => void;
  performanceEntries: AppPerformanceEntry[];
  scoutingProfiles: ScoutingProfile[];
  teamProducts: TeamProduct[];
  currentUser: User;
  appState: AppState;
  onOpenRiderModal?: (rider: Rider, initialTab?: string) => void;
  onSaveRaceEvent?: (event: Partial<RaceEvent> & { id: string }) => void;
  navigateTo?: (section: AppSection, eventId?: string) => void;
  embedded?: boolean;
}

export default function SeasonPlanningSection({ 
  riders, 
  onSaveRider, 
  onDeleteRider, 
  raceEvents, 
  setRaceEvents, 
  riderEventSelections, 
  setRiderEventSelections, 
  performanceEntries, 
  scoutingProfiles, 
  teamProducts, 
  currentUser, 
  appState,
  onOpenRiderModal,
  onSaveRaceEvent,
  navigateTo,
  embedded = false,
}: SeasonPlanningSectionProps) {
  if (!appState) {
    return <div>Chargement...</div>;
  }
  
  // Vérifications de sécurité
  if (!riders || !Array.isArray(riders)) {
    return <div>Erreur: Données des athlètes non disponibles</div>;
  }
  
  if (!raceEvents || !Array.isArray(raceEvents)) {
    return <div>Erreur: Données des événements non disponibles</div>;
  }
  
  if (!riderEventSelections || !Array.isArray(riderEventSelections)) {
    return <div>Erreur: Données des sélections non disponibles</div>;
  }

  // États pour la gestion des vues
  const [activeView, setActiveView] = useState<'overview' | 'rider-detail' | 'preferences'>('overview');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [expandedRiderIds, setExpandedRiderIds] = useState<Set<string>>(new Set());
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<string>('all');
  const [teamRosterFilter, setTeamRosterFilter] = useState<'all' | 'principal' | 'reserve'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [preferenceFilter, setPreferenceFilter] = useState<'all' | 'wants' | 'objectives' | 'unavailable' | 'waiting'>('all');
  const [raceTypeFilter, setRaceTypeFilter] = useState<'all' | 'uci' | 'championnat' | 'coupe-france' | 'federal'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [hidePastEvents, setHidePastEvents] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [compactTable, setCompactTable] = useState(true);

  // Déterminer le type de course à partir de l'eligibleCategory
  const getRaceType = (eligibleCategory: string): string => {
    if (!eligibleCategory) {
      console.warn('⚠️ eligibleCategory vide ou undefined');
      return 'autre';
    }
    
    const category = eligibleCategory.toLowerCase().trim();
    
    // UCI
    if (category.startsWith('uci.') || category.startsWith('uci ')) {
      return 'uci';
    }
    
    // Coupe de France (DOIT être vérifié AVANT cf. pour éviter confusion)
    if (category.startsWith('cdf.') || category.startsWith('cdf ') || 
        category.includes('coupe de france')) {
      return 'coupe-france';
    }
    
    // Championnat (Championnat de France, Monde, etc.)
    if (category.startsWith('cf.') || category.startsWith('cf ') ||
        category.startsWith('cm') || category.startsWith('cc') || 
        category.startsWith('jo') || category.includes('championnat')) {
      return 'championnat';
    }
    
    // Fédéral
    if (category.startsWith('fed.') || category.startsWith('fed ') || 
        category.includes('fédéral') || category.includes('federal')) {
      return 'federal';
    }
    
    console.warn(`⚠️ Type de course non reconnu pour: "${eligibleCategory}"`);
    return 'autre';
  };
  
  // États pour le tri
  const [sortField, setSortField] = useState<'name' | 'lastName' | 'firstName' | 'age' | 'profile' | 'raceDays'>('lastName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  

  // Calculer les permissions effectives
  const effectivePermissions = useMemo(() => {
    if (!currentUser) return {};
    return getEffectivePermissions(
      currentUser,
      appState.permissions,
      appState.staff
    );
  }, [currentUser, appState.permissions, appState.staff]);

  // Filtrer les événements futurs
  const futureEvents = useMemo(() => {
    const filtered = raceEvents.filter(event => {
      if (!isFutureEvent(event.date)) return false;
      if (selectedYear !== 'all' && getEventYear(event.date) !== selectedYear) return false;
      
      // Filtre par type de course
      if (raceTypeFilter !== 'all') {
        const eventRaceType = getRaceType(event.eligibleCategory || '');
        
        // Debug: afficher les informations de filtrage
        console.log(`🔍 Événement: ${event.name}`);
        console.log(`   eligibleCategory: "${event.eligibleCategory}"`);
        console.log(`   Type détecté: "${eventRaceType}"`);
        console.log(`   Filtre appliqué: "${raceTypeFilter}"`);
        console.log(`   Correspond: ${eventRaceType === raceTypeFilter}`);
        
        if (eventRaceType !== raceTypeFilter) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Debug: afficher le résumé
    if (raceTypeFilter !== 'all') {
      console.log(`📊 Résumé du filtre "${raceTypeFilter}": ${filtered.length} événement(s) trouvé(s)`);
    }
    
    return filtered;
  }, [raceEvents, selectedYear, raceTypeFilter]);

  // Tous les événements de l'année (pour option "afficher les passés")
  const eventsForSelectedYear = useMemo(() => {
    const filtered = raceEvents.filter(event => {
      if (selectedYear !== 'all' && getEventYear(event.date) !== selectedYear) return false;
      if (raceTypeFilter !== 'all') {
        const eventRaceType = getRaceType(event.eligibleCategory || '');
        if (eventRaceType !== raceTypeFilter) return false;
      }
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return filtered;
  }, [raceEvents, selectedYear, raceTypeFilter]);

  // Liste affichée : sans les passés si l'option est cochée (comparaison réelle date >= aujourd'hui)
  const displayEvents = useMemo(() => {
    if (!hidePastEvents) return eventsForSelectedYear;
    const todayStr = new Date().toISOString().split('T')[0];
    return futureEvents.filter(event => (event.endDate || event.date) >= todayStr);
  }, [hidePastEvents, futureEvents, eventsForSelectedYear]);

  // Obtenir les années disponibles
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    raceEvents.forEach(event => {
      if (isFutureEvent(event.date)) {
        years.add(getEventYear(event.date));
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [raceEvents]);

  // Déterminer si on doit afficher la vue calendrier (plus de 5 événements)
  const shouldShowCalendarView = displayEvents.length > 5;

  // Fonction pour calculer le nombre de jours de course prévu pour un athlète (titulaires uniquement)
  const getRiderRaceDays = (riderId: string) => {
    return riderEventSelections.filter(sel => 
      sel.riderId === riderId && 
      displayEvents.some(event => event.id === sel.eventId) &&
      sel.status === RiderEventStatus.TITULAIRE
    ).length;
  };

  // Fonction pour calculer le nombre de pré-sélections
  const getRiderPreselections = (riderId: string) => {
    return riderEventSelections.filter(sel => 
      sel.riderId === riderId && 
      displayEvents.some(event => event.id === sel.eventId) &&
      sel.status === RiderEventStatus.PRE_SELECTION
    ).length;
  };

  // Fonction de tri des athlètes
  const sortRiders = (riders: Rider[]) => {
    return [...riders].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'lastName':
          aValue = (a.lastName || '').toLowerCase();
          bValue = (b.lastName || '').toLowerCase();
          break;
        case 'firstName':
          aValue = (a.firstName || '').toLowerCase();
          bValue = (b.firstName || '').toLowerCase();
          break;
        case 'age':
          aValue = getAge(a.birthDate);
          bValue = getAge(b.birthDate);
          break;
        case 'profile':
          aValue = a.qualitativeProfile || 'AUTRE';
          bValue = b.qualitativeProfile || 'AUTRE';
          break;
        case 'raceDays':
          aValue = getRiderRaceDays(a.id);
          bValue = getRiderRaceDays(b.id);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Filtrer et trier les athlètes
  const filteredRiders = useMemo(() => {
    const filtered = riders.filter(rider => {
      const matchesSearch = searchTerm === '' || 
        `${rider.firstName} ${rider.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGender = genderFilter === 'all' || rider.sex === (genderFilter === 'male' ? Sex.MALE : Sex.FEMALE);
      const ageCategory = getAgeCategory(rider.birthDate);
      const matchesAgeCategory = ageCategoryFilter === 'all' || 
        ageCategory.category === ageCategoryFilter;
      const riderRosterRole = rider.rosterRole ?? 'principal';
      const matchesRosterRole =
        teamRosterFilter === 'all' || riderRosterRole === teamRosterFilter;
      const levelCategory = getLevelCategory(rider);
      const matchesLevel = levelFilter === 'all' || 
        levelCategory === levelFilter;
      
      // Filtre par préférence - vérifier si l'athlète a au moins une préférence correspondante
      let matchesPreference = true;
      if (preferenceFilter !== 'all') {
        const riderSelections = riderEventSelections.filter(sel => sel.riderId === rider.id);
        matchesPreference = riderSelections.some(sel => {
          switch (preferenceFilter) {
            case 'wants':
              return sel.riderPreference === RiderEventPreference.VEUT_PARTICIPER;
            case 'objectives':
              return sel.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES;
            case 'waiting':
              return sel.riderPreference === RiderEventPreference.EN_ATTENTE;
            case 'unavailable':
              return sel.riderPreference === RiderEventPreference.ABSENT || 
                     sel.riderPreference === RiderEventPreference.NE_VEUT_PAS;
            default:
              return true;
          }
        });
      }
      
      return matchesSearch && matchesGender && matchesAgeCategory && matchesRosterRole && matchesLevel && matchesPreference;
    });
    
    // Appliquer le tri, puis scinder Équipe 1 / Réserve (Équipe 1 en premier)
    const sorted = sortRiders(filtered);
    return [...sorted].sort((a, b) => {
      const aRole = a.rosterRole === 'reserve' ? 1 : 0;
      const bRole = b.rosterRole === 'reserve' ? 1 : 0;
      return aRole - bRole;
    });
  }, [riders, searchTerm, genderFilter, ageCategoryFilter, teamRosterFilter, levelFilter, preferenceFilter, riderEventSelections, sortField, sortDirection]);

  const rosterSplit = useMemo(() => {
    const principal = filteredRiders.filter((r) => (r.rosterRole ?? 'principal') !== 'reserve');
    const reserve = filteredRiders.filter((r) => r.rosterRole === 'reserve');
    return { principal, reserve };
  }, [filteredRiders]);

  const rosterCounts = useMemo(() => ({
    principal: riders.filter((r) => (r.rosterRole ?? 'principal') !== 'reserve').length,
    reserve: riders.filter((r) => r.rosterRole === 'reserve').length,
  }), [riders]);

  // Fonction pour obtenir le statut d'un athlète pour un événement
  const getRiderEventStatus = (eventId: string, riderId: string): RiderEventStatus | null => {
    const selection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    return selection?.status || null;
  };

  // Fonction pour obtenir la préférence d'un athlète pour un événement
  const getRiderEventPreference = (eventId: string, riderId: string): RiderEventPreference | null => {
    const selection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    return selection?.riderPreference || null;
  };

  // Fonction pour obtenir la disponibilité d'un athlète pour un événement
  const getRiderEventAvailability = (eventId: string, riderId: string): TalentAvailability | null => {
    const selection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    return selection?.talentAvailability || null;
  };

  // Synchronise event.selectedRiderIds avec les sélections (pour que l'athlète apparaisse dans l'événement / calendrier)
  const syncEventSelectedRiderIds = (eventId: string, currentIds: string[], riderId: string, status: RiderEventStatus, isRemoval: boolean) => {
    const isInEvent = !isRemoval && RIDER_STATUS_IN_EVENT.includes(status);
    const newSelectedRiderIds = isInEvent
      ? (currentIds.includes(riderId) ? currentIds : [...currentIds, riderId])
      : currentIds.filter(id => id !== riderId);
    const event = raceEvents.find(e => e.id === eventId);
    if (!event) return;
    const updatedEvent = { ...event, selectedRiderIds: newSelectedRiderIds };
    setRaceEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
    if (onSaveRaceEvent) onSaveRaceEvent(updatedEvent);
  };

  // Fonction pour ajouter un athlète à un événement
  const addRiderToEvent = async (eventId: string, riderId: string, status: RiderEventStatus = RiderEventStatus.PRE_SELECTION) => {
    try {
      const event = raceEvents.find(e => e.id === eventId);
      if (!event) return;
      
      // Vérifier les limites de sélection
      const currentSelectedCount = getSelectedRidersCount(eventId);
      const maxRiders = event.maxRiders;
      
      if (maxRiders && currentSelectedCount >= maxRiders) {
        alert(`Impossible d'ajouter plus d'athlètes. Limite maximale de ${maxRiders} coureurs atteinte.`);
        return;
      }
      
      const existingSelection = riderEventSelections.find(
        sel => sel.eventId === eventId && sel.riderId === riderId
      );
      
      if (existingSelection) {
        const updatedSelection = { ...existingSelection, status };
        setRiderEventSelections(prev => 
          prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
        );
      } else {
        const newSelection: RiderEventSelection = {
          id: `${eventId}_${riderId}_${Date.now()}`,
          eventId,
          riderId,
          status,
          riderPreference: RiderEventPreference.EN_ATTENTE,
          talentAvailability: TalentAvailability.DISPONIBLE,
          riderObjectives: '',
          notes: ''
        };
        setRiderEventSelections(prev => [...prev, newSelection]);
      }
      // Connexion planning → événement : faire apparaître l'athlète dans l'événement (calendrier / onglet Participants)
      syncEventSelectedRiderIds(eventId, event.selectedRiderIds || [], riderId, status, false);

      // Notification transversale : informer l'athlète de sa sélection
      const teamId = appState.activeTeamId;
      if (teamId && currentUser?.id) {
        sendDigitalConvocationNotifications({
          teamId,
          eventId,
          eventName: event.name,
          eventDate: event.date,
          mode: 'athlete',
          sentByUserId: currentUser.id,
          users: appState.users ?? [],
          riders: riders,
          staff: [],
          riderId,
        }).catch(() => {/* silencieux si l'athlète n'a pas de compte */});
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'athlète:', error);
    }
  };

  // Fonction pour mettre à jour la préférence d'un athlète
  const updateRiderPreference = (eventId: string, riderId: string, preference: RiderEventPreference) => {
    const existingSelection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    
    if (existingSelection) {
      const updatedSelection = { ...existingSelection, riderPreference: preference };
      setRiderEventSelections(prev => 
        prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
      );
    } else {
      // Créer une nouvelle sélection si elle n'existe pas
      const newSelection: RiderEventSelection = {
        id: `${eventId}_${riderId}_${Date.now()}`,
        eventId,
        riderId,
        status: RiderEventStatus.EN_ATTENTE,
        riderPreference: preference,
        talentAvailability: TalentAvailability.DISPONIBLE,
        riderObjectives: '',
        notes: ''
      };
      setRiderEventSelections(prev => [...prev, newSelection]);
    }
  };

  // Fonction pour mettre à jour la disponibilité d'un athlète
  const updateRiderAvailability = (eventId: string, riderId: string, availability: TalentAvailability) => {
    const existingSelection = riderEventSelections.find(
      sel => sel.eventId === eventId && sel.riderId === riderId
    );
    
    if (existingSelection) {
      const updatedSelection = { ...existingSelection, talentAvailability: availability };
      setRiderEventSelections(prev => 
        prev.map(sel => sel.id === existingSelection.id ? updatedSelection : sel)
      );
    } else {
      // Créer une nouvelle sélection si elle n'existe pas
      const newSelection: RiderEventSelection = {
        id: `${eventId}_${riderId}_${Date.now()}`,
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

  // Fonction pour retirer un athlète d'un événement
  const removeRiderFromEvent = (eventId: string, riderId: string) => {
    const event = raceEvents.find(e => e.id === eventId);
    setRiderEventSelections(prev => 
      prev.filter(sel => !(sel.eventId === eventId && sel.riderId === riderId))
    );
    // Connexion planning → événement : retirer l'athlète de l'événement
    if (event) syncEventSelectedRiderIds(eventId, event.selectedRiderIds || [], riderId, RiderEventStatus.NON_RETENU, true);
  };


  // Fonction pour obtenir le nombre d'athlètes sélectionnés pour un événement (riderEventSelections + event.selectedRiderIds)
  const getSelectedRidersCount = (eventId: string) => {
    const event = raceEvents.find(e => e.id === eventId);
    const fromSelections = riderEventSelections.filter(sel =>
      sel.eventId === eventId &&
      (sel.status === RiderEventStatus.TITULAIRE || sel.status === RiderEventStatus.PRE_SELECTION)
    ).length;
    const riderIdsInSelections = new Set(
      riderEventSelections.filter(sel => sel.eventId === eventId).map(s => s.riderId)
    );
    const fromEventOnly = (event?.selectedRiderIds || []).filter(id => !riderIdsInSelections.has(id)).length;
    return fromSelections + fromEventOnly;
  };

  // Fonction pour vérifier si les limites sont respectées
  const isWithinLimits = (eventId: string) => {
    const event = raceEvents.find(e => e.id === eventId);
    if (!event) return true;
    
    const selectedCount = getSelectedRidersCount(eventId);
    const minRiders = event.minRiders || 0;
    const maxRiders = event.maxRiders || Infinity;
    
    return selectedCount >= minRiders && selectedCount <= maxRiders;
  };

  // Fonction pour ouvrir le calendrier d'un athlète
  const openRiderCalendar = (rider: Rider) => {
    console.log('Opening calendar for rider:', rider.firstName, rider.lastName);
    if (onOpenRiderModal) {
      onOpenRiderModal(rider, 'calendar');
    } else {
      console.error('onOpenRiderModal not provided');
    }
  };

  // Fonction pour ouvrir le profil d'un athlète
  const openRiderProfile = (rider: Rider) => {
    if (onOpenRiderModal) {
      onOpenRiderModal(rider, 'info');
    } else {
      console.error('onOpenRiderModal not provided');
    }
  };

  // Fonction de tri
  const handleSort = (field: 'name' | 'lastName' | 'firstName' | 'age' | 'profile' | 'raceDays') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const activeRiderIds = useMemo(() => new Set(getActiveRiders(riders).map(r => r.id)), [riders]);

  const eventValidations = useMemo(() => {
    const summaries = getUpcomingEventsWithSelections(raceEvents, riderEventSelections, activeRiderIds, 120);
    return Object.fromEntries(summaries.map(s => [s.event.id, s]));
  }, [raceEvents, riderEventSelections, activeRiderIds]);

  const validationStats = useMemo(() => {
    const summaries = Object.values(eventValidations);
    return {
      events: summaries.length,
      needsAction: summaries.filter(s => !s.isComplete).length,
      missingStaff: summaries.reduce((n, s) => n + s.missingStaff, 0),
      missingPref: summaries.reduce((n, s) => n + s.missingPreference, 0),
      conflicts: summaries.reduce((n, s) => n + s.conflicts, 0),
    };
  }, [eventValidations]);

  const renderAvailabilitySelect = (eventId: string, riderId: string, compact = false) => {
    const event = raceEvents.find(e => e.id === eventId);
    if (!event) return null;
    const selection = resolveRiderEventSelection(event, riderId, riderEventSelections);
    const value = selection.talentAvailability ?? '';
    return (
      <select
        value={value}
        onChange={e => {
          const next = e.target.value as TalentAvailability;
          if (next) updateRiderAvailability(eventId, riderId, next);
        }}
        className={`${compact ? 'text-[11px] px-2 py-1.5' : 'text-xs px-2.5 py-2'} rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-full transition-colors ${
          value
            ? 'border-white/15 bg-slate-950/90 text-slate-100'
            : 'border-amber-400/50 bg-amber-950/50 text-amber-100'
        }`}
        title="Disponibilité staff"
      >
        <option value="">Dispo staff</option>
        {Object.values(TalentAvailability).map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  };

  const renderValidationAlerts = () => {
    if (validationStats.events === 0) return null;
    if (validationStats.needsAction === 0) {
      return (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-100">
          Toutes les sélections à venir sont alignées (préférences coureurs + disponibilités staff).
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-amber-500/35 bg-amber-950/45 px-4 py-3">
        <p className="text-sm font-medium text-amber-100">
          {validationStats.needsAction} course(s) nécessitent une vérification
        </p>
        <p className="text-xs text-amber-200/90 mt-1">
          {validationStats.missingPref > 0 && `${validationStats.missingPref} préférence(s) coureur en attente · `}
          {validationStats.missingStaff > 0 && `${validationStats.missingStaff} dispo staff à confirmer · `}
          {validationStats.conflicts > 0 && `${validationStats.conflicts} conflit(s)`}
          {validationStats.missingPref > 0 && ' — les coureurs répondent depuis Mon Calendrier.'}
        </p>
      </div>
    );
  };

  const renderCellIssues = (eventId: string, riderId: string) => {
    const event = raceEvents.find(e => e.id === eventId);
    if (!event) return null;
    const selection = resolveRiderEventSelection(event, riderId, riderEventSelections);
    if (!selection.status || selection.status === RiderEventStatus.NON_RETENU) return null;
    const issues = analyzeRiderEventIssues(selection);
    if (issues.length === 0) return null;
    return (
      <span className="text-[10px] text-amber-300 font-medium" title={issues.join(', ')}>
        ⚠
      </span>
    );
  };


  // Rendu de la vue calendrier
  const renderCalendarView = () => (
    <div className="space-y-6">
      {/* En-tête calendrier */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Vue calendrier</h2>
            <p className="text-xs text-gray-500 mt-0.5">{displayEvents.length} événement{displayEvents.length !== 1 ? 's' : ''}</p>
          </div>
          
          {/* Contrôles de vue */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Sélecteur d'année */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Année :</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Toutes</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year === 2026 ? `📅 ${year} (Planification)` : year}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Sélecteur de vue */}
            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableCellsIcon className="w-4 h-4 mr-1 inline" />
                Tableau
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDaysIcon className="w-4 h-4 mr-1 inline" />
                Calendrier
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendrier des événements */}
      <div className="bg-white rounded-lg border">
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Événements à venir</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayEvents.map(event => {
              const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);
              const titulairesFromSelections = eventSelections.filter(sel => sel.status === RiderEventStatus.TITULAIRE);
              // Inclure les coureurs sélectionnés dans l'événement (onglet Participants) qui n'ont pas encore d'entrée dans riderEventSelections
              const selectedRiderIds = event.selectedRiderIds || [];
              const riderIdsInSelections = new Set(eventSelections.map(s => s.riderId));
              const titulairesFromEventOnlyCount = selectedRiderIds.filter(id => !riderIdsInSelections.has(id)).length;
              const titulairesCount = titulairesFromSelections.length + titulairesFromEventOnlyCount;
              const preselections = eventSelections.filter(sel => sel.status === RiderEventStatus.PRE_SELECTION);
              const remplacants = eventSelections.filter(sel => sel.status === RiderEventStatus.REMPLACANT);
              const totalSelected = titulairesCount + preselections.length + remplacants.length;
              const validation = eventValidations[event.id];
              
              return (
                <div
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo?.('eventDetail', event.id)}
                  onKeyDown={(e) => e.key === 'Enter' && navigateTo?.('eventDetail', event.id)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="font-semibold text-gray-900 text-lg">{event.name}</h5>
                    <div className="text-right">
                      <span className="text-sm text-gray-500 block">
                        {new Date(event.date).toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      {validation && !validation.isComplete && (
                        <span className="text-xs text-amber-700 font-medium">
                          {validation.attentionRiders.length} à valider
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{event.location}</p>
                  
                  {/* Informations de sélection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Titulaires</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{titulairesCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Pré-sélections</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{preselections.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Remplaçants</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{remplacants.length}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <span className="text-2xl font-light text-blue-600">
                        {totalSelected}
                      </span>
                      <div className="text-xs text-gray-500">sélectionnés</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Rendu de la vue détail par athlète
  const renderRiderDetailView = () => (
    <div className="space-y-6">
      {/* En-tête détail coureur */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Détail par coureur</h2>
            <p className="text-xs text-gray-500 mt-0.5">{filteredRiders.length} coureur{filteredRiders.length !== 1 ? 's' : ''}</p>
          </div>
          
          {/* Sélecteur d'année */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Année :</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="all">Toutes</option>
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year === 2026 ? `📅 ${year} (Planification)` : year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un coureur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tableau accordéon */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Athlète</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Âge</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Aperçu à venir</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Titulaire</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pré-sél.</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRiders.map(rider => {
              const riderSelections = riderEventSelections.filter(sel =>
                sel.riderId === rider.id && displayEvents.some(event => event.id === sel.eventId)
              );
              // Inclure les événements où l'athlète est dans selectedRiderIds mais pas encore dans riderEventSelections (sélections faites dans l'onglet Participants)
              const eventsFromSelectedIds = displayEvents.filter(
                event => (event.selectedRiderIds || []).includes(rider.id) && !riderSelections.some(s => s.eventId === event.id)
              );
              type RiderEventEntry = { event: RaceEvent; status: RiderEventStatus; selection?: typeof riderSelections[0] };
              const riderEventEntries: RiderEventEntry[] = [
                ...riderSelections.map(sel => {
                  const ev = displayEvents.find(e => e.id === sel.eventId);
                  return ev ? { event: ev, status: sel.status, selection: sel } : null;
                }).filter((x) => x !== null),
                ...eventsFromSelectedIds.map(event => ({ event, status: RiderEventStatus.TITULAIRE, selection: undefined })),
              ].sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
              const isExpanded = expandedRiderIds.has(rider.id);
              const titulaireCount = riderEventEntries.filter(e => e.status === RiderEventStatus.TITULAIRE).length;
              const preselectionCount = riderEventEntries.filter(e => e.status === RiderEventStatus.PRE_SELECTION).length;
              const nextEvents = riderEventEntries.slice(0, 3);

              const toggle = () => {
                setExpandedRiderIds(prev => {
                  const copy = new Set(prev);
                  if (copy.has(rider.id)) copy.delete(rider.id); else copy.add(rider.id);
                  return copy;
                });
              };

              return (
                <React.Fragment key={rider.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={toggle} className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 flex-shrink-0">
                          {rider.photoUrl ? (
                            <img className="h-10 w-10 rounded-full ring-2 ring-purple-200" src={rider.photoUrl} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center ring-2 ring-purple-200">
                              <span className="text-white font-semibold text-xs">
                                {rider.firstName.charAt(0)}{rider.lastName.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-gray-900 truncate">{rider.firstName} {rider.lastName}</span>
                        <span className={`ml-2 text-xs ${isExpanded ? 'text-purple-700' : 'text-gray-400'}`}>{isExpanded ? '▼' : '▶'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getAge(rider.birthDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {nextEvents.length > 0 ? nextEvents.map((entry, idx) => (
                          <span key={entry.event.id + rider.id + idx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.status === RiderEventStatus.TITULAIRE ? 'bg-green-100 text-green-800' :
                            entry.status === RiderEventStatus.PRE_SELECTION ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`} title={entry.event.name}>
                            {entry.event.name}
                          </span>
                        )) : (
                          <span className="text-xs text-gray-500">Aucun à venir</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{titulaireCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{preselectionCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openRiderCalendar(rider)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100">
                        <CalendarDaysIcon className="w-4 h-4 mr-1" /> Calendrier
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3" colSpan={6}>
                        {riderEventEntries.length > 0 ? (
                          <div className="space-y-2">
                            {riderEventEntries.map((entry, idx) => (
                              <div key={entry.event.id + rider.id + idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">{entry.event.name}</div>
                                  <div className="text-xs text-gray-500">{formatEventDateRange(entry.event)} • {entry.event.location}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    entry.status === RiderEventStatus.TITULAIRE ? 'bg-green-100 text-green-800' :
                                    entry.status === RiderEventStatus.PRE_SELECTION ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {entry.status === RiderEventStatus.TITULAIRE ? 'Titulaire' : entry.status === RiderEventStatus.PRE_SELECTION ? 'Pré-sél.' : 'Rempl.'}
                                  </span>
                                  {entry.selection?.riderPreference && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      entry.selection.riderPreference === RiderEventPreference.VEUT_PARTICIPER ? 'bg-green-100 text-green-800' :
                                      entry.selection.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES ? 'bg-blue-100 text-blue-800' :
                                      entry.selection.riderPreference === RiderEventPreference.ABSENT || entry.selection.riderPreference === RiderEventPreference.NE_VEUT_PAS ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {entry.selection.riderPreference === RiderEventPreference.VEUT_PARTICIPER ? '👍' : entry.selection.riderPreference === RiderEventPreference.OBJECTIFS_SPECIFIQUES ? '🎯' : entry.selection.riderPreference === RiderEventPreference.ABSENT ? '❌' : entry.selection.riderPreference === RiderEventPreference.NE_VEUT_PAS ? '🚫' : '⏳'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">Aucun événement pour cet athlète</div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Message si aucun athlète trouvé */}
      {filteredRiders.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun athlète trouvé</h3>
          <p className="text-gray-500">
            Essayez de modifier vos critères de recherche ou de filtrage
          </p>
        </div>
      )}
    </div>
  );

  // Rendu de la vue préférences/choix des athlètes
  const renderPreferencesView = () => (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 p-5 sm:p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-emerald-50">
              Choix & disponibilités
            </h2>
            <p className="mt-1.5 text-sm text-emerald-100/75 leading-relaxed max-w-2xl">
              Préférences des coureurs (Mon Calendrier) et confirmation staff avant de figer les titulaires
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-medium text-emerald-200/80">Année</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="all">Toutes</option>
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year === 2026 ? `${year} (Planification)` : year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {renderValidationAlerts()}

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3.5 sm:px-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-emerald-400" />
            Filtrer par préférence
          </h3>
          <select
            value={preferenceFilter}
            onChange={(e) => setPreferenceFilter(e.target.value as 'all' | 'wants' | 'objectives' | 'unavailable' | 'waiting')}
            className="rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="all">Toutes les préférences</option>
            <option value="wants">Veut participer</option>
            <option value="objectives">Objectifs spécifiques</option>
            <option value="unavailable">Indisponible (absent ou ne veut pas)</option>
            <option value="waiting">En attente</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl shadow-black/25 overflow-hidden max-w-full">
        <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-700 to-teal-700">
          <h3 className="text-lg font-semibold text-white tracking-tight">Tableau des préférences</h3>
          <p className="text-emerald-100/90 text-sm mt-0.5">
            {filteredRiders.length} athlète{filteredRiders.length !== 1 ? 's' : ''} × {displayEvents.length} événement{displayEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="overflow-x-auto p-3 sm:p-4" style={{ maxWidth: 'calc(100vw - 400px)' }}>
          <table className="min-w-full border-separate border-spacing-y-2 border-spacing-x-2">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 rounded-xl bg-slate-800/95 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300 border border-white/10 shadow-md">
                  Athlète
                </th>
                {displayEvents.map(event => {
                  const validation = eventValidations[event.id];
                  return (
                    <th
                      key={event.id}
                      className="rounded-xl bg-slate-800/80 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 min-w-[168px] border border-white/10"
                    >
                      <div className="flex flex-col items-center gap-1.5 normal-case tracking-normal">
                        <div className="font-semibold text-sm text-slate-100 leading-snug">{event.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{formatEventDateRange(event)}</div>
                        {validation && !validation.isComplete && (
                          <span className="text-[10px] font-medium text-amber-100 bg-amber-500/25 border border-amber-400/30 px-2 py-0.5 rounded-full">
                            {validation.attentionRiders.length} à traiter
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredRiders.map((rider) => (
                <tr key={rider.id}>
                  <td className="sticky left-0 z-10 rounded-xl px-4 py-3 text-sm font-semibold text-slate-50 border border-white/10 shadow-md align-middle bg-slate-900">
                    {rider.firstName} {rider.lastName}
                  </td>
                  {displayEvents.map(event => {
                    const pref = getRiderEventPreference(event.id, rider.id);
                    const selection = resolveRiderEventSelection(event, rider.id, riderEventSelections);
                    const issues = selection.status && selection.status !== RiderEventStatus.NON_RETENU
                      ? analyzeRiderEventIssues(selection)
                      : [];
                    const color = pref === RiderEventPreference.VEUT_PARTICIPER
                      ? 'bg-emerald-500/25 text-emerald-100 border-emerald-400/35'
                      : pref === RiderEventPreference.OBJECTIFS_SPECIFIQUES
                        ? 'bg-sky-500/25 text-sky-100 border-sky-400/35'
                        : pref === RiderEventPreference.EN_ATTENTE
                          ? 'bg-slate-500/30 text-slate-200 border-white/15'
                          : pref === RiderEventPreference.ABSENT || pref === RiderEventPreference.NE_VEUT_PAS
                            ? 'bg-rose-500/25 text-rose-100 border-rose-400/35'
                            : 'bg-slate-800/80 text-slate-400 border-white/10';
                    const label = pref === RiderEventPreference.VEUT_PARTICIPER ? 'Veut'
                      : pref === RiderEventPreference.OBJECTIFS_SPECIFIQUES ? 'Objectifs'
                      : pref === RiderEventPreference.ABSENT ? 'Absent'
                      : pref === RiderEventPreference.NE_VEUT_PAS ? 'Refus'
                      : pref === RiderEventPreference.EN_ATTENTE ? 'Attente'
                      : '—';
                    const isEngaged = selection.status && selection.status !== RiderEventStatus.NON_RETENU;
                    return (
                      <td key={event.id} className="p-0 align-middle min-w-[160px]">
                        <div
                          className={`rounded-2xl border px-3 py-3 space-y-2 shadow-sm transition-colors ${
                            issues.length > 0
                              ? 'border-amber-400/35 bg-amber-950/35'
                              : 'border-white/10 bg-slate-800/55 hover:bg-slate-800/80'
                          }`}
                        >
                          <div className={`inline-flex w-full items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${color}`}>
                            {label}
                          </div>
                          {isEngaged && renderAvailabilitySelect(event.id, rider.id, true)}
                          {issues.length > 0 && (
                            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-amber-200">
                              <span aria-hidden>⚠</span>
                              <span>{issues.length}</span>
                            </div>
                          )}
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
    </div>
  );

  // Rendu de la vue d'ensemble
  const renderOverviewView = () => (
    <div className="space-y-4">
      {/* Barre d’outils compacte */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">Planning de Saison</h2>
            <p className="text-sm text-gray-600">
              {filteredRiders.length} athlètes • {displayEvents.length} événements
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre effectif Équipe 1 / Réserve */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 mr-0.5">Effectif</span>
              {([
                { id: 'all' as const, label: 'Tous', count: rosterCounts.principal + rosterCounts.reserve },
                { id: 'principal' as const, label: 'Équipe 1', count: rosterCounts.principal },
                { id: 'reserve' as const, label: 'Réserve', count: rosterCounts.reserve },
              ]).map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setTeamRosterFilter(role.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border inline-flex items-center gap-1.5 ${
                    teamRosterFilter === role.id
                      ? role.id === 'principal'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : role.id === 'reserve'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-slate-800 text-white border-slate-800'
                      : role.id === 'principal'
                        ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'
                        : role.id === 'reserve'
                          ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {role.label}
                  <span
                    className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      teamRosterFilter === role.id ? 'bg-white/20' : 'bg-white/80 text-gray-600'
                    }`}
                  >
                    {role.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Année */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              aria-label="Année"
            >
              <option value="all">Toutes les années</option>
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year === 2026 ? `${year} (Planification)` : year}
                </option>
              ))}
            </select>

            {/* Passés */}
            <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={hidePastEvents}
                onChange={(e) => setHidePastEvents(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Masquer passés</span>
            </label>

            {/* Vue */}
            <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Vue tableau"
              >
                <TableCellsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Vue calendrier"
              >
                <CalendarDaysIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Densité tableau */}
            <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 bg-white rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={compactTable}
                onChange={(e) => setCompactTable(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Compact</span>
            </label>

            {/* Actions (repliées) */}
            <button
              type="button"
              onClick={() => setShowActions(v => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showActions ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              aria-expanded={showActions}
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
              Actions
            </button>
          </div>
        </div>

        {showActions && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  filteredRiders.forEach(rider => {
                    displayEvents.forEach(event => {
                      const selection = riderEventSelections.find(sel => 
                        sel.riderId === rider.id && sel.eventId === event.id
                      );
                      if (selection?.riderPreference === RiderEventPreference.VEUT_PARTICIPER) {
                        addRiderToEvent(event.id, rider.id, RiderEventStatus.PRE_SELECTION);
                      }
                    });
                  });
                }}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                ✓ Auto-sélection
              </button>
              
              <button
                onClick={() => {
                  filteredRiders.forEach(rider => {
                    displayEvents.forEach(event => {
                      const selection = riderEventSelections.find(sel => 
                        sel.riderId === rider.id && sel.eventId === event.id
                      );
                      if (!selection?.riderPreference) {
                        updateRiderPreference(event.id, rider.id, RiderEventPreference.EN_ATTENTE);
                      }
                    });
                  });
                }}
                className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
              >
                ⏳ Marquer en attente
              </button>
              
              <button
                onClick={() => setPreferenceFilter('wants')}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                👁️ Voir préférences
              </button>
              
              <button
                onClick={() => {
                  const data = {
                    riders: filteredRiders.map(rider => ({
                      nom: `${rider.firstName} ${rider.lastName}`,
                      selections: displayEvents.map(event => {
                        const selection = riderEventSelections.find(sel => 
                          sel.riderId === rider.id && sel.eventId === event.id
                        );
                        return {
                          evenement: event.name,
                          preference: selection?.riderPreference || 'Aucune',
                          statut: selection?.status || 'Non sélectionné'
                        };
                      })
                    }))
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `selections-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                }}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                📥 Exporter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section de filtres et recherche */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center">
            <FunnelIcon className="w-5 h-5 mr-2 text-blue-500" />
            Filtres
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showFilters ? <ChevronUpIcon className="w-4 h-4 mr-1" /> : <ChevronDownIcon className="w-4 h-4 mr-1" />}
            {showFilters ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        
        {showFilters && (
          <div className="space-y-3">
            {/* Première ligne: Recherche */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Recherche</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nom de l'athlète..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Deuxième ligne: Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtre par genre */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Genre</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Tous</option>
                  <option value="male">Hommes</option>
                  <option value="female">Femmes</option>
                </select>
              </div>
              
              {/* Filtre par catégorie d'âge */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
                <select
                  value={ageCategoryFilter}
                  onChange={(e) => setAgeCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Toutes</option>
                  <option value="U23">U23</option>
                  <option value="Elite">Elite</option>
                  <option value="Master">Master</option>
                </select>
              </div>
              
              {/* Filtre par type de course */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={raceTypeFilter}
                  onChange={(e) => setRaceTypeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Tous les types</option>
                  <option value="uci">🌍 UCI</option>
                  <option value="championnat">🏆 Championnat</option>
                  <option value="coupe-france">🇫🇷 Coupe de France</option>
                  <option value="federal">🚴 Fédéral</option>
                </select>
              </div>
              
              {/* Filtre par préférence */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Préférence</label>
                <select
                  value={preferenceFilter}
                  onChange={(e) => setPreferenceFilter(e.target.value as 'all' | 'wants' | 'objectives' | 'unavailable' | 'waiting')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Toutes</option>
                  <option value="wants">Veut participer</option>
                  <option value="objectives">Objectifs spécifiques</option>
                  <option value="unavailable">Indisponible</option>
                  <option value="waiting">En attente</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Tableau principal */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-full">
        <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/40">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <TableCellsIcon className="w-4 h-4 text-blue-600" />
            Tableau de sélections
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {filteredRiders.length} coureur{filteredRiders.length !== 1 ? 's' : ''} × {displayEvents.length} événement{displayEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="overflow-x-auto w-full max-w-full overscroll-contain">
          <table className="min-w-full border-separate border-spacing-0 divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Colonne Athlète avec tri */}
                <th className={`sticky left-0 top-0 z-50 min-w-[18rem] w-[18rem] bg-gray-50 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 shadow-[4px_0_16px_-6px_rgba(0,0,0,0.25)] ${compactTable ? 'py-3' : 'py-4'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <UserGroupIcon className="h-4 w-4" />
                      <span>Nom / Prénom</span>
                    </div>
                    
                    {/* Boutons de tri pour nom et prénom */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSort('lastName')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'lastName' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600'
                        }`}
                      >
                        Nom
                        {sortField === 'lastName' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleSort('firstName')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'firstName' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600'
                        }`}
                      >
                        Prénom
                        {sortField === 'firstName' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </div>
                    
                    {/* Boutons de tri secondaires */}
                    <div className="flex space-x-2 pt-1 border-t border-gray-200">
                      <button
                        onClick={() => handleSort('age')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'age' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        Âge
                        {sortField === 'age' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleSort('profile')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'profile' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        Profil
                        {sortField === 'profile' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleSort('raceDays')}
                        className={`text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          sortField === 'raceDays' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        Jours de course
                        {sortField === 'raceDays' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </th>
                
                {/* Colonnes dynamiques pour chaque événement */}
                {displayEvents.map(event => {
                  const eventDate = new Date(event.date);
                  const isPlanningYear = getEventYear(event.date) === 2026;
                  const eventSelections = riderEventSelections.filter(sel => sel.eventId === event.id);
                  const selectedCount = getSelectedRidersCount(event.id);
                  const withinLimits = isWithinLimits(event.id);
                  const riderIdsInSelections = new Set(eventSelections.map(s => s.riderId));
                  // Titulaires : depuis riderEventSelections + coureurs dans event.selectedRiderIds sans entrée sélection
                  const titulairesFromSelections = eventSelections
                    .filter(sel => sel.status === RiderEventStatus.TITULAIRE)
                    .map(sel => {
                      const rider = riders.find(r => r.id === sel.riderId);
                      return rider ? `${rider.firstName} ${rider.lastName}` : null;
                    })
                    .filter((name): name is string => name !== null);
                  const titulairesFromEventOnly = (event.selectedRiderIds || [])
                    .filter(id => !riderIdsInSelections.has(id))
                    .map(riderId => {
                      const rider = riders.find(r => r.id === riderId);
                      return rider ? `${rider.firstName} ${rider.lastName}` : null;
                    })
                    .filter((name): name is string => name !== null);
                  const titulaires = [...titulairesFromSelections, ...titulairesFromEventOnly];
                  
                  return (
                    <th
                      key={event.id}
                      className={`px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-l border-gray-200 ${
                        compactTable ? 'py-3 min-w-[200px]' : 'py-4 min-w-[240px]'
                      }`}
                    >
                      <div className={`flex flex-col items-center ${compactTable ? 'gap-1.5' : 'space-y-2'}`}>
                        <div className={`font-bold ${compactTable ? 'text-xs' : 'text-sm'} ${isPlanningYear ? 'text-blue-600' : 'text-gray-700'}`}>
                          {event.name}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {formatEventDateRange(event)}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-center">
                          {event.minRiders || event.maxRiders ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              withinLimits ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {event.minRiders || 0}-{event.maxRiders || '∞'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}

                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            withinLimits ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedCount}
                          </span>
                        </div>

                        {!compactTable && titulaires.length > 0 && (
                          <div className="w-full mt-2 pt-2 border-t border-gray-200">
                            <div className="text-xs font-semibold text-green-700 mb-1">
                              Titulaires ({titulaires.length})
                            </div>
                            <div className="max-h-32 overflow-y-auto text-left space-y-1">
                              {titulaires.map((name, index) => (
                                <div key={index} className="text-xs text-gray-700 bg-green-50 px-2 py-1 rounded">
                                  • {name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
                
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(
                teamRosterFilter === 'all' &&
                rosterSplit.principal.length > 0 &&
                rosterSplit.reserve.length > 0
                  ? ([
                      {
                        kind: 'header' as const,
                        key: 'hdr-equipe1',
                        label: 'Équipe 1',
                        count: rosterSplit.principal.length,
                        accent: 'blue' as const,
                      },
                      ...rosterSplit.principal.map((rider) => ({ kind: 'rider' as const, rider })),
                      {
                        kind: 'header' as const,
                        key: 'hdr-reserve',
                        label: 'Réserve',
                        count: rosterSplit.reserve.length,
                        accent: 'amber' as const,
                      },
                      ...rosterSplit.reserve.map((rider) => ({ kind: 'rider' as const, rider })),
                    ])
                  : filteredRiders.map((rider) => ({ kind: 'rider' as const, rider }))
              ).map((row, index) => {
                if (row.kind === 'header') {
                  return (
                    <tr
                      key={row.key}
                      className={row.accent === 'blue' ? 'bg-blue-500/15' : 'bg-amber-500/15'}
                    >
                      <td
                        colSpan={displayEvents.length + 1}
                        className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-y ${
                          row.accent === 'blue'
                            ? 'bg-blue-950 text-blue-200 border-blue-800/40'
                            : 'bg-amber-950 text-amber-200 border-amber-800/40'
                        }`}
                      >
                        {row.label}
                        <span className="ml-2 font-semibold normal-case tracking-normal opacity-80">
                          · {row.count} athlète{row.count !== 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  );
                }
                const rider = row.rider;
                const raceDays = getRiderRaceDays(rider.id);
                const preselections = getRiderPreselections(rider.id);
                const age = getAge(rider.birthDate);
                const profileLabel =
                  rider.qualitativeProfile === RiderQualitativeProfile.GRIMPEUR
                    ? 'Grimpeur'
                    : rider.qualitativeProfile === RiderQualitativeProfile.ROULEUR
                      ? 'Rouleur'
                      : rider.qualitativeProfile === RiderQualitativeProfile.SPRINTEUR
                        ? 'Sprinteur'
                        : rider.qualitativeProfile === RiderQualitativeProfile.PUNCHEUR
                          ? 'Puncheur'
                          : rider.qualitativeProfile === RiderQualitativeProfile.BAROUDEUR_PROFIL
                            ? 'Baroudeur'
                            : rider.qualitativeProfile === RiderQualitativeProfile.AUTRE
                              ? 'Autre'
                              : null;
                const metaParts = [
                  age != null ? `${age} ans` : null,
                  rider.weightKg && rider.heightCm
                    ? `${rider.weightKg} kg · ${rider.heightCm} cm`
                    : rider.weightKg
                      ? `${rider.weightKg} kg`
                      : rider.heightCm
                        ? `${rider.heightCm} cm`
                        : null,
                  profileLabel,
                ].filter(Boolean);
                const raceDaysLabel = `${raceDays} j. course${preselections > 0 ? ` · ${preselections} pré-sél.` : ''}`;

                const stickyCellBg = index % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950';
                const rowBg = index % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900';

                return (
                  <tr key={rider.id} className={`group hover:bg-indigo-950/50 transition-colors duration-150 ${rowBg}`}>
                    {/* Colonnes fixes pour les informations de base */}
                    <td
                      className={`sticky left-0 z-20 min-w-[18rem] w-[18rem] px-4 text-sm font-medium text-white border-r border-white/10 align-middle shadow-[4px_0_16px_-6px_rgba(0,0,0,0.65)] group-hover:bg-indigo-950 ${stickyCellBg} ${compactTable ? 'py-2' : 'py-3'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 ${compactTable ? 'h-9 w-9' : 'h-10 w-10'}`}>
                          {rider.photoUrl ? (
                            <img
                              className={`${compactTable ? 'h-9 w-9' : 'h-10 w-10'} rounded-full object-cover ring-2 ring-white/15`}
                              src={rider.photoUrl}
                              alt=""
                            />
                          ) : (
                            <div
                              className={`${compactTable ? 'h-9 w-9' : 'h-10 w-10'} rounded-full bg-indigo-500 flex items-center justify-center ring-2 ring-white/15`}
                            >
                              <span className="text-white font-semibold text-xs">
                                {rider.firstName.charAt(0)}
                                {rider.lastName.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-semibold text-white leading-tight">
                              {rider.firstName} {rider.lastName}
                            </p>
                            <span className="flex shrink-0 items-center gap-0.5 -mt-0.5">
                              <button
                                type="button"
                                onClick={() => openRiderCalendar(rider)}
                                className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-white/5 rounded-md transition-colors"
                                title="Calendrier"
                              >
                                <CalendarDaysIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openRiderProfile(rider)}
                                className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-white/5 rounded-md transition-colors"
                                title="Profil"
                              >
                                <EyeIcon className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          </div>
                          {metaParts.length > 0 && (
                            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                              {metaParts.join(' · ')}
                            </p>
                          )}
                          <p className="mt-1 text-center text-[11px] font-medium text-slate-300 leading-snug">
                            {raceDaysLabel}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Colonnes dynamiques pour chaque événement */}
                    {displayEvents.map(event => {
                      const riderSelection = riderEventSelections.find(sel => sel.eventId === event.id && sel.riderId === rider.id);
                      const riderStatus = riderSelection?.status || null;
                      const riderPreference = riderSelection?.riderPreference || null;
                      const riderAvailability = riderSelection?.talentAvailability || null;
                      const withinLimits = isWithinLimits(event.id);
                      const selectedCount = getSelectedRidersCount(event.id);
                      const maxRiders = event.maxRiders;
                      
                      const isSelected = riderStatus !== null;
                      const isTitulaire = riderStatus === RiderEventStatus.TITULAIRE;
                      const isPreselection = riderStatus === RiderEventStatus.PRE_SELECTION;
                      const isRemplacant = riderStatus === RiderEventStatus.REMPLACANT;
                      
                      return (
                        <td key={event.id} className={`px-2 text-center text-sm ${
                          compactTable ? 'py-2 min-w-[120px]' : 'py-3 min-w-[140px]'
                        }`}>
                          <div
                            className={`rounded-2xl border px-2.5 py-2.5 shadow-sm ${compactTable ? 'space-y-1.5' : 'space-y-2'} ${
                              !withinLimits
                                ? 'border-rose-400/30 bg-rose-950/40'
                                : 'border-white/10 bg-slate-800/50 hover:bg-slate-800/75'
                            }`}
                          >
                            
                            {/* Interface simplifiée pour les sélections */}
                            <div className="space-y-2">
                              {/* Statut actuel */}
                              {!compactTable && riderStatus && (
                                <div className={`text-xs px-2.5 py-1 rounded-full text-center font-medium ${
                                  riderStatus === RiderEventStatus.TITULAIRE ? 'bg-emerald-500/25 text-emerald-200' :
                                  riderStatus === RiderEventStatus.PRE_SELECTION ? 'bg-blue-500/25 text-blue-200' :
                                  riderStatus === RiderEventStatus.REMPLACANT ? 'bg-amber-500/25 text-amber-200' :
                                  'bg-white/10 text-slate-200'
                                }`}>
                                  {riderStatus === RiderEventStatus.TITULAIRE ? 'Titulaire' :
                                   riderStatus === RiderEventStatus.PRE_SELECTION ? 'Pré-sélection' :
                                   riderStatus === RiderEventStatus.REMPLACANT ? 'Remplaçant' : riderStatus}
                                </div>
                              )}
                              
                              {/* Sélecteur principal - Statut */}
                              <select
                                value={riderStatus || ''}
                                onChange={(e) => {
                                  const newStatus = e.target.value as RiderEventStatus;
                                  if (newStatus) {
                                    addRiderToEvent(event.id, rider.id, newStatus);
                                  } else {
                                    removeRiderFromEvent(event.id, rider.id);
                                  }
                                }}
                                className={`text-xs px-2 py-1.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-full ${
                                  maxRiders && selectedCount >= maxRiders && !isSelected
                                    ? 'border-rose-400/40 bg-rose-500/15 text-rose-100'
                                    : 'border-white/15 bg-slate-950/80 text-slate-100'
                                }`}
                                disabled={maxRiders && selectedCount >= maxRiders && !isSelected}
                              >
                                <option value="">Non sélectionné</option>
                                <option value={RiderEventStatus.PRE_SELECTION}>Pré-sélection</option>
                                <option value={RiderEventStatus.TITULAIRE}>Titulaire</option>
                                <option value={RiderEventStatus.REMPLACANT}>Remplaçant</option>
                              </select>
                              
                              {/* Indicateur de limite */}
                              {!compactTable && maxRiders && (
                                <div className="text-xs text-slate-400">
                                  {selectedCount}/{maxRiders} coureurs
                                </div>
                              )}
                              
                              {/* Préférence de l'athlète */}
                              <select
                                value={riderPreference || ''}
                                onChange={(e) => {
                                  const newPreference = e.target.value as RiderEventPreference;
                                  if (newPreference) {
                                    updateRiderPreference(event.id, rider.id, newPreference);
                                  }
                                }}
                                className="text-xs px-2 py-1.5 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-full bg-slate-950/80 text-slate-100"
                              >
                                <option value="">Préférence</option>
                                <option value={RiderEventPreference.VEUT_PARTICIPER}>👍 Veut participer</option>
                                <option value={RiderEventPreference.OBJECTIFS_SPECIFIQUES}>🎯 Objectifs spécifiques</option>
                                <option value={RiderEventPreference.ABSENT}>❌ Absent</option>
                                <option value={RiderEventPreference.NE_VEUT_PAS}>🚫 Ne veut pas</option>
                                <option value={RiderEventPreference.EN_ATTENTE}>⏳ En attente</option>
                              </select>

                              {isSelected && renderAvailabilitySelect(event.id, rider.id)}
                              {isSelected && renderCellIssues(event.id, rider.id)}
                            </div>
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

      {/* Message si aucun événement futur */}
      {displayEvents.length === 0 && (
        <div className="bg-amber-950/50 border border-amber-500/30 rounded-2xl p-6 text-center">
          <CalendarDaysIcon className="w-12 h-12 mx-auto text-amber-300 mb-4" />
          <h3 className="text-lg font-medium text-amber-100 mb-2">Aucun événement futur trouvé</h3>
          <p className="text-amber-200/90 mb-4">
            Il n'y a actuellement aucun événement de course planifié pour les prochains mois.
          </p>
          <div className="text-sm text-amber-200/80">
            <p>Pour ajouter des événements :</p>
            <p>1. Allez dans la section &quot;Calendrier&quot;</p>
            <p>2. Cliquez sur &quot;Ajouter Événement&quot;</p>
            <p>3. Créez vos événements avec des dates futures</p>
          </div>
        </div>
      )}
    </div>
  );

  const subViewTabs = [
    { id: 'overview' as const, label: 'Grille', icon: TableCellsIcon },
    { id: 'rider-detail' as const, label: 'Par coureur', icon: UserGroupIcon },
    { id: 'preferences' as const, label: 'Choix & dispo', icon: StarIcon },
  ];

  const content = (
    <>
      <div className="mb-4">{renderValidationAlerts()}</div>
      <div className="mb-4 flex justify-center">
        <nav className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-slate-950/60 p-1.5 shadow-inner shadow-black/20" aria-label="Sous-onglets planning">
          {subViewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-900/40'
                    : 'bg-transparent text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {activeView === 'overview' ? (
        viewMode === 'calendar' ? renderCalendarView() : renderOverviewView()
      ) : activeView === 'rider-detail' ? (
        renderRiderDetailView()
      ) : activeView === 'preferences' ? (
        renderPreferencesView()
      ) : null}
    </>
  );

  return embedded ? content : (
    <SectionWrapper
      title="Planning de Saison"
      actionButton={
        <ActionButton onClick={() => console.log('Add event')} icon={<CalendarDaysIcon className="w-5 h-5"/>}>
          Ajouter événement
        </ActionButton>
      }
    >
      {content}
    </SectionWrapper>
  );
}
