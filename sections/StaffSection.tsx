import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserGroupIcon, 
  CalendarDaysIcon,
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  TruckIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MapPinIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { StaffMember, RaceEvent, User, AppState, StaffRole, StaffStatus, ContractType, StaffArchive, StaffTransition, StaffEventSelection, MeetingReport, MeetingRecurrence, EventTransportLeg } from '../types';
import { getCurrentSeasonYear, getAvailableSeasonYears } from '../utils/seasonUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getActiveStaffForCurrentSeason } from '../utils/rosterArchiveUtils';
import { getStaffRoleDisplayLabel, getStaffRoleKey, STAFF_ROLE_KEYS, getEventRoleKeyForStaff, EVENT_ROLE_KEYS, type StaffRoleKeyString } from '../utils/staffRoleUtils';
import {
  normalizeStaffStatusKey,
  getStaffStatusLabel,
  getStaffStatusBadgeClass,
  compareStaffByStatus,
  staffMatchesEmploymentStatus,
  STAFF_STATUS_KEYS,
  type StaffStatusKey,
} from '../utils/staffStatusUtils';
import { 
  getStaffStatsForSeason, 
  getDetailedStaffStatsForSeason,
  calculateStaffDaysForSeason 
} from '../utils/staffRosterUtils';
import { saveData } from '../services/firebaseService';
import { StaffTransitionManager, StaffArchiveViewer, StaffArchiveDetailModal, StaffSeasonPlanning } from '../components';
import StaffSearchTab from '../components/StaffSearchTab';
import { getGlobalRecruitableStaff } from '../utils/independentUtils';
import { useTranslations } from '../hooks/useTranslations';

interface StaffSectionProps {
  staff: StaffMember[];
  raceEvents: RaceEvent[];
  currentUser: User;
  appState: AppState;
  onSave?: (staff: StaffMember) => void;
  onDelete?: (staff: StaffMember) => void;
  onSaveMeetingReport?: (report: MeetingReport) => void;
  onDeleteMeetingReport?: (report: MeetingReport) => void;
  onStaffTransition?: (archive: StaffArchive, transition: StaffTransition) => void;
  staffEventSelections?: StaffEventSelection[];
  setStaffEventSelections?: (updater: React.SetStateAction<StaffEventSelection[]>) => void;
  effectivePermissions?: any;
  eventStaffAvailabilities?: any[];
  eventBudgetItems?: any[];
  setEventBudgetItems?: any;
  team?: any;
  performanceEntries?: any[];
  missions?: any[];
  teams?: any[];
  users?: any[];
  permissionRoles?: any[];
  vehicles?: any[];
  eventTransportLegs?: any[];
  onSaveRaceEvent?: any;
  navigateTo?: (section: any, eventId?: string) => void;
}

/** Calendrier des déplacements : timeline chronologique, prochain événement mis en avant, passés repliés. */
function StaffMemberTravelCalendar({
  staffMember,
  raceEvents,
  eventTransportLegs,
  onOpenEvent,
}: {
  staffMember: StaffMember;
  raceEvents: RaceEvent[];
  eventTransportLegs: EventTransportLeg[];
  vehicles?: { id?: string; name?: string }[];
  onOpenEvent?: (eventId: string) => void;
}) {
  const currentYear = getCurrentSeasonYear();
  const [showPast, setShowPast] = useState(false);

  const eventsForStaff = useMemo(() => (raceEvents || []).filter((e) => {
    const eventYear = e.date ? new Date(e.date + 'T12:00:00Z').getFullYear() : null;
    if (eventYear !== currentYear) return false;
    if (e.selectedStaffIds?.includes(staffMember.id)) return true;
    const roleKeys = ['managerId', 'directeurSportifId', 'assistantId', 'mecanoId', 'kineId', 'medecinId', 'respPerfId', 'entraineurId', 'dataAnalystId', 'prepaPhysiqueId', 'communicationId'];
    return roleKeys.some((key) => {
      const arr = (e as unknown as Record<string, unknown>)[key];
      return Array.isArray(arr) && arr.includes(staffMember.id);
    });
  }), [raceEvents, staffMember.id, currentYear]);

  const legsForStaffCurrentYear = useMemo(() => (eventTransportLegs || []).filter((leg) => {
    const legYear = leg.departureDate ? new Date(leg.departureDate + 'T12:00:00Z').getFullYear() : currentYear;
    if (legYear !== currentYear) return false;
    return leg.driverId === staffMember.id || (leg.occupants || []).some((o) => o.type === 'staff' && o.id === staffMember.id);
  }), [eventTransportLegs, staffMember.id, currentYear]);

  const tripItems = useMemo(() => {
    const seen = new Set<string>();
    const items: { event: RaceEvent; legs: EventTransportLeg[]; sortDate: string }[] = [];

    const pushEvent = (event: RaceEvent) => {
      if (!event?.id || seen.has(event.id)) return;
      seen.add(event.id);
      items.push({
        event,
        legs: legsForStaffCurrentYear.filter((l) => l.eventId === event.id),
        sortDate: event.date || '',
      });
    };

    eventsForStaff.forEach(pushEvent);
    legsForStaffCurrentYear.forEach((leg) => {
      if (seen.has(leg.eventId)) return;
      const event = raceEvents.find((e) => e.id === leg.eventId);
      if (event) pushEvent(event);
    });

    return items.sort((a, b) => a.sortDate.localeCompare(b.sortDate));
  }, [eventsForStaff, legsForStaffCurrentYear, raceEvents]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = tripItems.filter((t) => (t.event.date || '') >= today);
  const past = tripItems.filter((t) => (t.event.date || '') < today);
  const nextTrip = upcoming[0];
  const totalLegs = legsForStaffCurrentYear.length;

  const formatLegShort = (leg: EventTransportLeg) => {
    const dir = String(leg.direction || '');
    const shortDir = dir.includes('Aller') ? 'Aller' : dir.includes('Retour') ? 'Retour' : dir.includes('Jour') ? 'Jour J' : dir;
    const dateStr = leg.departureDate
      ? format(new Date(leg.departureDate + 'T12:00:00Z'), 'd MMM', { locale: fr })
      : null;
    return { shortDir, dateStr, isDriver: leg.driverId === staffMember.id };
  };

  const renderTripCard = (item: typeof tripItems[0], options?: { highlight?: boolean; compact?: boolean }) => {
    const { event, legs } = item;
    const isPast = (event.date || '') < today;
    const eventDate = event.date ? new Date(event.date + 'T12:00:00Z') : null;
    const isHighlight = options?.highlight;

    return (
      <div
        key={event.id}
        className={`relative rounded-xl border transition-all ${
          isHighlight
            ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-white shadow-sm ring-1 ring-blue-100'
            : isPast
            ? 'border-gray-100 bg-gray-50/60'
            : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm'
        }`}
      >
        {isHighlight && (
          <span className="absolute -top-2 left-3 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold uppercase tracking-wide">
            Prochain
          </span>
        )}
        <button
          type="button"
          onClick={() => onOpenEvent?.(event.id)}
          className="w-full flex items-start gap-3 px-3 py-3 text-left group"
        >
          <div className={`shrink-0 w-12 text-center rounded-lg py-1.5 mt-0.5 ${
            isHighlight ? 'bg-blue-600 text-white' : isPast ? 'bg-gray-100' : 'bg-blue-50'
          }`}>
            <div className={`text-base font-bold leading-none ${isHighlight ? 'text-white' : isPast ? 'text-gray-600' : 'text-blue-700'}`}>
              {eventDate ? format(eventDate, 'd', { locale: fr }) : '–'}
            </div>
            <div className={`text-[10px] uppercase mt-0.5 ${isHighlight ? 'text-blue-100' : isPast ? 'text-gray-400' : 'text-blue-500'}`}>
              {eventDate ? format(eventDate, 'MMM', { locale: fr }) : ''}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold leading-snug ${isPast ? 'text-gray-700' : 'text-gray-900 group-hover:text-blue-700'}`}>
              {event.name || 'Sans nom'}
            </p>
            {event.location && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <MapPinIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </p>
            )}
            {event.endDate && event.endDate !== event.date && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                {format(new Date(event.date + 'T12:00:00Z'), 'd MMM', { locale: fr })}
                {' → '}
                {format(new Date(event.endDate + 'T12:00:00Z'), 'd MMM yyyy', { locale: fr })}
              </p>
            )}
            {legs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {legs.map((leg) => {
                  const { shortDir, dateStr, isDriver } = formatLegShort(leg);
                  return (
                    <span
                      key={leg.id}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isDriver ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <TruckIcon className="w-3 h-3" />
                      {shortDir}{dateStr && ` ${dateStr}`}
                      {isDriver && ' · Cond.'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col items-center gap-0.5 pt-1">
            <ChevronRightIcon className={`w-4 h-4 ${isPast ? 'text-gray-300' : 'text-gray-400 group-hover:text-blue-500'}`} />
            <span className="text-[9px] text-gray-400 group-hover:text-blue-500">Fiche</span>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
            Saison {currentYear}
          </h4>
          {tripItems.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {upcoming.length} à venir
              {past.length > 0 && ` · ${past.length} passé${past.length > 1 ? 's' : ''}`}
              {totalLegs > 0 && ` · ${totalLegs} trajet${totalLegs > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        {past.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPast(!showPast)}
            className="text-xs font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1 shrink-0"
          >
            {showPast ? 'Masquer passés' : `Voir passés (${past.length})`}
            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showPast ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {tripItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
          <CalendarDaysIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Aucun déplacement assigné.</p>
          <p className="text-xs text-gray-400 mt-1">Les événements où ce membre est staff apparaîtront ici.</p>
        </div>
      ) : upcoming.length === 0 && !showPast ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-center">
          <p className="text-sm text-gray-600">Plus d&apos;événement à venir cette saison.</p>
          <button type="button" onClick={() => setShowPast(true)} className="text-xs text-blue-600 hover:underline mt-2">
            Voir les {past.length} événement{past.length > 1 ? 's' : ''} passé{past.length > 1 ? 's' : ''}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Timeline à venir */}
          {upcoming.length > 0 && (
            <div className="relative pl-1">
              {upcoming.length > 1 && (
                <div className="absolute left-[1.4rem] top-8 bottom-4 w-px bg-blue-100" aria-hidden />
              )}
              <div className="space-y-2">
                {upcoming.map((item, idx) => renderTripCard(item, { highlight: idx === 0 && item.event.id === nextTrip?.event.id }))}
              </div>
            </div>
          )}

          {/* Passés repliés */}
          {showPast && past.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Passés</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {past.map((item) => renderTripCard(item, { compact: true }))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && onOpenEvent && (
            <button
              type="button"
              onClick={() => onOpenEvent(upcoming[0].event.id)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-blue-200 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <ArrowRightIcon className="w-3.5 h-3.5" />
              Ouvrir le prochain événement
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function StaffSection({ 
  staff = [], 
  raceEvents = [], 
  currentUser,
  appState,
  onSave,
  onDelete,
  onSaveMeetingReport,
  onDeleteMeetingReport,
  onStaffTransition,
  staffEventSelections = [],
  setStaffEventSelections,
  effectivePermissions,
  eventStaffAvailabilities,
  eventBudgetItems,
  setEventBudgetItems,
  team,
  performanceEntries,
  missions,
  teams,
  users,
  permissionRoles,
  vehicles,
  eventTransportLegs,
  onSaveRaceEvent
  ,navigateTo
}: StaffSectionProps) {
  // Vérification plus permissive pour éviter le blocage
  if (!appState && !staff) {
    return <div>Chargement...</div>;
  }

  // États pour la gestion des onglets
  const [activeTab, setActiveTab] = useState<'staff' | 'workload' | 'planning' | 'archives' | 'meetings' | 'recruitment'>('staff');
  const { t } = useTranslations();
  const [staffListSearch, setStaffListSearch] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'' | StaffStatusKey>('');
  const [staffSortBy, setStaffSortBy] = useState<'name' | 'status' | 'role'>('name');
  const recruitableStaff = useMemo(
    () => getGlobalRecruitableStaff(users || [], staff || []),
    [users, staff]
  );
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentSeasonYear());
  const [staffRoleFilter, setStaffRoleFilter] = useState<StaffRoleKeyString | ''>('');
  
  // États pour les modales
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // États pour le formulaire d'édition
  const [formData, setFormData] = useState<Partial<StaffMember>>({});
  
  // États pour la gestion des effectifs
  const [staffArchives, setStaffArchives] = useState<StaffArchive[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<StaffArchive | null>(null);
  const [isArchiveDetailOpen, setIsArchiveDetailOpen] = useState(false);

  // États pour les comptes rendus de réunions
  const [meetingReports, setMeetingReports] = useState<MeetingReport[]>(() => {
    // Charger depuis appState au montage
    return appState?.meetingReports || [];
  });

  // Synchroniser avec appState quand il change
  useEffect(() => {
    if (appState?.meetingReports) {
      setMeetingReports(appState.meetingReports);
    }
  }, [appState?.meetingReports]);
  const [isMeetingReportModalOpen, setIsMeetingReportModalOpen] = useState(false);
  const [selectedMeetingReport, setSelectedMeetingReport] = useState<MeetingReport | null>(null);
  const [meetingReportForm, setMeetingReportForm] = useState<Partial<MeetingReport>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    organizerId: currentUser?.id || '',
    participantIds: [],
    agenda: '',
    content: '',
    actionItems: [],
  });

  // Obtenir le staff actif pour la saison courante
  const activeStaff = staff && staff.length > 0 ? getActiveStaffForCurrentSeason(staff) : [];
  const seasonYears = useMemo(() => getAvailableSeasonYears(), []);

  const staffTabs = useMemo(() => ([
    { id: 'staff' as const, label: 'Liste', icon: UserGroupIcon, count: activeStaff.length },
    { id: 'workload' as const, label: 'Jours', icon: CalendarDaysIcon },
    { id: 'planning' as const, label: 'Planning', icon: TableCellsIcon },
    { id: 'archives' as const, label: 'Archives', icon: ArchiveBoxIcon },
    { id: 'recruitment' as const, label: t('staffRecruitmentTab'), icon: UserPlusIcon },
    { id: 'meetings' as const, label: 'Réunions', icon: DocumentTextIcon, count: meetingReports.length || undefined },
  ]), [activeStaff.length, meetingReports.length, t]);
  const handleAssignStaffToEvent = (eventId: string, staffId: string, status: any) => {
    try {
      const event = (raceEvents || []).find((e: any) => e.id === eventId);
      if (!event) return;
      const staffMember = (staff || []).find((s: StaffMember) => s.id === staffId);
      const current = new Set<string>(event.selectedStaffIds || []);
      const isAdding = status === 'SELECTIONNE';

      if (isAdding) {
        current.add(staffId);
      } else {
        current.delete(staffId);
      }

      const updatedEvent: Record<string, unknown> = { ...event, selectedStaffIds: Array.from(current) };

      if (isAdding && staffMember) {
        const eventRoleKey = getEventRoleKeyForStaff(staffMember.role);
        if (eventRoleKey) {
          const roleArr = Array.from((event as unknown as Record<string, unknown>)[eventRoleKey] as string[] || []);
          if (!roleArr.includes(staffId)) {
            (updatedEvent as Record<string, unknown>)[eventRoleKey] = [...roleArr, staffId];
          }
        }
      } else if (!isAdding) {
        EVENT_ROLE_KEYS.forEach((key) => {
          const arr = (event as unknown as Record<string, unknown>)[key];
          if (Array.isArray(arr) && arr.includes(staffId)) {
            (updatedEvent as Record<string, unknown>)[key] = arr.filter((id: string) => id !== staffId);
          }
        });
      }

      if (onSaveRaceEvent) {
        onSaveRaceEvent(updatedEvent as Partial<RaceEvent>);
      }
    } catch (e) {
      // Erreur silencieuse - l'assignation a échoué
    }
  };

  // Fonction pour calculer le nombre de jours de staff pour une année donnée
  const getStaffDays = (staffId: string, year: number = selectedYear) => {
    if (!raceEvents || !Array.isArray(raceEvents)) {
      return 0;
    }

    const seasonStart = new Date(year, 0, 1);
    const seasonEnd = year === getCurrentSeasonYear() ? new Date() : new Date(year, 11, 31);
    
    const seasonEvents = raceEvents.filter(event => {
      if (!event || !event.date) return false;
      try {
        const eventDate = new Date(event.date);
        const eventYear = eventDate.getFullYear();
        return eventYear === year && 
               eventDate >= seasonStart && 
               eventDate <= seasonEnd;
    } catch (error) {
        return false;
      }
    });
    
    // Calculer la durée totale des événements où le staff est assigné
    const totalDays = seasonEvents.reduce((total, event) => {
      // Vérifier si le membre du staff est assigné à cet événement
      const isAssigned = event.selectedStaffIds?.includes(staffId) || 
                        Object.values(event).some(value => 
                          Array.isArray(value) && value.includes(staffId)
                        );
      
      if (isAssigned) {
        try {
          // Calculer la durée de l'événement
          const startDate = new Date(event.date + 'T00:00:00Z');
          const endDate = new Date((event.endDate || event.date) + 'T23:59:59Z');
          const eventDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return total + eventDurationDays;
          } catch (error) {
          return total;
        }
      }
      
      return total;
    }, 0);
    
    return totalDays;
  };

  // Fonctions pour les modales
  const openViewModal = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setIsViewModalOpen(true);
  };
  
  const openEditModal = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setFormData({
      ...staffMember,
      address: staffMember.address || {
        streetName: '',
        postalCode: '',
        city: '',
        region: '',
        country: ''
      }
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setIsDeleteModalOpen(true);
  };

  const handleAddStaff = () => {
    setSelectedStaff(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'ASSISTANT',
      status: 'BENEVOLE',
      openToExternalMissions: false,
      skills: [],
      professionalSummary: '',
      address: {
        streetName: '',
        postalCode: '',
        city: '',
        region: '',
        country: ''
      },
      weeklyAvailability: {},
      availability: [],
      workHistory: [],
      education: [],
      languages: [],
      sportswear: [],
      notesGeneral: '',
      isActive: true
    });
    setIsEditModalOpen(true);
  };

  const handleSaveStaff = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Veuillez remplir les champs obligatoires (Nom, Prénom, Email)');
      return;
    }
    
    const staffToSave: StaffMember = {
      ...formData,
      id: selectedStaff?.id || `staff_${Date.now()}`, // ID existant ou nouveau
    } as StaffMember;
    
    if (onSave) {
      onSave(staffToSave);
    }
    setIsEditModalOpen(false);
    setSelectedStaff(null);
    setFormData({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      } as any
    }));
  };

  const handleDeleteStaff = (staffMember: StaffMember) => {
    if (onDelete) {
      onDelete(staffMember);
    }
    setIsDeleteModalOpen(false);
    setSelectedStaff(null);
  };

  // Fonctions pour la gestion des effectifs
  const handleStaffTransition = (archive: StaffArchive, transition: StaffTransition) => {
    // Ajouter l'archive à la liste
    setStaffArchives(prev => [...prev, archive]);
    
    // Notifier le parent si nécessaire
    if (onStaffTransition) {
      onStaffTransition(archive, transition);
    }
  };

  const handleViewArchive = (archive: StaffArchive) => {
    setSelectedArchive(archive);
    setIsArchiveDetailOpen(true);
  };

  // Composant StaffTab - Affichage des jours de staff
  const StaffWorkloadTab = () => {
    // Calculer les statistiques du staff
    const staffStats = useMemo(() => {
      const totalStaff = staff.length;
      const activeStaffCount = staff.filter(member => member.isActive !== false).length;
      const totalStaffDays = staff.reduce((total, member) => total + getStaffDays(member.id, selectedYear), 0);
      const averageStaffDays = totalStaff > 0 ? Math.round(totalStaffDays / totalStaff) : 0;

      return {
        totalStaff,
        activeStaff: activeStaffCount,
        totalStaffDays,
        averageStaffDays
      };
    }, [staff, selectedYear]);

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Jours de travail — {selectedYear}</h3>
            <p className="text-sm text-gray-500">Jours cumulés sur les événements assignés</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 self-start"
          >
            {seasonYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-600 uppercase">Total staff</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{staffStats.totalStaff}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-xs font-medium text-emerald-600 uppercase">Actifs</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{staffStats.activeStaff}</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs font-medium text-orange-600 uppercase">Total jours</p>
            <p className="text-2xl font-bold text-orange-900 mt-1">{staffStats.totalStaffDays}</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs font-medium text-purple-600 uppercase">Moyenne</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">{staffStats.averageStaffDays}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">Détail par membre</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Membre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rôle</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Jours</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(staff || []).map((member) => {
                  if (!member || !member.id) return null;
                  const staffDays = getStaffDays(member.id, selectedYear);
                  return (
                    <tr key={member.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-white">
                              {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</div>
                            <div className="text-xs text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {getStaffRoleDisplayLabel(member.role) || 'staff'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-full text-xs font-semibold ${
                          staffDays === 0 
                            ? 'bg-gray-100 text-gray-500' 
                            : staffDays < 10 
                            ? 'bg-emerald-100 text-emerald-800'
                            : staffDays < 20
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {staffDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStaffStatusBadgeClass(member.status)}`}>
                          {getStaffStatusLabel(member.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ActionButton
                            onClick={() => openViewModal(member)}
                            variant="secondary"
                            size="sm"
                            icon={<EyeIcon className="w-4 h-4" />}
                            title="Voir les détails"
                          />
                          <ActionButton
                            onClick={() => openEditModal(member)}
                            variant="warning"
                            size="sm"
                            icon={<PencilIcon className="w-4 h-4" />}
                            title="Modifier"
                          />
                          <ActionButton
                            onClick={() => openDeleteModal(member)}
                            variant="danger"
                            size="sm"
                            icon={<TrashIcon className="w-4 h-4" />}
                            title="Supprimer"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
                    </div>
          
          {(staff || []).length === 0 && (
            <div className="text-center py-10 px-4">
              <UserGroupIcon className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun membre du staff</h3>
              <p className="mt-1 text-sm text-gray-500">Aucune donnée pour {selectedYear}.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Composant StaffListTab - Liste des membres du staff
  const StaffListTab = () => {
    const filteredStaff = (activeStaff || []).filter((member) => {
      if (staffRoleFilter) {
        const memberRoleKey = getStaffRoleKey(member.role);
        if (memberRoleKey !== staffRoleFilter) return false;
      }
      if (!staffMatchesEmploymentStatus(member.status, staffStatusFilter || 'all')) return false;
      if (staffListSearch) {
        const q = staffListSearch.toLowerCase();
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        return fullName.includes(q) || (member.email || '').toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      if (staffSortBy === 'status') {
        const cmp = compareStaffByStatus(a.status, b.status, 'asc');
        if (cmp !== 0) return cmp;
      } else if (staffSortBy === 'role') {
        const roleA = getStaffRoleDisplayLabel(a.role) || '';
        const roleB = getStaffRoleDisplayLabel(b.role) || '';
        const cmp = roleA.localeCompare(roleB, 'fr');
        if (cmp !== 0) return cmp;
      }
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB, 'fr');
    });

    return (
        <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-gray-900">Membres actifs</h4>
                <p className="text-sm text-gray-500">{filteredStaff.length} membre{filteredStaff.length !== 1 ? 's' : ''} sur {activeStaff.length}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="relative min-w-[200px]">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={staffListSearch}
                    onChange={(e) => setStaffListSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={staffSortBy}
                  onChange={(e) => setStaffSortBy(e.target.value as 'name' | 'status' | 'role')}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 min-w-[140px]"
                >
                  <option value="name">Trier : Nom</option>
                  <option value="status">Trier : Statut</option>
                  <option value="role">Trier : Rôle</option>
                </select>
                <select
                  id="staff-role-filter"
                  value={staffRoleFilter}
                  onChange={(e) => setStaffRoleFilter((e.target.value || '') as StaffRoleKeyString | '')}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                >
                  <option value="">Tous les postes</option>
                  {STAFF_ROLE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {getStaffRoleDisplayLabel(key)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Filtres rapides par statut */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Statut :</span>
              <button
                type="button"
                onClick={() => setStaffStatusFilter('')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  !staffStatusFilter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              {STAFF_STATUS_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStaffStatusFilter(staffStatusFilter === key ? '' : key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    staffStatusFilter === key
                      ? 'ring-2 ring-offset-1 ring-blue-400 ' + getStaffStatusBadgeClass(key)
                      : getStaffStatusBadgeClass(key) + ' opacity-80 hover:opacity-100'
                  }`}
                >
                  {getStaffStatusLabel(key)}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Membre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rôle</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Tél.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map((member) => {
                  if (!member || !member.id) return null;
                  return (
                  <tr key={member.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-white">
                            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</div>
                          <div className="text-xs text-gray-500 truncate">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {getStaffRoleDisplayLabel(member.role) || 'staff'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStaffStatusBadgeClass(member.status)}`}>
                        {getStaffStatusLabel(member.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-700">{member.phone || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <ActionButton
                          onClick={() => openViewModal(member)}
                          variant="secondary"
                          size="sm"
                          icon={<EyeIcon className="w-4 h-4" />}
                          title="Voir les détails"
                        />
                        <ActionButton
                          onClick={() => openEditModal(member)}
                          variant="warning"
                          size="sm"
                          icon={<PencilIcon className="w-4 h-4" />}
                          title="Modifier"
                        />
                        <ActionButton
                          onClick={() => openDeleteModal(member)}
                          variant="danger"
                          size="sm"
                          icon={<TrashIcon className="w-4 h-4" />}
                          title="Supprimer"
                        />
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
      </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-10 px-4">
              <UserGroupIcon className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {staffListSearch || staffRoleFilter || staffStatusFilter ? 'Aucun résultat' : 'Aucun membre du staff'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {staffListSearch
                  ? 'Modifiez votre recherche ou réinitialisez les filtres.'
                  : staffRoleFilter
                  ? `Aucun membre avec le poste « ${getStaffRoleDisplayLabel(staffRoleFilter)} ».`
                  : 'Ajoutez un membre avec le bouton en haut à droite.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Composant ArchivesTab - Gestion des archives des effectifs
  const ArchivesTab = () => {
    return (
      <div className="space-y-6">
        {/* Gestionnaire de transition des effectifs */}
        <StaffTransitionManager
          staff={staff}
          onStaffTransition={handleStaffTransition}
        />
        
        {/* Visualiseur d'archives */}
        <StaffArchiveViewer
          staff={staff}
          archives={staffArchives}
          onViewArchive={handleViewArchive}
        />
      </div>
    );
  };

  // Composant MeetingReportsTab - Gestion des comptes rendus de réunions
  const MeetingReportsTab = () => {
    // Vérification de sécurité
    if (!staff || staff.length === 0) {
      return (
        <div className="text-center py-8">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun membre du staff</h3>
          <p className="mt-1 text-sm text-gray-500">
            Veuillez d'abord ajouter des membres du staff pour créer des comptes rendus.
          </p>
        </div>
      );
    }

    const handleNewMeetingReport = () => {
      const now = new Date();
      const defaultTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      setMeetingReportForm({
        title: '',
        date: now.toISOString().split('T')[0],
        time: defaultTime,
        location: '',
        organizerId: currentUser?.id || '',
        participantIds: [],
        agenda: '',
        content: '',
        actionItems: [],
        recurrence: MeetingRecurrence.NONE,
        isScheduled: true,
      });
      setSelectedMeetingReport(null);
      setIsMeetingReportModalOpen(true);
    };

    const handleEditMeetingReport = (report: MeetingReport) => {
      setSelectedMeetingReport(report);
      const reportDate = new Date(report.date);
      const dateStr = reportDate.toISOString().split('T')[0];
      const timeStr = report.time || '';
      
      setMeetingReportForm({
        title: report.title,
        date: dateStr,
        time: timeStr,
        endTime: report.endTime || '',
        location: report.location || '',
        organizerId: report.organizerId,
        participantIds: report.participantIds || [],
        agenda: report.agenda || '',
        content: report.content,
        actionItems: report.actionItems || [],
        recurrence: report.recurrence || MeetingRecurrence.NONE,
        recurrenceEndDate: report.recurrenceEndDate ? report.recurrenceEndDate.split('T')[0] : '',
        recurrenceCount: report.recurrenceCount,
        isScheduled: report.isScheduled !== undefined ? report.isScheduled : true,
        meetingSeriesId: report.meetingSeriesId,
      });
      setIsMeetingReportModalOpen(true);
    };

    // Fonction pour calculer la prochaine réunion en fonction de la récurrence
    const calculateNextMeetingDate = (report: MeetingReport): string | null => {
      if (!report.recurrence || report.recurrence === MeetingRecurrence.NONE) {
        return null;
      }

      const lastDate = new Date(report.date);
      const now = new Date();
      
      // Si la réunion est dans le futur, retourner cette date
      if (lastDate > now) {
        return report.date;
      }

      let nextDate = new Date(lastDate);
      
      switch (report.recurrence) {
        case MeetingRecurrence.DAILY:
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case MeetingRecurrence.WEEKLY:
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case MeetingRecurrence.BIWEEKLY:
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case MeetingRecurrence.MONTHLY:
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case MeetingRecurrence.QUARTERLY:
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case MeetingRecurrence.YEARLY:
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          return null;
      }

      // Vérifier si la date de fin de récurrence est dépassée
      if (report.recurrenceEndDate && nextDate > new Date(report.recurrenceEndDate)) {
        return null;
      }

      return nextDate.toISOString();
    };

    const handleSaveMeetingReport = async () => {
      if (!meetingReportForm.title || !meetingReportForm.date) {
        alert('Veuillez remplir les champs obligatoires (Titre, Date)');
        return;
      }

      if (!appState.activeTeamId) {
        alert('Erreur: Aucune équipe active');
        return;
      }

      const now = new Date().toISOString();
      const meetingDate = new Date(meetingReportForm.date!);
      if (meetingReportForm.time) {
        const [hours, minutes] = meetingReportForm.time.split(':');
        meetingDate.setHours(parseInt(hours), parseInt(minutes), 0);
      }

      // Calculer la prochaine date si récurrence activée
      let nextMeetingDate: string | undefined;
      if (meetingReportForm.recurrence && meetingReportForm.recurrence !== MeetingRecurrence.NONE) {
        const nextDate = calculateNextMeetingDate({
          ...meetingReportForm,
          date: meetingDate.toISOString(),
        } as MeetingReport);
        nextMeetingDate = nextDate || undefined;
      }

      // Générer un ID de série si c'est une nouvelle réunion récurrente
      const meetingSeriesId = meetingReportForm.meetingSeriesId || 
        (meetingReportForm.recurrence && meetingReportForm.recurrence !== MeetingRecurrence.NONE 
          ? `series_${Date.now()}` 
          : undefined);

      const reportToSave: MeetingReport = {
        id: selectedMeetingReport?.id || `meeting_${Date.now()}`,
        title: meetingReportForm.title!,
        date: meetingDate.toISOString(),
        time: meetingReportForm.time,
        endTime: meetingReportForm.endTime,
        location: meetingReportForm.location,
        organizerId: meetingReportForm.organizerId!,
        participantIds: meetingReportForm.participantIds || [],
        agenda: meetingReportForm.agenda,
        content: meetingReportForm.content || '',
        actionItems: meetingReportForm.actionItems || [],
        attachments: meetingReportForm.attachments || [],
        createdAt: selectedMeetingReport?.createdAt || now,
        updatedAt: now,
        createdBy: currentUser?.id || '',
        emailSent: selectedMeetingReport?.emailSent || false,
        emailSentAt: selectedMeetingReport?.emailSentAt,
        recurrence: meetingReportForm.recurrence || MeetingRecurrence.NONE,
        recurrenceEndDate: meetingReportForm.recurrenceEndDate 
          ? new Date(meetingReportForm.recurrenceEndDate).toISOString() 
          : undefined,
        recurrenceCount: meetingReportForm.recurrenceCount,
        nextMeetingDate: nextMeetingDate,
        isScheduled: meetingReportForm.isScheduled !== undefined ? meetingReportForm.isScheduled : true,
        meetingSeriesId: meetingSeriesId,
      };

      try {
        // Sauvegarder via le handler parent
        if (onSaveMeetingReport) {
          await onSaveMeetingReport(reportToSave);
        } else {
          // Fallback: sauvegarder directement
          if (appState.activeTeamId) {
            await saveData(appState.activeTeamId, 'meetingReports', reportToSave);
          }
        }

        // Mettre à jour l'état local
        const updatedReports = selectedMeetingReport
          ? meetingReports.map(r => r.id === reportToSave.id ? reportToSave : r)
          : [...meetingReports, reportToSave];
        
        setMeetingReports(updatedReports);

        setIsMeetingReportModalOpen(false);
        setSelectedMeetingReport(null);
        setMeetingReportForm({});
      } catch (error) {
        alert('Erreur lors de la sauvegarde du compte rendu');
      }
    };

    const handleSendEmail = async (report: MeetingReport) => {
      if (!report.participantIds || report.participantIds.length === 0) {
        alert('Aucun participant sélectionné pour cette réunion');
        return;
      }

      const participants = staff.filter(s => report.participantIds.includes(s.id));
      const organizer = staff.find(s => s.id === report.organizerId);

      if (!organizer) {
        alert('Organisateur non trouvé');
        return;
      }

      // Générer le contenu de l'email
      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      };

      let emailBody = `Bonjour,\n\n`;
      emailBody += `Vous trouverez ci-dessous le compte rendu de la réunion "${report.title}".\n\n`;
      emailBody += `DATE : ${formatDate(report.date)}\n`;
      if (report.location) {
        emailBody += `LIEU : ${report.location}\n`;
      }
      emailBody += `ORGANISATEUR : ${organizer.firstName} ${organizer.lastName}\n\n`;

      if (report.agenda) {
        emailBody += `ORDRE DU JOUR\n${'='.repeat(50)}\n${report.agenda}\n\n`;
      }

      emailBody += `COMPTE RENDU\n${'='.repeat(50)}\n${report.content}\n\n`;

      if (report.actionItems && report.actionItems.length > 0) {
        emailBody += `POINTS D'ACTION\n${'='.repeat(50)}\n`;
        report.actionItems.forEach((item, index) => {
          const assignedTo = item.assignedToId 
            ? staff.find(s => s.id === item.assignedToId)
            : null;
          emailBody += `${index + 1}. ${item.description}\n`;
          if (assignedTo) {
            emailBody += `   Assigné à : ${assignedTo.firstName} ${assignedTo.lastName}\n`;
          }
          if (item.dueDate) {
            emailBody += `   Échéance : ${formatDate(item.dueDate)}\n`;
          }
          emailBody += `   Statut : ${item.status === 'completed' ? 'Terminé' : item.status === 'in_progress' ? 'En cours' : 'En attente'}\n\n`;
        });
      }

      emailBody += `\nCordialement,\n${organizer.firstName} ${organizer.lastName}`;

      // Simuler l'envoi d'email (à remplacer par un vrai service d'email)
      // Mettre à jour le statut d'envoi
      const updatedReport: MeetingReport = {
        ...report,
        emailSent: true,
        emailSentAt: new Date().toISOString(),
      };

      try {
        // Sauvegarder via le handler parent
        if (onSaveMeetingReport) {
          await onSaveMeetingReport(updatedReport);
        } else if (appState.activeTeamId) {
          // Fallback: sauvegarder directement
          await saveData(appState.activeTeamId, 'meetingReports', updatedReport);
        }
        
        setMeetingReports(meetingReports.map(r => r.id === report.id ? updatedReport : r));
        alert(`Email envoyé à ${participants.filter(p => p.email).length} participant(s)`);
      } catch (error) {
        alert('Erreur lors de l\'envoi de l\'email');
      }
    };

    const getOrganizerName = (organizerId: string) => {
      const organizer = staff.find(s => s.id === organizerId);
      return organizer ? `${organizer.firstName} ${organizer.lastName}` : 'Inconnu';
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    };

    // Trouver le dernier compte rendu et la prochaine réunion
    const sortedReports = [...meetingReports].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const lastReport = sortedReports.find(r => r.content && r.content.trim() !== '') || sortedReports[0];
    const upcomingMeetings = meetingReports
      .filter(r => {
        const meetingDate = new Date(r.date);
        return meetingDate >= new Date() || (r.recurrence && r.recurrence !== MeetingRecurrence.NONE);
      })
      .map(r => ({
        ...r,
        nextDate: r.nextMeetingDate || calculateNextMeetingDate(r) || r.date
      }))
      .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());

    const nextMeeting = upcomingMeetings[0];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Comptes Rendus de Réunions
          </h3>
          <ActionButton onClick={handleNewMeetingReport} icon={<PlusCircleIcon className="w-5 h-5" />}>
            Planifier une Réunion
          </ActionButton>
        </div>

        {/* Section: Dernier compte rendu et prochaine réunion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dernier compte rendu */}
          {lastReport && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">Dernier Compte Rendu</h4>
                <span className="text-sm text-gray-500">{formatDate(lastReport.date)}</span>
              </div>
              <div className="space-y-2">
                <h5 className="font-semibold text-gray-800">{lastReport.title}</h5>
                {lastReport.location && (
                  <p className="text-sm text-gray-600">📍 {lastReport.location}</p>
                )}
                {lastReport.content && (
                  <p className="text-sm text-gray-700 line-clamp-3">{lastReport.content}</p>
                )}
                <div className="flex items-center space-x-4 mt-4">
                  <span className="text-xs text-gray-500">
                    {lastReport.participantIds?.length || 0} participant(s)
                  </span>
                  {lastReport.actionItems && lastReport.actionItems.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {lastReport.actionItems.length} point(s) d'action
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <ActionButton 
                    onClick={() => handleEditMeetingReport(lastReport)} 
                    variant="secondary" 
                    size="sm"
                  >
                    Voir le compte rendu complet
                  </ActionButton>
                </div>
              </div>
            </div>
          )}

          {/* Prochaine réunion */}
          {nextMeeting && (
            <div className="bg-blue-50 shadow rounded-lg p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-blue-900">Prochaine Réunion</h4>
                <span className="text-sm font-semibold text-blue-700">
                  {formatDate(nextMeeting.nextDate)}
                </span>
              </div>
              <div className="space-y-2">
                <h5 className="font-semibold text-blue-800">{nextMeeting.title}</h5>
                {nextMeeting.time && (
                  <p className="text-sm text-blue-700">🕐 {nextMeeting.time}</p>
                )}
                {nextMeeting.location && (
                  <p className="text-sm text-blue-700">📍 {nextMeeting.location}</p>
                )}
                {nextMeeting.recurrence && nextMeeting.recurrence !== MeetingRecurrence.NONE && (
                  <p className="text-xs text-blue-600">
                    🔄 Récurrence: {nextMeeting.recurrence}
                  </p>
                )}
                {nextMeeting.agenda && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">Ordre du jour:</p>
                    <p className="text-sm text-blue-700 line-clamp-2">{nextMeeting.agenda}</p>
                  </div>
                )}
                <div className="mt-4">
                  <ActionButton 
                    onClick={() => {
                      if (nextMeeting.content && nextMeeting.content.trim() !== '') {
                        handleEditMeetingReport(nextMeeting);
                      } else {
                        // Créer un nouveau compte rendu pour cette réunion
                        setSelectedMeetingReport(nextMeeting);
                        setMeetingReportForm({
                          ...nextMeeting,
                          date: nextMeeting.nextDate.split('T')[0],
                        });
                        setIsMeetingReportModalOpen(true);
                      }
                    }} 
                    variant="primary" 
                    size="sm"
                  >
                    {nextMeeting.content && nextMeeting.content.trim() !== '' 
                      ? 'Voir le compte rendu' 
                      : 'Créer le compte rendu'}
                  </ActionButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Liste des comptes rendus */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Comptes Rendus</h4>
            <p className="text-sm text-gray-600">
              Gestion et suivi des comptes rendus de réunions du staff
            </p>
          </div>

          {meetingReports.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun compte rendu</h3>
              <p className="mt-1 text-sm text-gray-500">
                Créez votre premier compte rendu de réunion
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Titre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organisateur
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email envoyé
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {meetingReports
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{report.title}</div>
                          {report.location && (
                            <div className="text-sm text-gray-500">{report.location}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(report.date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{getOrganizerName(report.organizerId)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900">
                            {report.participantIds?.length || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {report.emailSent ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Oui
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Non
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <ActionButton
                              onClick={() => handleEditMeetingReport(report)}
                              variant="warning"
                              size="sm"
                              icon={<PencilIcon className="w-4 h-4" />}
                              title="Modifier"
                            />
                            {!report.emailSent && (
                              <ActionButton
                                onClick={() => handleSendEmail(report)}
                                variant="primary"
                                size="sm"
                                icon={<EnvelopeIcon className="w-4 h-4" />}
                                title="Envoyer par email"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de création/édition */}
        {isMeetingReportModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {selectedMeetingReport 
                  ? (selectedMeetingReport.content && selectedMeetingReport.content.trim() !== '' 
                      ? 'Modifier le Compte Rendu' 
                      : 'Modifier la Réunion')
                  : (meetingReportForm.content && meetingReportForm.content.trim() !== '' 
                      ? 'Nouveau Compte Rendu' 
                      : 'Planifier une Réunion')}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Titre *</label>
                    <input
                      type="text"
                      value={meetingReportForm.title || ''}
                      onChange={(e) => setMeetingReportForm({ ...meetingReportForm, title: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Ex: Réunion de préparation saison 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date *</label>
                    <input
                      type="date"
                      value={meetingReportForm.date || ''}
                      onChange={(e) => setMeetingReportForm({ ...meetingReportForm, date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Heure de début</label>
                    <input
                      type="time"
                      value={meetingReportForm.time || ''}
                      onChange={(e) => setMeetingReportForm({ ...meetingReportForm, time: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Heure de fin</label>
                    <input
                      type="time"
                      value={meetingReportForm.endTime || ''}
                      onChange={(e) => setMeetingReportForm({ ...meetingReportForm, endTime: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Lieu</label>
                  <input
                    type="text"
                    value={meetingReportForm.location || ''}
                    onChange={(e) => setMeetingReportForm({ ...meetingReportForm, location: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Ex: Siège de l'équipe"
                  />
                </div>

                {/* Récurrence - Section mise en avant */}
                <div className="border-t-2 border-blue-200 pt-4 bg-blue-50 rounded-lg p-4 mt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <CalendarDaysIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Planification et Récurrence
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type de récurrence
                      </label>
                      <select
                        value={meetingReportForm.recurrence || MeetingRecurrence.NONE}
                        onChange={(e) => setMeetingReportForm({ 
                          ...meetingReportForm, 
                          recurrence: e.target.value as MeetingRecurrence 
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                      >
                        {Object.values(MeetingRecurrence).map((recurrence) => (
                          <option key={recurrence} value={recurrence}>
                            {recurrence}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-600">
                        Sélectionnez la fréquence de répétition
                      </p>
                    </div>
                    {(meetingReportForm.recurrence && meetingReportForm.recurrence !== MeetingRecurrence.NONE) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de fin de récurrence (optionnel)
                        </label>
                        <input
                          type="date"
                          value={meetingReportForm.recurrenceEndDate || ''}
                          onChange={(e) => setMeetingReportForm({ ...meetingReportForm, recurrenceEndDate: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                        />
                        <p className="mt-1 text-xs text-gray-600">
                          Laisser vide pour une récurrence sans fin
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-blue-200">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={meetingReportForm.isScheduled !== undefined ? meetingReportForm.isScheduled : true}
                        onChange={(e) => setMeetingReportForm({ ...meetingReportForm, isScheduled: e.target.checked })}
                        className="rounded border-gray-300 w-4 h-4"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Planifier cette réunion dans le calendrier
                      </span>
                    </label>
                    <p className="mt-1 ml-6 text-xs text-gray-600">
                      La réunion sera visible dans le calendrier de l'équipe
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Participants</label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {staff.map((member) => (
                      <label key={member.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={meetingReportForm.participantIds?.includes(member.id) || false}
                          onChange={(e) => {
                            const currentIds = meetingReportForm.participantIds || [];
                            if (e.target.checked) {
                              setMeetingReportForm({ ...meetingReportForm, participantIds: [...currentIds, member.id] });
                            } else {
                              setMeetingReportForm({ ...meetingReportForm, participantIds: currentIds.filter(id => id !== member.id) });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">
                          {member.firstName} {member.lastName} ({getStaffRoleDisplayLabel(member.role)})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Ordre du jour</label>
                  <textarea
                    value={meetingReportForm.agenda || ''}
                    onChange={(e) => setMeetingReportForm({ ...meetingReportForm, agenda: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={4}
                    placeholder="Points à aborder lors de la réunion..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Compte rendu 
                    <span className="text-gray-500 text-xs ml-1">(optionnel - peut être ajouté après la réunion)</span>
                  </label>
                  <textarea
                    value={meetingReportForm.content || ''}
                    onChange={(e) => setMeetingReportForm({ ...meetingReportForm, content: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={8}
                    placeholder="Rédigez le compte rendu de la réunion... (peut être complété après la réunion)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Points d'action</label>
                  <div className="space-y-2">
                    {(meetingReportForm.actionItems || []).map((item, index) => (
                      <div key={item.id || index} className="flex items-start space-x-2 p-2 border border-gray-300 rounded-md">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const updatedItems = [...(meetingReportForm.actionItems || [])];
                              updatedItems[index] = { ...item, description: e.target.value };
                              setMeetingReportForm({ ...meetingReportForm, actionItems: updatedItems });
                            }}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                            placeholder="Description du point d'action"
                          />
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <select
                              value={item.assignedToId || ''}
                              onChange={(e) => {
                                const updatedItems = [...(meetingReportForm.actionItems || [])];
                                updatedItems[index] = { ...item, assignedToId: e.target.value || undefined };
                                setMeetingReportForm({ ...meetingReportForm, actionItems: updatedItems });
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="">Non assigné</option>
                              {staff.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.firstName} {member.lastName}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={item.dueDate || ''}
                              onChange={(e) => {
                                const updatedItems = [...(meetingReportForm.actionItems || [])];
                                updatedItems[index] = { ...item, dueDate: e.target.value || undefined };
                                setMeetingReportForm({ ...meetingReportForm, actionItems: updatedItems });
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                              placeholder="Échéance"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const updatedItems = (meetingReportForm.actionItems || []).filter((_, i) => i !== index);
                            setMeetingReportForm({ ...meetingReportForm, actionItems: updatedItems });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newItem = {
                          id: `action_${Date.now()}`,
                          description: '',
                          status: 'pending' as const,
                        };
                        setMeetingReportForm({
                          ...meetingReportForm,
                          actionItems: [...(meetingReportForm.actionItems || []), newItem],
                        });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Ajouter un point d'action
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <ActionButton onClick={() => {
                  setIsMeetingReportModalOpen(false);
                  setSelectedMeetingReport(null);
                  setMeetingReportForm({});
                }} variant="secondary">
                  Annuler
                </ActionButton>
                <ActionButton onClick={handleSaveMeetingReport} variant="primary">
                  Sauvegarder
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <SectionWrapper 
      title="Gestion du Staff"
      actionButton={
        activeTab === 'staff' ? (
          <ActionButton onClick={handleAddStaff} icon={<PlusCircleIcon className="w-5 h-5"/>}>
            Ajouter membre
          </ActionButton>
        ) : activeTab === 'meetings' ? (
          <ActionButton onClick={() => {
            const now = new Date();
            setMeetingReportForm({
              title: '',
              date: now.toISOString().split('T')[0],
              time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
              location: '',
              organizerId: currentUser?.id || '',
              participantIds: [],
              agenda: '',
              content: '',
              actionItems: [],
              recurrence: MeetingRecurrence.NONE,
              isScheduled: true,
            });
            setSelectedMeetingReport(null);
            setIsMeetingReportModalOpen(true);
          }} icon={<PlusCircleIcon className="w-5 h-5" />}>
            Planifier réunion
          </ActionButton>
        ) : undefined
      }
    >
      {/* Navigation par onglets */}
      <div className="mb-4">
        <nav className="flex flex-wrap gap-2" aria-label="Onglets staff">
          {staffTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="w-full max-w-full overflow-hidden">
        {activeTab === 'staff' ? <StaffListTab /> : 
         activeTab === 'workload' ? <StaffWorkloadTab /> : 
         activeTab === 'planning' ? (
           <StaffSeasonPlanning
             embedded
             staff={staff}
             raceEvents={raceEvents}
             staffEventSelections={staffEventSelections}
             setStaffEventSelections={setStaffEventSelections || (() => {})}
             currentUser={currentUser}
             appState={appState}
             onOpenStaffModal={(staffMember) => openViewModal(staffMember)}
            onAssignStaffToEvent={handleAssignStaffToEvent}
            onOpenEventDetail={(eventId: string) => navigateTo && navigateTo('eventDetail', eventId)}
           />
         ) : 
         activeTab === 'recruitment' ? (
           <StaffSearchTab
             allStaff={recruitableStaff}
             raceEvents={raceEvents}
             teamAddress={team?.address}
             performanceEntries={performanceEntries || []}
           />
         ) :
         activeTab === 'meetings' ? <MeetingReportsTab /> :
         <ArchivesTab />}
      </div>

      {/* Modales */}
      {isViewModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* En-tête profil */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-white">
                    {selectedStaff.firstName?.charAt(0)}{selectedStaff.lastName?.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedStaff.firstName} {selectedStaff.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedStaff.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {getStaffRoleDisplayLabel(selectedStaff.role) || 'Autre'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStaffStatusBadgeClass(selectedStaff.status)}`}>
                      {getStaffStatusLabel(selectedStaff.status)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedStaff.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {selectedStaff.isActive !== false ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              {/* Infos essentielles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {selectedStaff.phone && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Téléphone</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedStaff.phone}</p>
                  </div>
                )}
                {selectedStaff.birthDate && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Naissance</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {new Date(selectedStaff.birthDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                {selectedStaff.contractType && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Contrat</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedStaff.contractType}</p>
                  </div>
                )}
                {normalizeStaffStatusKey(selectedStaff.status) === 'VACATAIRE' && selectedStaff.dailyRate ? (
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Tarif jour</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedStaff.dailyRate} €</p>
                  </div>
                ) : null}
                {normalizeStaffStatusKey(selectedStaff.status) === 'SALARIE' && selectedStaff.salary ? (
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Salaire</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedStaff.salary} €/mois</p>
                  </div>
                ) : null}
              </div>

              {selectedStaff.address?.streetName && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 mb-4 text-sm text-gray-700">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Adresse</p>
                  {selectedStaff.address.streetName}<br />
                  {selectedStaff.address.postalCode} {selectedStaff.address.city}
                  {selectedStaff.address.region && <>, {selectedStaff.address.region}</>}
                </div>
              )}

            <StaffMemberTravelCalendar
              staffMember={selectedStaff}
              raceEvents={raceEvents}
              eventTransportLegs={eventTransportLegs || appState?.eventTransportLegs || []}
              vehicles={vehicles}
              onOpenEvent={(eventId) => {
                setIsViewModalOpen(false);
                navigateTo?.('eventDetail', eventId);
              }}
            />
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
              <ActionButton onClick={() => { openEditModal(selectedStaff); setIsViewModalOpen(false); }} variant="warning" icon={<PencilIcon className="w-4 h-4" />}>
                Modifier
              </ActionButton>
              <ActionButton onClick={() => { setIsViewModalOpen(false); setActiveTab('planning'); }} variant="secondary" icon={<CalendarDaysIcon className="w-4 h-4" />}>
                Planning
              </ActionButton>
              <ActionButton onClick={() => setIsViewModalOpen(false)} variant="secondary">
                Fermer
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedStaff ? 'Modifier le membre' : 'Nouveau membre du staff'}
              </h3>
              {formData.firstName || formData.lastName ? (
                <p className="text-sm text-gray-500 mt-1">
                  {formData.firstName} {formData.lastName}
                  {formData.role && <> · {getStaffRoleDisplayLabel(formData.role)}</>}
                </p>
              ) : null}
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Statut — sélection visuelle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                <div className="flex flex-wrap gap-2">
                  {STAFF_STATUS_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleInputChange('status', key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        normalizeStaffStatusKey(formData.status || '') === key
                          ? 'border-blue-500 ring-2 ring-blue-100 ' + getStaffStatusBadgeClass(key)
                          : getStaffStatusBadgeClass(key) + ' border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      {getStaffStatusLabel(key)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-800">Identité</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
                      <input
                        type="text"
                        value={formData.firstName || ''}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                      <input
                        type="text"
                        value={formData.lastName || ''}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Naissance</label>
                      <input
                        type="date"
                        value={formData.birthDate ? formData.birthDate.split('T')[0] : ''}
                        onChange={(e) => handleInputChange('birthDate', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-800">Poste & rémunération</h4>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rôle *</label>
                    <select
                      value={formData.role || 'AUTRE'}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {STAFF_ROLE_KEYS.map((key) => (
                        <option key={key} value={key}>{getStaffRoleDisplayLabel(key)}</option>
                      ))}
                    </select>
                  </div>

                  {normalizeStaffStatusKey(formData.status || '') === 'SALARIE' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Type de contrat</label>
                        <select
                          value={formData.contractType || ''}
                          onChange={(e) => handleInputChange('contractType', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">—</option>
                          <option value="CDI">CDI</option>
                          <option value="CDD">CDD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Salaire (€/mois)</label>
                        <input
                          type="number"
                          value={formData.salary || ''}
                          onChange={(e) => handleInputChange('salary', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="3000"
                        />
                      </div>
                    </>
                  )}

                  {normalizeStaffStatusKey(formData.status || '') === 'VACATAIRE' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tarif journalier (€)</label>
                      <input
                        type="number"
                        value={formData.dailyRate || ''}
                        onChange={(e) => handleInputChange('dailyRate', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="150"
                      />
                    </div>
                  )}

                  {normalizeStaffStatusKey(formData.status || '') === 'BENEVOLE' && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      Aucune rémunération à renseigner pour un bénévole.
                    </p>
                  )}
                </div>
              </div>

              {/* Adresse repliable */}
              <details className="group rounded-xl border border-gray-200">
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
                  Adresse postale <span className="text-gray-400 font-normal">(optionnel)</span>
                </summary>
                <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Rue"
                      value={formData.address?.streetName || ''}
                      onChange={(e) => handleAddressChange('streetName', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Code postal"
                    value={formData.address?.postalCode || ''}
                    onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Ville"
                    value={formData.address?.city || ''}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Région"
                    value={formData.address?.region || ''}
                    onChange={(e) => handleAddressChange('region', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Pays"
                    value={formData.address?.country || ''}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </details>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <ActionButton onClick={() => setIsEditModalOpen(false)} variant="secondary">
                Annuler
              </ActionButton>
              <ActionButton onClick={handleSaveStaff} variant="primary">
                {selectedStaff ? 'Enregistrer' : 'Ajouter'}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmer la Suppression</h3>
            <p className="text-gray-600 mb-4">
              Êtes-vous sûr de vouloir supprimer {selectedStaff.firstName} {selectedStaff.lastName} ?
            </p>
            <div className="flex justify-end space-x-2">
              <ActionButton onClick={() => setIsDeleteModalOpen(false)} variant="secondary">
                Annuler
              </ActionButton>
              <ActionButton onClick={() => handleDeleteStaff(selectedStaff)} variant="danger">
                Supprimer
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Modale de détail des archives */}
      <StaffArchiveDetailModal
        archive={selectedArchive}
        isOpen={isArchiveDetailOpen}
        onClose={() => {
          setIsArchiveDetailOpen(false);
          setSelectedArchive(null);
        }}
      />
    </SectionWrapper>
  );
}