import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserGroupIcon, 
  CalendarDaysIcon,
  TrophyIcon,
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  TruckIcon
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
  getStaffStatsForSeason, 
  getDetailedStaffStatsForSeason,
  calculateStaffDaysForSeason 
} from '../utils/staffRosterUtils';
import { saveData } from '../services/firebaseService';
import { StaffTransitionManager, StaffArchiveViewer, StaffArchiveDetailModal, StaffSeasonPlanning } from '../components';

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

/** Affiche le calendrier des déplacements par mois (année en cours uniquement), style visuel type planning. */
function StaffMemberTravelCalendar({
  staffMember,
  raceEvents,
  eventTransportLegs,
  vehicles = [],
}: {
  staffMember: StaffMember;
  raceEvents: RaceEvent[];
  eventTransportLegs: EventTransportLeg[];
  vehicles?: { id?: string; name?: string }[];
}) {
  const currentYear = getCurrentSeasonYear();

  const eventsForStaff = (raceEvents || []).filter((e) => {
    const eventYear = e.date ? new Date(e.date + 'T12:00:00Z').getFullYear() : null;
    if (eventYear !== currentYear) return false;
    if (e.selectedStaffIds?.includes(staffMember.id)) return true;
    const roleKeys = ['managerId', 'directeurSportifId', 'assistantId', 'mecanoId', 'kineId', 'medecinId', 'respPerfId', 'entraineurId', 'dataAnalystId', 'prepaPhysiqueId', 'communicationId'];
    return roleKeys.some((key) => {
      const arr = (e as Record<string, unknown>)[key];
      return Array.isArray(arr) && arr.includes(staffMember.id);
    });
  });

  const legsForStaffCurrentYear = (eventTransportLegs || []).filter((leg) => {
    const legYear = leg.departureDate ? new Date(leg.departureDate + 'T12:00:00Z').getFullYear() : currentYear;
    if (legYear !== currentYear) return false;
    return leg.driverId === staffMember.id || (leg.occupants || []).some((o) => o.type === 'staff' && o.id === staffMember.id);
  });

  const getEventName = (eventId: string) => raceEvents.find((e) => e.id === eventId)?.name || 'Événement';

  // Grouper les événements par mois (1-12)
  const eventsByMonth = useMemo(() => {
    const byMonth: Record<number, RaceEvent[]> = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = [];
    eventsForStaff.forEach((e) => {
      if (!e.date) return;
      const month = new Date(e.date + 'T12:00:00Z').getMonth() + 1;
      byMonth[month].push(e);
    });
    Object.keys(byMonth).forEach((m) => {
      const month = Number(m);
      byMonth[month].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    });
    return byMonth;
  }, [eventsForStaff]);

  const formatEventDate = (e: RaceEvent) => {
    const start = e.date ? new Date(e.date + 'T12:00:00Z') : null;
    const end = e.endDate ? new Date(e.endDate + 'T12:00:00Z') : null;
    const loc = e.location || '';
    if (!start) return loc ? `– ${loc}` : '–';
    const startStr = format(start, 'd MMM', { locale: fr });
    if (end && end.getTime() !== start.getTime()) {
      const endStr = format(end, 'd MMM', { locale: fr });
      return loc ? `Du ${startStr} au ${endStr} - ${loc}` : `Du ${startStr} au ${endStr}`;
    }
    return loc ? `${startStr} - ${loc}` : startStr;
  };

  const hasAny = eventsForStaff.length > 0 || legsForStaffCurrentYear.length > 0;

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
        <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
        Calendrier des déplacements
      </h4>
      {!hasAny ? (
        <p className="text-sm text-gray-500 italic">Aucun déplacement ou événement assigné pour {currentYear}.</p>
      ) : (
        <div className="rounded-xl bg-slate-800 text-slate-100 p-4 overflow-hidden">
          <p className="text-slate-300 text-sm mb-4">{currentYear}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((monthNum) => {
              const monthDate = new Date(currentYear, monthNum - 1, 1);
              const monthLabel = format(monthDate, 'MMMM yyyy', { locale: fr });
              const monthEvents = eventsByMonth[monthNum] || [];
              const monthLegs = legsForStaffCurrentYear.filter((leg) => {
                if (!leg.departureDate) return false;
                return new Date(leg.departureDate + 'T12:00:00Z').getMonth() + 1 === monthNum;
              });
              const isEmpty = monthEvents.length === 0 && monthLegs.length === 0;
              return (
                <div key={monthNum} className="flex flex-col">
                  <h5 className="text-sm font-semibold text-slate-200 capitalize mb-2">{monthLabel}</h5>
                  <div className="space-y-2">
                    {isEmpty ? (
                      <p className="text-slate-500 text-sm">Aucun événement</p>
                    ) : (
                      <>
                        {monthEvents.map((e) => (
                          <div
                            key={e.id}
                            className="rounded-lg bg-slate-700/80 backdrop-blur border border-slate-600/50 p-3 text-sm"
                          >
                            <p className="font-medium text-slate-100 truncate" title={e.name || ''}>
                              {e.name || 'Sans nom'}
                            </p>
                            <p className="text-slate-400 text-xs mt-1">{formatEventDate(e)}</p>
                          </div>
                        ))}
                        {monthLegs.map((leg) => (
                          <div
                            key={leg.id}
                            className="rounded-lg bg-slate-700/80 backdrop-blur border border-slate-600/50 p-3 text-sm flex items-center gap-2"
                          >
                            <TruckIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-100 truncate">{getEventName(leg.eventId)}</p>
                              <p className="text-slate-400 text-xs mt-0.5">
                                {leg.departureDate ? format(new Date(leg.departureDate + 'T12:00:00Z'), 'd MMM', { locale: fr }) : '–'} — {leg.direction}
                                {leg.driverId === staffMember.id && ' · Chauffeur'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
  const [activeTab, setActiveTab] = useState<'staff' | 'workload' | 'planning' | 'archives' | 'meetings'>('planning');
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
  const handleAssignStaffToEvent = (eventId: string, staffId: string, status: any) => {
    try {
      const event = (raceEvents || []).find((e: any) => e.id === eventId);
      if (!event) return;
      const staffMember = (staff || []).find((s: StaffMember) => s.id === staffId);
      const current = new Set<string>(event.selectedStaffIds || []);
      const isAdding = status === 'SELECTIONNE' || status === 'PRE_SELECTION';

      if (isAdding) {
        current.add(staffId);
      } else {
        current.delete(staffId);
      }

      const updatedEvent: Record<string, unknown> = { ...event, selectedStaffIds: Array.from(current) };

      if (isAdding && staffMember) {
        const eventRoleKey = getEventRoleKeyForStaff(staffMember.role);
        if (eventRoleKey) {
          const roleArr = Array.from((event as Record<string, unknown>)[eventRoleKey] as string[] || []);
          if (!roleArr.includes(staffId)) {
            (updatedEvent as Record<string, unknown>)[eventRoleKey] = [...roleArr, staffId];
          }
        }
      } else if (!isAdding) {
        EVENT_ROLE_KEYS.forEach((key) => {
          const arr = (event as Record<string, unknown>)[key];
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

  // Fonction pour calculer le nombre de jours de staff depuis le début de saison
  const getStaffDays = (staffId: string) => {
    if (!raceEvents || !Array.isArray(raceEvents)) {
      return 0;
    }

    const currentDate = new Date();
    const currentSeason = getCurrentSeasonYear();
    
    // Début de saison (1er janvier de l'année de saison courante)
    const seasonStart = new Date(currentSeason, 0, 1);
    
    // Utiliser raceEvents pour avoir les données les plus récentes
    const seasonEvents = raceEvents.filter(event => {
      if (!event || !event.date) return false;
      try {
        const eventDate = new Date(event.date);
        const eventYear = eventDate.getFullYear();
        return eventYear === currentSeason && 
               eventDate >= seasonStart && 
               eventDate <= currentDate;
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
    // Filtrer les événements de l'année sélectionnée
    const yearEvents = raceEvents.filter(event => {
      const eventDate = new Date(event.date);
      const eventYear = eventDate.getFullYear();
      return eventYear === selectedYear;
    });

    // Calculer les statistiques du staff
    const staffStats = useMemo(() => {
      const totalStaff = staff.length;
      const activeStaff = staff.filter(member => member.isActive !== false).length;
      const totalStaffDays = staff.reduce((total, member) => total + getStaffDays(member.id), 0);
      const averageStaffDays = totalStaff > 0 ? Math.round(totalStaffDays / totalStaff) : 0;

      return {
        totalStaff,
        activeStaff,
        totalStaffDays,
        averageStaffDays
      };
    }, [staff, getStaffDays]);

    return (
      <div className="space-y-6">
        {/* En-tête avec sélecteur d'année */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Staff & Jours de Travail - {selectedYear}
          </h3>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Année :</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
          </select>
        </div>
      </div>

        {/* Métriques du staff */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <UserGroupIcon className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Staff</p>
                <p className="text-2xl font-bold text-blue-900">{staffStats.totalStaff}</p>
                        </div>
                    </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
                                                </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Staff Actif</p>
                <p className="text-2xl font-bold text-green-900">{staffStats.activeStaff}</p>
                                            </div>
                                    </div>
                                </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <CalendarDaysIcon className="w-8 h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-600">Total Jours</p>
                <p className="text-2xl font-bold text-orange-900">{staffStats.totalStaffDays}</p>
                        </div>
                    </div>
                </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <TrophyIcon className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Moyenne</p>
                <p className="text-2xl font-bold text-purple-900">{staffStats.averageStaffDays}</p>
                </div>
              </div>
      </div>
    </div>

        {/* Tableau du staff */}
        <div className="bg-white shadow rounded-lg overflow-hidden max-w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Détail des Jours de Staff</h4>
            <p className="text-sm text-gray-600">
              Jours de travail calculés pour la saison {selectedYear}
                      </p>
                    </div>
          
          <div className="overflow-x-auto max-w-full">
            <table className="min-w-full divide-y divide-gray-200 max-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jours de Travail
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(staff || []).map((member) => {
                  if (!member || !member.id) return null;
                  const staffDays = getStaffDays(member.id);
                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                              </span>
                  </div>
                  </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                </div>
                            <div className="text-sm text-gray-500">
                              {member.email}
              </div>
          </div>
        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getStaffRoleDisplayLabel(member.role) || 'staff'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          staffDays === 0 
                            ? 'bg-gray-100 text-gray-800' 
                            : staffDays < 10 
                            ? 'bg-green-100 text-green-800'
                            : staffDays < 20
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {staffDays} jours
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.status === 'BENEVOLE' 
                            ? 'bg-green-100 text-green-800'
                            : member.status === 'VACATAIRE'
                            ? 'bg-yellow-100 text-yellow-800'
                            : member.status === 'SALARIE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.status === 'BENEVOLE' ? 'Bénévole' : 
                           member.status === 'VACATAIRE' ? 'Vacataire' : 
                           member.status === 'SALARIE' ? 'Salarié(e)' : 
                           'Non défini'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {member.phone || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
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
          
          {(staff || []).length === 0 && (
            <div className="text-center py-8">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun membre du staff</h3>
              <p className="mt-1 text-sm text-gray-500">
                Aucun membre du staff n'est disponible pour la saison {selectedYear}.
              </p>
             </div>
                )}
             </div>
         </div>
    );
  };

  // Composant StaffListTab - Liste des membres du staff
  const StaffListTab = () => {
    const filteredStaff = (activeStaff || []).filter((member) => {
      if (!staffRoleFilter) return true;
      const memberRoleKey = getStaffRoleKey(member.role);
      return memberRoleKey === staffRoleFilter;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Liste du Staff - {filteredStaff.length} membre{filteredStaff.length !== 1 ? 's' : ''}
          </h3>
            </div>
            
        {/* Tableau du staff */}
        <div className="bg-white shadow rounded-lg overflow-hidden max-w-full">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-lg font-medium text-gray-900">Membres du Staff</h4>
              <p className="text-sm text-gray-600">
                Gestion des membres de l'équipe technique
              </p>
            </div>
            <div className="flex items-center gap-2 min-w-0 sm:min-w-[220px]">
              <label htmlFor="staff-role-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Poste :
              </label>
              <select
                id="staff-role-filter"
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter((e.target.value || '') as StaffRoleKeyString | '')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
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

          <div className="overflow-x-auto max-w-full">
            <table className="min-w-full divide-y divide-gray-200 max-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((member) => {
                  if (!member || !member.id) return null;
                  return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                            </span>
              </div>
            </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
        </div>
                          <div className="text-sm text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getStaffRoleDisplayLabel(member.role) || 'staff'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.status === 'BENEVOLE' 
                          ? 'bg-green-100 text-green-800'
                          : member.status === 'VACATAIRE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : member.status === 'SALARIE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.status === 'BENEVOLE' ? 'Bénévole' : 
                         member.status === 'VACATAIRE' ? 'Vacataire' : 
                         member.status === 'SALARIE' ? 'Salarié(e)' : 
                         'Non défini'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900">
                        {member.phone || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
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
            <div className="text-center py-8">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {staffRoleFilter ? 'Aucun membre pour ce poste' : 'Aucun membre du staff'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {staffRoleFilter
                  ? `Aucun membre du staff avec le poste « ${getStaffRoleDisplayLabel(staffRoleFilter)} ». Essayez un autre filtre.`
                  : 'Aucun membre du staff n\'est disponible.'}
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
        <ActionButton onClick={handleAddStaff} icon={<PlusCircleIcon className="w-5 h-5"/>}>
          Ajouter Membre
        </ActionButton>
      }
    >
      {/* Onglets */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
                    <button 
            onClick={() => setActiveTab('staff')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'staff' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <UserGroupIcon className="w-5 h-5" />
              <span>Liste du Staff</span>
                            </div>
          </button>
          <button
            onClick={() => setActiveTab('workload')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'workload' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="w-5 h-5" />
              <span>Jours de Travail</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'planning' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <TrophyIcon className="w-5 h-5" />
              <span>Planning de Saison</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'archives' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ArchiveBoxIcon className="w-5 h-5" />
              <span>Archives</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'meetings' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="w-5 h-5" />
              <span>Comptes Rendus</span>
            </div>
          </button>
        </nav>
            </div>

      {/* Contenu des onglets */}
      <div className="p-6 w-full max-w-full overflow-hidden">
        {activeTab === 'staff' ? <StaffListTab /> : 
         activeTab === 'workload' ? <StaffWorkloadTab /> : 
         activeTab === 'planning' ? (
           <StaffSeasonPlanning
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
         activeTab === 'meetings' ? <MeetingReportsTab /> :
         <ArchivesTab />}
      </div>

      {/* Modales */}
      {isViewModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Détails du Membre du Staff</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                  <p className="text-sm text-gray-900">{selectedStaff.firstName} {selectedStaff.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date de naissance</label>
                  <p className="text-sm text-gray-900">{selectedStaff.birthDate ? new Date(selectedStaff.birthDate).toLocaleDateString('fr-FR') : 'Non renseignée'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedStaff.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                  <p className="text-sm text-gray-900">{selectedStaff.phone || 'Non renseigné'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rôle</label>
                  <p className="text-sm text-gray-900">{getStaffRoleDisplayLabel(selectedStaff.role) || 'staff'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Statut</label>
                  <p className="text-sm text-gray-900">
                    {selectedStaff.status === 'BENEVOLE' ? 'Bénévole' : 
                     selectedStaff.status === 'VACATAIRE' ? 'Vacataire' : 
                     selectedStaff.status === 'SALARIE' ? 'Salarié(e)' : 
                     'Non défini'}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Adresse postale</label>
                  <div className="text-sm text-gray-900">
                    {selectedStaff.address ? (
                      <div>
                        <p>{selectedStaff.address.streetName}</p>
                        <p>{selectedStaff.address.postalCode} {selectedStaff.address.city}</p>
                        <p>{selectedStaff.address.region} {selectedStaff.address.country}</p>
                      </div>
                    ) : (
                      <p>Non renseignée</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type de contrat</label>
                  <p className="text-sm text-gray-900">{selectedStaff.contractType || 'Non défini'}</p>
                </div>
                {selectedStaff.status === 'VACATAIRE' && selectedStaff.dailyRate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tarif journalier</label>
                    <p className="text-sm text-gray-900">{selectedStaff.dailyRate}€/jour</p>
                  </div>
                )}
                {selectedStaff.status === 'SALARIE' && selectedStaff.salary && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Salaire</label>
                    <p className="text-sm text-gray-900">{selectedStaff.salary}€/mois</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Statut actif</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedStaff.isActive !== false 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedStaff.isActive !== false ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>

            {/* Calendrier des déplacements prévus et effectués */}
            <StaffMemberTravelCalendar
              staffMember={selectedStaff}
              raceEvents={raceEvents}
              eventTransportLegs={eventTransportLegs || appState?.eventTransportLegs || []}
              vehicles={vehicles}
            />

            <div className="flex justify-end gap-3 mt-6">
              <ActionButton onClick={() => { setIsViewModalOpen(false); setActiveTab('planning'); }} variant="secondary" icon={<CalendarDaysIcon className="w-4 h-4" />}>
                Voir le planning complet
              </ActionButton>
              <ActionButton onClick={() => setIsViewModalOpen(false)} variant="secondary">
                Fermer
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {selectedStaff ? 'Modifier le Membre du Staff' : 'Ajouter un Nouveau Membre du Staff'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations personnelles */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">Informations personnelles</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prénom *</label>
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom *</label>
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date de naissance</label>
                  <input
                    type="date"
                    value={formData.birthDate ? formData.birthDate.split('T')[0] : ''}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Informations professionnelles */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">Informations professionnelles</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rôle *</label>
                  <select
                    value={formData.role || 'AUTRE'}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="DS">Directeur Sportif</option>
                    <option value="ASSISTANT">Assistant(e)</option>
                    <option value="MECANO">Mécanicien</option>
                    <option value="COMMUNICATION">Communication</option>
                    <option value="MEDECIN">Médecin</option>
                    <option value="KINE">Kinésithérapeute</option>
                    <option value="RESP_PERF">Responsable Performance</option>
                    <option value="ENTRAINEUR">Entraîneur</option>
                    <option value="DATA_ANALYST">Data Analyste</option>
                    <option value="PREPA_PHYSIQUE">Préparateur Physique</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Statut *</label>
                  <select
                    value={formData.status || 'BENEVOLE'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="BENEVOLE">Bénévole</option>
                    <option value="VACATAIRE">Vacataire</option>
                    <option value="SALARIE">Salarié(e)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type de contrat</label>
                  <select
                    value={formData.contractType || ''}
                    onChange={(e) => handleInputChange('contractType', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Non applicable</option>
                    <option value="CDI">CDI (Contrat à Durée Indéterminée)</option>
                    <option value="CDD">CDD (Contrat à Durée Déterminée)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tarif journalier (€/jour)</label>
                  <input
                    type="number"
                    value={formData.dailyRate || ''}
                    onChange={(e) => handleInputChange('dailyRate', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salaire (€/mois)</label>
                  <input
                    type="number"
                    value={formData.salary || ''}
                    onChange={(e) => handleInputChange('salary', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="3000"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div className="space-y-4 md:col-span-2">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">Adresse postale</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rue</label>
                    <input
                      type="text"
                      value={formData.address?.streetName || ''}
                      onChange={(e) => handleAddressChange('streetName', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code postal</label>
                    <input
                      type="text"
                      value={formData.address?.postalCode || ''}
                      onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ville</label>
                    <input
                      type="text"
                      value={formData.address?.city || ''}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Région</label>
                    <input
                      type="text"
                      value={formData.address?.region || ''}
                      onChange={(e) => handleAddressChange('region', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pays</label>
                    <input
                      type="text"
                      value={formData.address?.country || ''}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <ActionButton onClick={() => setIsEditModalOpen(false)} variant="secondary">
                Annuler
              </ActionButton>
              <ActionButton onClick={handleSaveStaff} variant="primary">
                {selectedStaff ? 'Sauvegarder' : 'Ajouter'}
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