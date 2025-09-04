import React, { useState, useMemo, useEffect, ChangeEvent } from 'react';
import * as firebaseService from '../services/firebaseService';
import { StaffMember, RaceEvent, EventStaffAvailability, StaffRoleKey, EventBudgetItem, StaffRole, StaffStatus, AvailabilityStatus, EventType, ContractType, BudgetItemCategory, User, TeamRole, WorkExperience, Team, PerformanceEntry, Mission, MissionStatus, MissionCompensationType, Address, EducationOrCertification, AppSection, PermissionLevel, Vehicle, EventTransportLeg } from '../types'; 
import { STAFF_ROLE_COLORS, STAFF_STATUS_COLORS, EVENT_TYPE_COLORS, STAFF_ROLES_CONFIG } from '../constants'; 
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import StaffDetailModal from '../components/StaffDetailModal';
import StaffViewModal from '../components/StaffViewModal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import UserCircleIcon from '../components/icons/UserCircleIcon';
import SearchIcon from '../components/icons/SearchIcon';
import MailIcon from '../components/icons/MailIcon'; 
import PhoneIcon from '../components/icons/PhoneIcon';
import LocationMarkerIcon from '../components/icons/LocationMarkerIcon';
import Modal from '../components/Modal';
import XCircleIcon from '../components/icons/XCircleIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import StaffSearchTab from '../components/StaffSearchTab';
import MissionSearchSection from './MissionSearchSection';
import StarIcon from '../components/icons/StarIcon';
import CalendarDaysIcon from '../components/icons/CalendarDaysIcon';
import BanknotesIcon from '../components/icons/BanknotesIcon';
import EyeIcon from '../components/icons/EyeIcon';
import { useTranslations } from '../hooks/useTranslations';

// Déclarations de types temporaires pour résoudre les erreurs JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Interface pour les alertes
interface Alert {
  type: 'warning' | 'info' | 'error';
  message: string;
  eventId: string;
  eventName: string;
  action: 'assignDS' | 'assignRiders' | 'assignStaff';
  priority: 'high' | 'medium' | 'low';
}

interface StaffSectionProps {
  staff: StaffMember[];
  onSave: (staffMember: StaffMember) => void;
  onDelete: (staffMember: StaffMember) => void;
  effectivePermissions: Partial<Record<AppSection, PermissionLevel[]>>;
  currentUser: User;
  raceEvents?: RaceEvent[];
  eventStaffAvailabilities?: EventStaffAvailability[];
  eventBudgetItems?: EventBudgetItem[];
  setEventBudgetItems?: React.Dispatch<React.SetStateAction<EventBudgetItem[]>>;
  team?: Team;
  performanceEntries?: PerformanceEntry[];
  missions?: Mission[];
  teams?: Team[];
  users?: User[];
  permissionRoles?: any[];
  vehicles?: Vehicle[];
  eventTransportLegs?: EventTransportLeg[];
  onSaveRaceEvent?: (event: RaceEvent) => Promise<void>;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const initialMissionFormState: Omit<Mission, 'id' | 'teamId' | 'status' | 'applicants'> = {
    title: '',
    role: StaffRole.ASSISTANT,
    startDate: '',
    endDate: '',
    location: '',
    description: '',
    requirements: [],
    compensationType: MissionCompensationType.FREELANCE,
    dailyRate: undefined,
    compensation: '',
};

const getEventDuration = (event: RaceEvent): number => {
    if (!event.date) return 0;
    const startDate = new Date(event.date + "T00:00:00Z");
    const endDate = event.endDate ? new Date(event.endDate + "T23:59:59Z") : startDate;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
};

const calculateDaysAssigned = (staffId: string, allEvents: RaceEvent[]): number => {
    return allEvents.reduce((total: number, event: RaceEvent) => {
        const allAssignedIds = new Set<string>(event.selectedStaffIds || []);
        STAFF_ROLES_CONFIG.flatMap(g => g.roles).forEach(roleInfo => {
            const roleKey = roleInfo.key as StaffRoleKey;
            (event[roleKey] || []).forEach(id => allAssignedIds.add(id));
        });

        if (allAssignedIds.has(staffId)) {
            return total + getEventDuration(event);
        }
        return total;
    }, 0);
};

interface GlobalPlanningTabProps {
  upcomingEvents: RaceEvent[];
  onAssign: (event: RaceEvent) => void;
}

const GlobalPlanningTab: React.FC<GlobalPlanningTabProps> = ({ upcomingEvents, onAssign }: GlobalPlanningTabProps) => {
  return (
      <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Assignation du Staff par Événement</h3>
          <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-2">
              {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event: RaceEvent) => {
                      const staffSummary = STAFF_ROLES_CONFIG.flatMap(group => group.roles)
                          .map(roleInfo => {
                              const roleKey = roleInfo.key as StaffRoleKey;
                              const assignedIds = event[roleKey] || [];
                              if (assignedIds.length > 0) {
                                  const roleLabel = roleInfo.label.replace(/\(s\)/g, '').replace(/\(s/g, '').trim();
                                  return `${roleLabel}: ${assignedIds.length}`;
                              }
                              return null;
                          })
                          .filter(Boolean)
                          .join(' | ');

                      return (
                          <button
                              key={event.id}
                              onClick={() => onAssign(event)}
                              className="w-full text-left p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          >
                              <div className="flex justify-between items-start">
                                  <div>
                                      <p className="font-bold text-gray-900">{event.name}</p>
                                      <p className="text-xs text-gray-500">{new Date(event.date + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} - {event.location}</p>
                                  </div>
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${EVENT_TYPE_COLORS[event.eventType]}`}>{event.eventType}</span>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                                  <p><strong>Staff :</strong> {staffSummary || <span className="italic">Aucun staff assigné par rôle.</span>}</p>
                              </div>
                          </button>
                      );
                  })
              ) : (
                  <p className="text-center text-gray-500 italic py-8">Aucun événement à venir.</p>
              )}
          </div>
      </div>
  );
};

export const StaffSection: React.FC<StaffSectionProps> = ({
  staff,
  onSave,
  onDelete,
  effectivePermissions,
  raceEvents,
  eventStaffAvailabilities,
  eventBudgetItems,
  setEventBudgetItems,
  currentUser,
  team,
  performanceEntries,
  missions,
  teams,
  users,
  permissionRoles,
  vehicles,
  eventTransportLegs,
  onSaveRaceEvent,
}: StaffSectionProps) => {
  // Debug: Log des props reçues
  console.log('🔍 DEBUG StaffSection - Props reçues:', {
    staff: staff,
    staffLength: staff?.length,
    currentUser: currentUser,
    effectivePermissions: effectivePermissions
  });
  
  // Protection simplifiée - seulement staff et currentUser sont requis
  if (!staff || !currentUser) {
    console.log('❌ DEBUG StaffSection - Données manquantes:', { staff: !!staff, currentUser: !!currentUser });
    return (
      <SectionWrapper title="Gestion du Staff">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <h3 className="text-xl font-semibold text-gray-700">Chargement...</h3>
          <p className="mt-2 text-gray-500">Initialisation des données...</p>
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Staff:</strong> {staff ? `${staff.length} membres` : 'Non défini'}</p>
            <p><strong>CurrentUser:</strong> {currentUser ? 'Connecté' : 'Non connecté'}</p>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  // Vérification que staff est un tableau
  if (!Array.isArray(staff)) {
    return (
      <SectionWrapper title="Gestion du Staff">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <h3 className="text-xl font-semibold text-gray-700">Erreur de données</h3>
          <p className="mt-2 text-gray-500">Format des données staff invalide.</p>
        </div>
      </SectionWrapper>
    );
  }

  const { language } = useTranslations();
  
  // --- STATE FOR ALL TABS ---
  const [activeTab, setActiveTab] = useState<'details' | 'planning' | 'missionSearch' | 'myApplications' | 'postingsManagement' | 'search'>('details');
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);
  
  // State for Staff Details Tab
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<StaffMember | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingStaffMember, setViewingStaffMember] = useState<StaffMember | null>(null);
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<StaffRole | 'all'>('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState<StaffStatus | 'all'>('all');
  
  // State for Mission Management Tab
  const [isPostMissionModalOpen, setIsPostMissionModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [newMissionData, setNewMissionData] = useState<Omit<Mission, 'id' | 'teamId' | 'status' | 'applicants'>>(initialMissionFormState);
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [missionForApplicants, setMissionForApplicants] = useState<Mission | null>(null);
  const [selectedMissionForDetails, setSelectedMissionForDetails] = useState<Mission | null>(null);
  const [viewingApplicant, setViewingApplicant] = useState<any | null>(null);
  
  // State for Assignment Modal
  const [assignmentModalEvent, setAssignmentModalEvent] = useState<RaceEvent | null>(null);
  const [modalAssignments, setModalAssignments] = useState<Partial<Record<StaffRoleKey, string[]>>>({});
  
  // Local state for data management
  const [localMissions, setLocalMissions] = useState<Mission[]>(missions || []);
  const [localStaff, setLocalStaff] = useState<StaffMember[]>(staff || []);
  const [localRaceEvents, setLocalRaceEvents] = useState<RaceEvent[]>(raceEvents || []);
  const [localEventStaffAvailabilities, setLocalEventStaffAvailabilities] = useState<EventStaffAvailability[]>(eventStaffAvailabilities || []);
  const [localPermissionRoles, setLocalPermissionRoles] = useState<any[]>([]);
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(vehicles || []);
  const [localEventTransportLegs, setLocalEventTransportLegs] = useState<EventTransportLeg[]>(eventTransportLegs || []);

  const lightInputClass = `mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500`;
  const lightSelectClass = `mt-1 block w-full pl-3 pr-10 py-2 border rounded-md shadow-sm sm:text-sm bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500`;

  // Synchronisation des données locales avec les props
  useEffect(() => {
    if (staff && Array.isArray(staff)) {
      setLocalStaff(staff);
    }
  }, [staff]);

  useEffect(() => {
    if (raceEvents && Array.isArray(raceEvents)) {
      setLocalRaceEvents(raceEvents);
    }
  }, [raceEvents]);

  useEffect(() => {
    if (missions && Array.isArray(missions)) {
      setLocalMissions(missions);
    }
  }, [missions]);

  useEffect(() => {
    if (vehicles && Array.isArray(vehicles)) {
      setLocalVehicles(vehicles);
    }
  }, [vehicles]);

  // Force la mise à jour des alertes quand les assignations changent
  useEffect(() => {
    console.log('ModalAssignments changé, recalcul des alertes...');
    console.log('Nouveau modalAssignments:', modalAssignments);
  }, [modalAssignments]);

  // Memo for details tab
  const filteredStaffMembers = useMemo(() => {
    if (!localStaff) return [];
    const filtered = localStaff.filter((member: StaffMember) => {
      const nameMatch = `${member.firstName} ${member.lastName}`.toLowerCase().includes(staffSearchTerm.toLowerCase());
      const roleMatch = staffRoleFilter === 'all' || member.role === staffRoleFilter;
      const statusMatch = staffStatusFilter === 'all' || member.status === staffStatusFilter;
      return nameMatch && roleMatch && statusMatch;
    }).sort((a: StaffMember, b: StaffMember) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
    return filtered;
  }, [localStaff, staffSearchTerm, staffRoleFilter, staffStatusFilter]);

  const upcomingEvents = useMemo(() => {
    if (!localRaceEvents) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...localRaceEvents]
        .filter(event => new Date(event.endDate || event.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [localRaceEvents]);

  // Détection automatique des alertes et actions requises
  const alertsAndActions = useMemo(() => {
    if (!localRaceEvents || !localStaff) return [];
    
    interface Alert {
      type: 'warning' | 'info' | 'error';
      message: string;
      eventId: string;
      eventName: string;
      action: 'assignDS' | 'assignRiders' | 'assignStaff';
      priority: 'high' | 'medium' | 'low';
    }
    
    const alerts: Alert[] = [];
    
    localRaceEvents.forEach((event: RaceEvent) => {
      // Vérifier si l'événement est à venir
      const eventDate = new Date(event.date);
      const today = new Date();
      if (eventDate < today) return; // Ignorer les événements passés
      
      // 1. Vérifier si un directeur sportif est assigné
      // Prendre en compte les assignations en cours (modalAssignments) ET les assignations sauvegardées
      const currentDSAssignments = modalAssignments.directeurSportifId || [];
      const savedDSAssignments = event.directeurSportifId || [];
      const hasDirecteurSportif = (currentDSAssignments.length > 0) || (savedDSAssignments.length > 0);
      
      if (!hasDirecteurSportif) {
        alerts.push({
          type: 'warning',
          message: `DS manquant pour ${event.name}`,
          eventId: event.id,
          eventName: event.name,
          action: 'assignDS',
          priority: 'high'
        });
      }
      
      // 2. Vérifier si des coureurs sont sélectionnés
      const hasRiders = event.selectedRiderIds && event.selectedRiderIds.length > 0;
      if (!hasRiders) {
        alerts.push({
          type: 'warning',
          message: `Aucun coureur sélectionné pour ${event.name}`,
          eventId: event.id,
          eventName: event.name,
          action: 'assignRiders',
          priority: 'medium'
        });
      }
      
      // 3. Vérifier si le staff minimum est assigné
      // Prendre en compte les assignations en cours ET sauvegardées
      const currentStaffAssignments = Object.values(modalAssignments).flat();
      const savedStaffAssignments = event.selectedStaffIds || [];
      const hasMinimumStaff = (currentStaffAssignments.length > 0) || 
                              (savedStaffAssignments.length > 0) ||
                              (event.directeurSportifId && event.directeurSportifId.length > 0) ||
                              (event.assistantId && event.assistantId.length > 0) ||
                              (event.mecanoId && event.mecanoId.length > 0);
      
      if (!hasMinimumStaff) {
        alerts.push({
          type: 'info',
          message: `Staff minimum non assigné pour ${event.name}`,
          eventId: event.id,
          eventName: event.name,
          action: 'assignStaff',
          priority: 'medium'
        });
      }
    });
    
    // Trier par priorité et date
    return alerts.sort((a: Alert, b: Alert) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [localRaceEvents, localStaff, modalAssignments]); // Ajout de modalAssignments comme dépendance

  const handleSaveStaff = async (staffToSave: StaffMember) => {
    try {
      console.log('handleSaveStaff appelé avec:', staffToSave);
      
      if (onSave) {
        await onSave(staffToSave);
        console.log('Staff sauvegardé avec succès');
        
        // Fermeture immédiate du modal (plus de timeout !)
        setIsDetailModalOpen(false);
      } else {
        console.warn('⚠️ onSave n\'est pas défini - sauvegarde impossible');
        alert('Erreur: fonction de sauvegarde non disponible');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du staff:', error);
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    }
  };

  const handleDeleteStaff = (staffId: string) => {
    if (!localStaff) return;
    const member = localStaff.find((s: StaffMember) => s.id === staffId);
    if (!member) return;

    setConfirmAction({
      title: `Supprimer ${member.firstName} ${member.lastName}`,
      message: "Êtes-vous sûr de vouloir supprimer ce membre du staff ? Cette action est irréversible.",
      onConfirm: () => {
        setLocalStaff((prev: StaffMember[]) => prev.filter((s: StaffMember) => s.id !== staffId));
        if (onDelete) {
          onDelete(member);
        }
      }
    });
  };

  const handleOpenAssignmentModal = (event: RaceEvent) => {
    const initialAssignments: Partial<Record<StaffRoleKey, string[]>> = {};
    STAFF_ROLES_CONFIG.flatMap(g => g.roles).forEach(r => {
      initialAssignments[r.key as StaffRoleKey] = event[r.key as StaffRoleKey] || [];
    });
    setModalAssignments(initialAssignments);
    setAssignmentModalEvent(event);
  };

  const handleSaveAssignments = async (eventId: string, assignments: Partial<Record<StaffRoleKey, string[]>>) => {
    console.log('Sauvegarde des assignations pour l\'événement:', eventId, assignments);
    
    try {
      // 1. Mettre à jour l'événement localement avec TOUTES les assignations
      let updatedEvent: RaceEvent | null = null;
      
      setLocalRaceEvents((prevEvents: RaceEvent[]) => prevEvents.map((event: RaceEvent) => {
        if (event.id === eventId) {
          // Créer un événement mis à jour avec toutes les assignations
          const eventUpdated: RaceEvent = { 
            ...event, 
            ...assignments,
            // Mettre à jour explicitement chaque propriété de rôle
            directeurSportifId: assignments.directeurSportifId || event.directeurSportifId || [],
            assistantId: assignments.assistantId || event.assistantId || [],
            mecanoId: assignments.mecanoId || event.mecanoId || [],
            entraineurId: assignments.entraineurId || event.entraineurId || [],
            respPerfId: assignments.respPerfId || event.respPerfId || []
          };
          
          // Mettre à jour selectedStaffIds avec tous les staff assignés
          const allAssignedStaff = new Set<string>();
          Object.values(assignments).forEach((roleIds: string[] | undefined) => {
            if (Array.isArray(roleIds)) {
              roleIds.forEach((id: string) => allAssignedStaff.add(id));
            }
          });
          
          eventUpdated.selectedStaffIds = Array.from(allAssignedStaff);
          console.log('🔄 Événement mis à jour avec toutes les assignations:', eventUpdated);
          
          // Stocker l'événement mis à jour pour la sauvegarde
          updatedEvent = eventUpdated;
          return eventUpdated;
        }
        return event;
      }));

      // 2. Synchronisation bidirectionnelle : mettre à jour les profils staff
      setLocalStaff((prevStaff: StaffMember[]) => prevStaff.map((staffMember: StaffMember) => {
        const isAssignedToThisEvent = Object.values(assignments).some((roleIds: string[] | undefined) => 
          Array.isArray(roleIds) && roleIds.includes(staffMember.id)
        );
        
        if (isAssignedToThisEvent) {
          // Ajouter l'événement à la liste des événements du staff
          const updatedStaffMember = { ...staffMember, assignedEvents: [...(staffMember as any).assignedEvents || [], eventId] };
          console.log(`Staff ${staffMember.firstName} ${staffMember.lastName} assigné à l'événement ${eventId}`);
          return updatedStaffMember;
        } else {
          // Retirer l'événement de la liste des événements du staff
          const updatedStaffMember = { 
            ...staffMember, 
            assignedEvents: (staffMember as any).assignedEvents?.filter((id: string) => id !== eventId) || [] 
          };
          console.log(`Staff ${staffMember.firstName} ${staffMember.lastName} retiré de l'événement ${eventId}`);
          return updatedStaffMember;
        }
      }));

      // 3. Synchronisation bidirectionnelle : mettre à jour les profils véhicules
      if (vehicles && vehicles.length > 0) {
        setLocalVehicles((prevVehicles: Vehicle[]) => prevVehicles.map((vehicle: Vehicle) => {
          const isAssignedToThisEvent = (assignmentModalEvent && assignmentModalEvent.selectedVehicleIds && Array.isArray(assignmentModalEvent.selectedVehicleIds) && assignmentModalEvent.selectedVehicleIds.includes(vehicle.id)) || false;
          
          if (isAssignedToThisEvent) {
            const updatedVehicle = { ...vehicle, assignedEvents: [...(vehicle as any).assignedEvents || [], eventId] };
            console.log(`Véhicule ${vehicle.name} assigné à l'événement ${eventId}`);
            return updatedVehicle;
          } else {
            const updatedVehicle = { 
              ...vehicle, 
              assignedEvents: (vehicle as any).assignedEvents?.filter((id: string) => id !== eventId) || [] 
            };
            console.log(`Véhicule ${vehicle.name} retiré de l'événement ${eventId}`);
            return updatedVehicle;
          }
        }));
      }

      // 4. Attendre que l'état soit mis à jour avant de sauvegarder
      console.log('⏳ Attente de la mise à jour de l\'état local...');
      
      // 5. Réinitialiser les assignations du modal pour forcer la mise à jour des alertes
      setModalAssignments({});
      
      // 6. Debug: Vérifier que les alertes se mettent à jour
      console.log('✅ Assignations sauvegardées localement !');
      console.log('Nouvelles assignations:', assignments);
      console.log('Synchronisation bidirectionnelle effectuée');
      
      // 7. CALCUL AUTOMATIQUE DU BUDGET DES VACATAIRES
      console.log('💰 Calcul automatique du budget des vacataires...');
      const vacataireBudgetItems = calculateVacataireBudget(eventId, assignments);
      
      if (vacataireBudgetItems.length > 0) {
        console.log(`💰 ${vacataireBudgetItems.length} éléments de budget vacataire calculés:`, vacataireBudgetItems);
        
        // Sauvegarder les éléments de budget dans Firebase
        if (team?.id) {
          try {
            for (const budgetItem of vacataireBudgetItems) {
              await firebaseService.saveData(
                team.id,
                "eventBudgetItems",
                budgetItem
              );
            }
            console.log('✅ Budget des vacataires sauvegardé dans Firebase');
          } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde du budget des vacataires:', error);
          }
        }
        
        // Mettre à jour les éléments de budget existants ou en créer de nouveaux
        if (eventBudgetItems && setEventBudgetItems) {
          setEventBudgetItems((prevBudgetItems: EventBudgetItem[]) => {
            // Supprimer les anciens éléments de budget vacataire pour cet événement
            const filteredItems = prevBudgetItems.filter(item => 
              !(item.category === BudgetItemCategory.SALAIRES && 
                item.description.includes('Vacataire') && 
                item.eventId === eventId)
            );
            
            // Récupérer les coûts réels existants pour les préserver
            const existingActualCosts = new Map<string, number>();
            prevBudgetItems
              .filter(item => item.eventId === eventId && item.category === BudgetItemCategory.SALAIRES && item.description.includes('Vacataire'))
              .forEach(item => {
                if (item.actualCost !== undefined) {
                  existingActualCosts.set(item.id, item.actualCost);
                }
              });
            
            // Préserver les coûts réels existants
            const preservedVacataireItems = vacataireBudgetItems.map(item => ({
              ...item,
              actualCost: existingActualCosts.get(item.id) || item.actualCost
            }));
            
            // Ajouter les nouveaux éléments de budget vacataire
            return [...filteredItems, ...preservedVacataireItems];
          });
          
          console.log('✅ Budget des vacataires mis à jour automatiquement');
        } else {
          console.warn('⚠️ Impossible de mettre à jour le budget : setEventBudgetItems non disponible');
        }
      } else {
        console.log('ℹ️ Aucun vacataire assigné, pas de budget à calculer');
      }
      
      // 8. SAUVEGARDE IMMÉDIATE FIREBASE (plus de timeout !)
      console.log('🚀 Démarrage immédiat de la sauvegarde Firebase...');
      
      // Sauvegarde immédiate de l'événement
      if (updatedEvent && onSaveRaceEvent) {
        try {
          console.log('🚀 Lancement de la sauvegarde Firebase pour l\'événement:', updatedEvent.id);
          await onSaveRaceEvent(updatedEvent);
          console.log('✅ Événement sauvegardé avec succès en base de données');
        } catch (error) {
          console.error('❌ Erreur lors de la sauvegarde Firebase de l\'événement:', error);
        }
      }
      
      // Sauvegarde immédiate des profils staff
      if (onSave) {
        try {
          console.log('🔄 Sauvegarde automatique des profils staff mis à jour...');
          
          // Récupérer tous les staff qui ont été modifiés
          const updatedStaffMembers = localStaff.filter((staffMember: StaffMember) => {
            const isAssignedToThisEvent = Object.values(assignments).some((roleIds: string[] | undefined) => 
              Array.isArray(roleIds) && roleIds.includes(staffMember.id)
            );
            const wasAssignedToThisEvent = ((staffMember as any).assignedEvents && Array.isArray((staffMember as any).assignedEvents) && (staffMember as any).assignedEvents.includes(eventId)) || false;
            const hasChanged = isAssignedToThisEvent !== wasAssignedToThisEvent;
            
            if (hasChanged) {
              console.log(`🔄 Changement détecté pour ${staffMember.firstName} ${staffMember.lastName}:`, {
                wasAssigned: wasAssignedToThisEvent,
                isNowAssigned: isAssignedToThisEvent,
                eventId: eventId
              });
            }
            
            return hasChanged;
          });
          
          console.log(`📝 ${updatedStaffMembers.length} profils staff à sauvegarder:`, updatedStaffMembers.map((s: StaffMember) => `${s.firstName} ${s.lastName}`));
          
          // Sauvegarde en parallèle pour plus de rapidité
          const savePromises = updatedStaffMembers.map(async (staffMember: StaffMember) => {
            await onSave(staffMember);
            console.log(`✅ Profil ${staffMember.firstName} ${staffMember.lastName} sauvegardé`);
          });
          
          await Promise.all(savePromises);
          console.log('🎉 Tous les profils staff ont été sauvegardés avec succès !');
          
          // Sauvegarde des véhicules
          if (vehicles && vehicles.length > 0) {
            console.log('🚗 Sauvegarde automatique des profils véhicules mis à jour...');
            
            const updatedVehicles = vehicles.filter((vehicle: Vehicle) => {
              const isAssignedToThisEvent = (assignmentModalEvent && assignmentModalEvent.selectedVehicleIds && Array.isArray(assignmentModalEvent.selectedVehicleIds) && assignmentModalEvent.selectedVehicleIds.includes(vehicle.id)) || false;
              const wasAssignedToThisEvent = ((vehicle as any).assignedEvents && Array.isArray((vehicle as any).assignedEvents) && (vehicle as any).assignedEvents.includes(eventId)) || false;
              return isAssignedToThisEvent !== wasAssignedToThisEvent;
            });
            
            if (updatedVehicles.length > 0) {
              console.log(`📝 ${updatedVehicles.length} véhicules à sauvegarder:`, updatedVehicles.map(v => `${v.name} (${v.licensePlate})`));
              console.log('💾 Véhicules prêts pour sauvegarde en base de données');
            }
          }
        } catch (error) {
          console.error('❌ Erreur lors de la sauvegarde des profils staff:', error);
          alert('⚠️ Erreur lors de la sauvegarde des profils staff. Vérifiez la console pour plus de détails.');
        }
      }

      // 8. Notification de succès
      alert('✅ Assignations sauvegardées avec succès !\n\nSynchronisation bidirectionnelle effectuée :\n- Événement mis à jour et sauvegardé\n- Profils staff mis à jour et sauvegardés\n- Profils véhicules mis à jour\n\n🚀 Sauvegarde Firebase terminée !');

      // 9. Fermer le modal et réinitialiser
      setAssignmentModalEvent(null);
      setModalAssignments({});
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des assignations:', error);
      alert('Erreur lors de la sauvegarde des assignations. Veuillez réessayer.');
    }
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaffMember(member);
    setIsDetailModalOpen(true);
  };

  const openViewModal = (member: StaffMember) => {
    setViewingStaffMember(member);
    setIsViewModalOpen(true);
  };
  const openAddNewMissionModal = () => {
    setEditingMission(null);
    setNewMissionData(initialMissionFormState);
    setIsPostMissionModalOpen(true);
  };

  const openEditMissionModal = (mission: Mission) => {
      setEditingMission(mission);
      setNewMissionData({
          ...mission,
          requirements: mission.requirements || [],
      });
      setIsPostMissionModalOpen(true);
  };

  const handleDeleteMission = (missionToDelete: Mission) => {
      setConfirmAction({
          title: `Supprimer l'annonce "${missionToDelete.title}"`,
          message: "Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.",
          onConfirm: () => {
              setLocalMissions((prev: Mission[]) => prev.filter((m: Mission) => m.id !== missionToDelete.id));
          }
      });
  };
  
  const handleUpdateMissionStatus = (missionId: string, status: MissionStatus) => {
    setLocalMissions((prev: Mission[]) => prev.map((m: Mission) => m.id === missionId ? { ...m, status } : m));
  };

  const handleSaveMission = () => {
    if (!team) return;
    
    if (editingMission) {
        setLocalMissions((prev: Mission[]) => prev.map((m: Mission) => 
            m.id === editingMission.id 
            ? { ...m, ...newMissionData, id: editingMission.id, teamId: team.id } 
            : m
        ));
    } else {
        const newMission: Mission = {
            ...newMissionData,
            id: generateId(),
            teamId: team.id,
            status: MissionStatus.OPEN,
            applicants: []
        };
        setLocalMissions((prev: Mission[]) => [...prev, newMission]);
    }
    setIsPostMissionModalOpen(false);
    setEditingMission(null);
  };

  const renderDetailsTab = () => (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={staffSearchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setStaffSearchTerm(e.target.value)}
            className={lightInputClass}
          />
          <select value={staffRoleFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStaffRoleFilter(e.target.value as StaffRole | 'all')} className={lightSelectClass}>
            <option value="all">Tous les rôles</option>
            {Object.values(StaffRole).map((role: StaffRole) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select value={staffStatusFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStaffStatusFilter(e.target.value as StaffStatus | 'all')} className={lightSelectClass}>
            <option value="all">Tous les statuts</option>
            {Object.values(StaffStatus).map((status: StaffStatus) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaffMembers.map((member: StaffMember) => {
            const daysAssigned = calculateDaysAssigned(member.id, localRaceEvents);
            return (
              <div key={member.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col border">
                <div className="p-4 flex-grow">
                    <div className="flex items-center space-x-4 mb-3">
                        {member.photoUrl ? <img src={member.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover"/> : <UserCircleIcon className="w-16 h-16 text-gray-400"/>}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{member.firstName} {member.lastName}</h3>
                            <p className={`text-sm font-semibold px-2 py-0.5 mt-1 inline-block rounded-full ${STAFF_ROLE_COLORS[member.role] || STAFF_ROLE_COLORS[StaffRole.AUTRE]}`}>{member.customRole || member.role}</p>
                        </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                        <p><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STAFF_STATUS_COLORS[member.status]}`}>{member.status}</span></p>
                        {member.phone && <p className="flex items-center"><PhoneIcon className="w-4 h-4 mr-2 text-gray-400"/> {member.phone}</p>}
                        {member.email && <p className="flex items-center"><MailIcon className="w-4 h-4 mr-2 text-gray-400"/> {member.email}</p>}
                        {member.address?.city && <p className="flex items-center"><LocationMarkerIcon className="w-4 h-4 mr-2 text-gray-400"/> {member.address.city}</p>}
                        <div className="pt-2">
                            <p className="flex items-center font-semibold"><CalendarDaysIcon className="w-4 h-4 mr-2 text-gray-400"/> Jours de mission : {daysAssigned}</p>
                            {(member as any).assignedEvents && (member as any).assignedEvents.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Événements assignés :</p>
                                    <div className="space-y-1">
                                        {(member as any).assignedEvents.slice(0, 3).map((eventId: string) => {
                                            const event = localRaceEvents.find((e: RaceEvent) => e.id === eventId);
                                            if (!event) return null;
                                            
                                            // Déterminer le rôle assigné pour cet événement
                                            let assignedRole = 'Staff';
                                            if (event.directeurSportifId && Array.isArray(event.directeurSportifId) && event.directeurSportifId.includes(member.id)) assignedRole = 'Directeur Sportif';
                                            else if (event.assistantId && Array.isArray(event.assistantId) && event.assistantId.includes(member.id)) assignedRole = 'Assistant';
                                            else if (event.mecanoId && Array.isArray(event.mecanoId) && event.mecanoId.includes(member.id)) assignedRole = 'Mécanicien';
                                            else if (event.entraineurId && Array.isArray(event.entraineurId) && event.entraineurId.includes(member.id)) assignedRole = 'Entraîneur';
                                            else if (event.respPerfId && Array.isArray(event.respPerfId) && event.respPerfId.includes(member.id)) assignedRole = 'Resp. Performance';
                                            
                                            return (
                                                <div key={eventId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    <div className="font-medium">{event.name}</div>
                                                    <div className="text-blue-600">{new Date(event.date).toLocaleDateString('fr-FR')}</div>
                                                    <div className="text-blue-500 font-semibold">{assignedRole}</div>
                                                </div>
                                            );
                                        })}
                                        {(member as any).assignedEvents.length > 3 && (
                                            <div className="text-xs text-gray-500">
                                                +{(member as any).assignedEvents.length - 3} autres...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-3 bg-gray-50 border-t flex justify-end space-x-2">
                    <ActionButton onClick={() => openViewModal(member)} variant="primary" size="sm" icon={<EyeIcon className="w-4 h-4"/>}>Voir</ActionButton>
                    <ActionButton onClick={() => openEditModal(member)} variant="secondary" size="sm" icon={<PencilIcon className="w-4 h-4"/>}>Modifier</ActionButton>
                    <ActionButton onClick={() => handleDeleteStaff(member.id)} variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4"/>}>Supprimer</ActionButton>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );

  const renderPlanningTab = () => (
    <div className="space-y-6">
      {/* Section Alertes & Actions Requises */}
      {alertsAndActions.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Alertes & Actions Requises</h3>
          <div className="space-y-3">
            {alertsAndActions.map((alert: Alert, index: number) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                alert.type === 'warning' ? 'bg-red-50 border-red-400' :
                alert.type === 'info' ? 'bg-blue-50 border-blue-400' :
                'bg-yellow-50 border-yellow-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 ${
                      alert.type === 'warning' ? 'text-red-500' :
                      alert.type === 'info' ? 'text-blue-500' :
                      'text-yellow-500'
                    }`}>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${
                        alert.type === 'warning' ? 'text-red-800' :
                        alert.type === 'info' ? 'text-blue-800' :
                        'text-yellow-800'
                      }`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Priorité: {alert.priority === 'high' ? 'Élevée' : alert.priority === 'medium' ? 'Moyenne' : 'Faible'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {alert.action === 'assignDS' && (
                      <ActionButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const event = localRaceEvents.find((e: RaceEvent) => e.id === alert.eventId);
                          if (event) {
                            setAssignmentModalEvent(event);
                            // Pré-sélectionner l'onglet directeur sportif
                            const initialAssignments = { directeurSportifId: event.directeurSportifId || [] };
                            setModalAssignments(initialAssignments);
                          }
                        }}
                      >
                        Assigner DS
                      </ActionButton>
                    )}
                    {alert.action === 'assignRiders' && (
                      <ActionButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          // Naviguer vers la section des effectifs pour assigner des coureurs
                          // Ici vous pouvez implémenter la navigation vers la section appropriée
                          window.alert('Navigation vers la section Effectifs pour assigner des coureurs');
                        }}
                      >
                        Assigner Coureurs
                      </ActionButton>
                    )}
                    {alert.action === 'assignStaff' && (
                      <ActionButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const event = localRaceEvents.find((e: RaceEvent) => e.id === alert.eventId);
                          if (event) {
                            setAssignmentModalEvent(event);
                          }
                        }}
                      >
                        Assigner Staff
                      </ActionButton>
                    )}
                    <ActionButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const event = localRaceEvents.find((e: RaceEvent) => e.id === alert.eventId);
                        if (event) {
                          setAssignmentModalEvent(event);
                        }
                      }}
                    >
                      Voir
                    </ActionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Planning Global du Staff</h3>
        {upcomingEvents && upcomingEvents.length > 0 ? (
          <GlobalPlanningTab upcomingEvents={upcomingEvents} onAssign={handleOpenAssignmentModal} />
        ) : (
          <p className="text-center text-gray-500 italic py-8">Aucun événement à venir pour le planning.</p>
        )}
      </div>
    </div>
  );
  const renderSearchTab = () => (
    <StaffSearchTab
      allStaff={localStaff}
      raceEvents={localRaceEvents}
      teamAddress={team?.address}
      performanceEntries={performanceEntries}
    />
  );
  
  const renderMissionSearchTab = () => (
    <MissionSearchSection
      missions={missions}
      teams={teams}
      currentUser={currentUser}
      setMissions={setLocalMissions}
    />
  );

  const renderMyApplicationsTab = () => {
    if (!currentUser?.id || !Array.isArray(localMissions)) return <div className="text-center text-gray-500">Chargement des candidatures...</div>;
            const myApplications = localMissions.filter((m: Mission) => m.applicants && Array.isArray(m.applicants) && m.applicants.includes(currentUser.id));
    return (
        <div className="space-y-3">
            <h3 className="text-xl font-semibold">Mes Candidatures</h3>
            {myApplications.length > 0 ? myApplications.map((mission: Mission) => (
                <div key={mission.id} className="p-3 bg-white rounded-md border flex justify-between items-center">
                    <div>
                        <p className="font-bold">{mission.title} - <span className="font-normal text-gray-600">{teams?.find((t: Team) => t.id === mission.teamId)?.name}</span></p>
                        <p className="text-sm text-gray-500">Statut: En attente</p>
                    </div>
                    <ActionButton variant="secondary" size="sm" onClick={() => setSelectedMissionForDetails(mission)}>Voir l'annonce</ActionButton>
                </div>
            )) : <p className="italic text-gray-500">Vous n'avez postulé à aucune mission.</p>}
        </div>
    );
  };
  
  const renderPostingsManagementTab = () => {
    if (!currentUser?.permissionRole || !Array.isArray(localMissions)) return <div className="text-center text-gray-500">Chargement des annonces...</div>;
    if (currentUser.permissionRole !== TeamRole.ADMIN && currentUser.permissionRole !== TeamRole.EDITOR) {
      return null;
    }
    const myTeamMissions = localMissions.filter((m: Mission) => m.teamId === team?.id);
    const openMissions = myTeamMissions.filter((m: Mission) => m.status === MissionStatus.OPEN).sort((a: Mission, b: Mission) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const archivedMissions = myTeamMissions.filter((m: Mission) => m.status !== MissionStatus.OPEN).sort((a: Mission, b: Mission) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    
    const MissionListItem: React.FC<{ mission: Mission }> = ({ mission }) => (
         <div className="p-3 bg-white rounded-md border flex justify-between items-center flex-wrap gap-2">
             <div>
                <p className="font-bold">{mission.title} ({mission.role})</p>
                <p className="text-sm text-gray-500">Statut: {mission.status} - Du {new Date(mission.startDate+'T12:00:00Z').toLocaleDateString('fr-CA')} au {new Date(mission.endDate+'T12:00:00Z').toLocaleDateString('fr-CA')}</p>
             </div>
             <div className="flex-shrink-0 space-x-2">
                {mission.status === MissionStatus.OPEN ? (
                    <ActionButton onClick={() => handleUpdateMissionStatus(mission.id, MissionStatus.CLOSED)} variant="warning" size="sm">Clôturer</ActionButton>
                ) : (
                    <ActionButton onClick={() => handleUpdateMissionStatus(mission.id, MissionStatus.OPEN)} variant="primary" size="sm">Ré-ouvrir</ActionButton>
                )}
                <ActionButton onClick={() => openEditMissionModal(mission)} variant="secondary" size="sm" icon={<PencilIcon className="w-4 h-4"/>}/>
                <ActionButton onClick={() => handleDeleteMission(mission)} variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4"/>}/>
                <ActionButton onClick={() => { setMissionForApplicants(mission); setIsApplicantsModalOpen(true); }}>
                    Voir Candidats ({mission.applicants?.length || 0})
                </ActionButton>
             </div>
         </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Annonces de Mon Équipe</h3>
                <ActionButton onClick={openAddNewMissionModal} icon={<PlusCircleIcon className="w-5 h-5"/>}>Publier une mission</ActionButton>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2 border-b pb-1">Annonces Actives</h4>
              <div className="space-y-3">
                {openMissions.length > 0 ? (
                  openMissions.map((m: Mission) => <MissionListItem key={m.id} mission={m} />)
                ) : (
                  <p className="italic text-gray-500 p-3">Aucune annonce active.</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-2 border-b pb-1">Annonces Archivées</h4>
              <div className="space-y-3">
                {archivedMissions.length > 0 ? (
                  archivedMissions.map((m: Mission) => <MissionListItem key={m.id} mission={m} />)
                ) : (
                  <p className="italic text-gray-500 p-3">Aucune annonce archivée.</p>
                )}
              </div>
            </div>
        </div>
    );
  };

  const calculateVacataireBudget = (eventId: string, assignments: Partial<Record<StaffRoleKey, string[]>>): EventBudgetItem[] => {
    const budgetItems: EventBudgetItem[] = [];
    
    // Récupérer l'événement pour connaître ses dates
    const event = localRaceEvents.find(e => e.id === eventId);
    if (!event) return budgetItems;
    
    // Récupérer tous les déplacements pour cet événement
    const transportLegsForEvent = localEventTransportLegs.filter(leg => leg.eventId === eventId);
    
    // Calculer la durée de l'événement
    const startDate = new Date(event.date + 'T00:00:00Z');
    const endDate = new Date((event.endDate || event.date) + 'T23:59:59Z');
    const eventDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Map pour éviter les doublons (un vacataire peut être assigné à la fois à l'événement ET aux déplacements)
    const vacataireCosts = new Map<string, { 
      totalCost: number; 
      description: string; 
      notes: string; 
      source: 'event' | 'transport' | 'both' 
    }>();
    
    // 1. Calculer le coût des vacataires assignés directement à l'événement
    Object.entries(assignments).forEach(([roleKey, staffIds]) => {
      if (!Array.isArray(staffIds)) return;
      
      staffIds.forEach(staffId => {
        const staffMember = localStaff.find(s => s.id === staffId);
        if (!staffMember || staffMember.status !== StaffStatus.VACATAIRE || !staffMember.dailyRate) return;
        
        const totalCost = staffMember.dailyRate * eventDurationDays;
        const description = `Vacataire ${staffMember.firstName} ${staffMember.lastName} - ${roleKey} (${eventDurationDays} jour${eventDurationDays > 1 ? 's' : ''})`;
        const notes = `Tarif journalier: ${staffMember.dailyRate}€/jour\nRôle: ${roleKey}\nPériode: ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`;
        
        vacataireCosts.set(staffId, {
          totalCost,
          description,
          notes,
          source: 'event'
        });
      });
    });
    
    // 2. Calculer le coût des vacataires assignés aux déplacements
    transportLegsForEvent.forEach(leg => {
      if (!leg.occupants) return;
      
      leg.occupants.forEach(occupant => {
        if (occupant.type !== 'staff') return;
        
        const staffMember = localStaff.find(s => s.id === occupant.id);
        if (!staffMember || staffMember.status !== StaffStatus.VACATAIRE || !staffMember.dailyRate) return;
        
        // Calculer la durée du déplacement
        let transportDurationDays = 1;
        if (leg.departureDate && leg.arrivalDate) {
          const depDate = new Date(leg.departureDate + 'T12:00:00Z');
          const arrDate = new Date(leg.arrivalDate + 'T12:00:00Z');
          transportDurationDays = Math.max(1, Math.ceil((arrDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        }
        
        const transportCost = staffMember.dailyRate * transportDurationDays;
        const transportDescription = `Vacataire ${staffMember.firstName} ${staffMember.lastName} - Transport ${leg.direction} (${transportDurationDays} jour${transportDurationDays > 1 ? 's' : ''})`;
        const transportNotes = `Tarif journalier: ${staffMember.dailyRate}€/jour\nTransport: ${leg.direction}\nDépart: ${leg.departureDate ? new Date(leg.departureDate).toLocaleDateString('fr-FR') : 'N/A'}\nArrivée: ${leg.arrivalDate ? new Date(leg.arrivalDate).toLocaleDateString('fr-FR') : 'N/A'}`;
        
        if (vacataireCosts.has(occupant.id)) {
          // Le vacataire est déjà assigné à l'événement, ajouter le coût du transport
          const existing = vacataireCosts.get(occupant.id)!;
          const totalCost = existing.totalCost + transportCost;
          const combinedDescription = `${existing.description} + Transport ${leg.direction}`;
          const combinedNotes = `${existing.notes}\n\n${transportNotes}`;
          
          vacataireCosts.set(occupant.id, {
            totalCost,
            description: combinedDescription,
            notes: combinedNotes,
            source: 'both'
          });
        } else {
          // Le vacataire n'est assigné qu'au transport
          vacataireCosts.set(occupant.id, {
            totalCost: transportCost,
            description: transportDescription,
            notes: transportNotes,
            source: 'transport'
          });
        }
      });
    });
    
    // 3. Créer les éléments de budget
    vacataireCosts.forEach((data, staffId) => {
      const budgetItem: EventBudgetItem = {
        id: `vacataire_${staffId}_${eventId}_${Date.now()}`,
        eventId: eventId,
        category: BudgetItemCategory.SALAIRES,
        description: data.description,
        estimatedCost: data.totalCost,
        actualCost: undefined,
        notes: data.notes,
      };
      
      budgetItems.push(budgetItem);
      
      const staffMember = localStaff.find(s => s.id === staffId);
      if (staffMember) {
        console.log(`💰 Budget vacataire calculé pour ${staffMember.firstName} ${staffMember.lastName}: ${data.totalCost}€ (Source: ${data.source})`);
      }
    });
    
    return budgetItems;
  };

  return (
    <SectionWrapper title="Gestion du Staff">
      <div className="space-y-6">
        {/* Tabs Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Détails du Staff
            </button>
            <button
              onClick={() => setActiveTab('planning')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'planning'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Planning Global
              {alertsAndActions.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {alertsAndActions.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'planning' && renderPlanningTab()}

        {/* Add Staff Button */}
        <div className="flex justify-end">
          <ActionButton
            onClick={() => {
              setEditingStaffMember(null);
              setIsDetailModalOpen(true);
            }}
            icon={<PlusCircleIcon className="w-4 h-4" />}
          >
            Ajouter un Membre du Staff
          </ActionButton>
        </div>
      </div>

      {/* Staff Detail Modal */}
      {isDetailModalOpen && (
        <StaffDetailModal 
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          staffMember={editingStaffMember}
          onSave={handleSaveStaff}
          allRaceEvents={raceEvents}
          performanceEntries={performanceEntries}
          daysAssigned={editingStaffMember ? calculateDaysAssigned(editingStaffMember.id, raceEvents || []) : 0}
        />
      )}

      {/* Staff View Modal */}
      {isViewModalOpen && viewingStaffMember && (
        <StaffViewModal 
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          staffMember={viewingStaffMember}
          allRaceEvents={raceEvents}
          performanceEntries={performanceEntries}
          daysAssigned={calculateDaysAssigned(viewingStaffMember.id, raceEvents || [])}
        />
      )}

      {/* Assignment Modal */}
      {assignmentModalEvent && (
        <Modal isOpen={!!assignmentModalEvent} onClose={() => setAssignmentModalEvent(null)} title={`Assignation Staff et Véhicules: ${assignmentModalEvent.name}`}>

          
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {STAFF_ROLES_CONFIG.map(group => (
              <div key={group.group} className="mb-4">
                <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">{group.group}</h4>
                <div className="space-y-3">
                  {group.roles.map(roleInfo => {
                    const roleKey = roleInfo.key as StaffRoleKey;
                    const selectedForRole = modalAssignments[roleKey] || [];
                    
                    return (
                      <div key={roleKey}>
                        <label className="block text-sm font-medium text-gray-700">{roleInfo.label}</label>
                        <div className="mt-1 p-2 border rounded-md space-y-1 bg-gray-50 max-h-40 overflow-y-auto">
                           {/* Restriction : Un staff ne peut être assigné qu'à un seul poste */}
                           <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                             <strong>⚠️ Restriction :</strong> Un staff ne peut être assigné qu'à un seul poste
                           </div>
                           
                                                       {localStaff && localStaff
                              .map((member: StaffMember) => {
                            // Vérifier la disponibilité (conflits d'événements)
                            const isUnavailable = localRaceEvents.some((otherEvent: RaceEvent) => {
                              if (otherEvent.id === assignmentModalEvent.id || !(otherEvent.selectedStaffIds || []).includes(member.id)) {
                                return false;
                              }
                              const currentEventStart = new Date(assignmentModalEvent.date + 'T00:00:00Z');
                              const currentEventEnd = new Date((assignmentModalEvent.endDate || assignmentModalEvent.date) + 'T23:59:59Z');
                              const otherEventStart = new Date(otherEvent.date + 'T00:00:00Z');
                              const otherEventEnd = new Date((otherEvent.endDate || otherEvent.date) + 'T23:59:59Z');
                              
                              return currentEventStart <= otherEventEnd && currentEventEnd >= otherEventStart;
                            });
                            
                            // Vérifier si le staff est déjà assigné à un autre poste
                            const isAlreadyAssignedElsewhere = Object.entries(modalAssignments).some(([otherRoleKey, otherRoleIds]) => {
                              if (otherRoleKey === roleKey) return false; // Même poste
                              return Array.isArray(otherRoleIds) && otherRoleIds.includes(member.id);
                            });
                            
                            const isDisabled = isUnavailable || isAlreadyAssignedElsewhere;
                            
                            return (
                              <div key={member.id} className="flex items-center">
                                <input 
                                  type="checkbox" 
                                  id={`${roleKey}-${member.id}`}
                                  checked={selectedForRole.includes(member.id)}
                                  disabled={isDisabled}
                                  onChange={() => {
                                    const isCurrentlySelected = selectedForRole.includes(member.id);
                                    
                                    if (isCurrentlySelected) {
                                      // Désélectionner : toujours autorisé
                                      const newSelection = selectedForRole.filter((id: string) => id !== member.id);
                                      setModalAssignments((prev: Partial<Record<StaffRoleKey, string[]>>) => ({...prev, [roleKey]: newSelection}));
                                    } else {
                                      // Vérifier si le staff est déjà assigné à un autre poste
                                      const isAlreadyAssignedElsewhere = Object.entries(modalAssignments).some(([otherRoleKey, otherRoleIds]) => {
                                        if (otherRoleKey === roleKey) return false; // Même poste
                                        return Array.isArray(otherRoleIds) && otherRoleIds.includes(member.id);
                                      });
                                      
                                      if (isAlreadyAssignedElsewhere) {
                                        // Empêcher l'assignation multiple
                                        window.alert(`⚠️ ${member.firstName} ${member.lastName} est déjà assigné à un autre poste. Un staff ne peut être assigné qu'à un seul poste.`);
                                        return;
                                      }
                                      
                                      // Assignation autorisée
                                      const newSelection = [...selectedForRole, member.id];
                                      setModalAssignments((prev: Partial<Record<StaffRoleKey, string[]>>) => ({...prev, [roleKey]: newSelection}));
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={`${roleKey}-${member.id}`} className={`ml-2 text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                                  {member.firstName} {member.lastName} ({member.role})
                                  {isUnavailable && (
                                    <span className="text-orange-500 font-medium"> - Non disponible (conflit d'événement)</span>
                                  )}
                                  {isAlreadyAssignedElsewhere && !isUnavailable && (
                                    <span className="text-red-500 font-medium"> - Déjà assigné à un autre poste</span>
                                  )}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Section Véhicules */}
            {vehicles && vehicles.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Véhicules</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Véhicules assignés à l'événement</label>
                    <div className="mt-1 p-2 border rounded-md space-y-1 bg-gray-50 max-h-40 overflow-y-auto">
                      {vehicles.map((vehicle: Vehicle) => {
                        const isAssignedToThisEvent = assignmentModalEvent.selectedVehicleIds?.includes(vehicle.id) || false;
                        const isUnavailable = localRaceEvents.some((otherEvent: RaceEvent) => {
                          if (otherEvent.id === assignmentModalEvent.id || !(otherEvent.selectedVehicleIds || []).includes(vehicle.id)) {
                            return false;
                          }
                          const currentEventStart = new Date(assignmentModalEvent.date + 'T00:00:00Z');
                          const currentEventEnd = new Date((assignmentModalEvent.endDate || assignmentModalEvent.date) + 'T23:59:59Z');
                          const otherEventStart = new Date(otherEvent.date + 'T00:00:00Z');
                          const otherEventEnd = new Date((otherEvent.endDate || otherEvent.date) + 'T23:59:59Z');
                          
                          return currentEventStart <= otherEventEnd && currentEventEnd >= otherEventStart;
                        });
                        
                        return (
                          <div key={vehicle.id} className="flex items-center">
                            <input 
                              type="checkbox" 
                              id={`vehicle-${vehicle.id}`}
                              checked={isAssignedToThisEvent}
                              disabled={isUnavailable}
                              onChange={() => {
                                const currentVehicleIds = assignmentModalEvent.selectedVehicleIds || [];
                                const newVehicleIds = isAssignedToThisEvent
                                  ? currentVehicleIds.filter((id: string) => id !== vehicle.id)
                                  : [...currentVehicleIds, vehicle.id];
                                
                                // Mettre à jour l'événement localement
                                setLocalRaceEvents((prevEvents: RaceEvent[]) => prevEvents.map((event: RaceEvent) => 
                                  event.id === assignmentModalEvent.id 
                                    ? { ...event, selectedVehicleIds: newVehicleIds }
                                    : event
                                ));
                                
                                // Mettre à jour assignmentModalEvent
                                setAssignmentModalEvent((prev: RaceEvent | null) => prev ? { ...prev, selectedVehicleIds: newVehicleIds } : null);
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`vehicle-${vehicle.id}`} className={`ml-2 text-sm ${isUnavailable ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {vehicle.name} ({vehicle.licensePlate}) {isUnavailable && "(Non dispo.)"}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t">
              <ActionButton variant="secondary" onClick={() => setAssignmentModalEvent(null)}>Annuler</ActionButton>
              <ActionButton onClick={() => handleSaveAssignments(assignmentModalEvent.id, modalAssignments)}>Sauvegarder</ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Mission Modals */}
      {missionForApplicants && (
        <Modal isOpen={isApplicantsModalOpen} onClose={() => setIsApplicantsModalOpen(false)} title={`Candidats pour : ${missionForApplicants.title}`}>
          {(missionForApplicants.applicants || []).length === 0 ? (
            <p className="italic text-gray-500 text-center py-4">Aucun candidat pour le moment.</p>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto p-1">
              {(missionForApplicants.applicants || []).map((applicantId: string) => {
                const applicantUser = users?.find((u: User) => u.id === applicantId);
                if (!applicantUser) {
                    return <div key={applicantId} className="p-2 bg-red-100 rounded-md">Profil candidat non trouvé (ID: {applicantId})</div>;
                }
                const staffProfileForApplicant = localStaff ? localStaff.find((s: StaffMember) => s.email === applicantUser.email) : null;

                const applicant = {
                    id: applicantUser.id,
                    photoUrl: (staffProfileForApplicant as StaffMember)?.photoUrl,
                    firstName: applicantUser.firstName,
                    lastName: applicantUser.lastName,
                    email: applicantUser.email,
                    phone: (staffProfileForApplicant as StaffMember)?.phone,
                    role: (staffProfileForApplicant as StaffMember)?.role || 'N/A',
                    address: (staffProfileForApplicant as StaffMember)?.address,
                    professionalSummary: (staffProfileForApplicant as StaffMember)?.professionalSummary || '',
                    skills: (staffProfileForApplicant as StaffMember)?.skills || [],
                    workHistory: (staffProfileForApplicant as StaffMember)?.workHistory || [],
                    education: (staffProfileForApplicant as StaffMember)?.education || [],
                };
                
                const ratings = performanceEntries?.flatMap((pe: PerformanceEntry) => pe.staffRatings || []).filter((r: any) => r.staffId === applicant.id && r.rating > 0) || [];
                const averageRating = ratings.length > 0 ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length : 0;
                
                return (
                    <button 
                        key={applicant.id}
                        onClick={() => setViewingApplicant(applicant)}
                        className="w-full text-left p-3 bg-gray-50 rounded-lg shadow-sm border hover:bg-gray-100 flex justify-between items-center transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {applicant.photoUrl ? (
                            <img src={applicant.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover"/>
                            ) : (
                            <UserCircleIcon className="w-10 h-10 text-gray-400" />
                            )}
                            <div>
                            <h4 className="font-semibold text-gray-800">{applicant.firstName} {applicant.lastName}</h4>
                            <p className="text-sm text-gray-600">{applicant.role}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {averageRating > 0 && (
                            <div className="flex items-center text-yellow-500 font-bold">
                                <StarIcon className="w-5 h-5 mr-1" />
                                <span>{averageRating.toFixed(1)}</span>
                            </div>
                            )}
                            <p className="text-xs text-gray-500">({ratings.length} avis)</p>
                        </div>
                    </button>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {viewingApplicant && (
        <Modal isOpen={!!viewingApplicant} onClose={() => setViewingApplicant(null)} title={`Profil de ${viewingApplicant.firstName} ${viewingApplicant.lastName}`}>
            <div key={viewingApplicant.id} className="bg-white rounded-lg overflow-hidden">
                <div className="p-4">
                    <div className="flex items-start gap-4">
                        {viewingApplicant.photoUrl ? (
                            <img src={viewingApplicant.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover"/>
                        ) : (
                            <UserCircleIcon className="w-20 h-20 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-xl font-bold text-gray-800">{viewingApplicant.firstName} {viewingApplicant.lastName}</h4>
                                    <p className="text-sm text-gray-600">{viewingApplicant.role}</p>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-600 space-y-1">
                                {viewingApplicant.phone && <p className="flex items-center"><PhoneIcon className="w-4 h-4 mr-2 text-gray-400"/> {viewingApplicant.phone}</p>}
                                {viewingApplicant.email && <p className="flex items-center"><MailIcon className="w-4 h-4 mr-2 text-gray-400"/> <a href={`mailto:${viewingApplicant.email}`} className="text-blue-600 hover:underline">{viewingApplicant.email}</a></p>}
                                {viewingApplicant.address?.city && <p className="flex items-center"><LocationMarkerIcon className="w-4 h-4 mr-2 text-gray-400"/> {viewingApplicant.address.city}, {viewingApplicant.address.country}</p>}
                            </div>
                        </div>
                    </div>

                    {viewingApplicant.professionalSummary && (
                        <div className="mt-4 pt-3 border-t">
                            <h5 className="text-sm font-semibold text-gray-700">Résumé Professionnel (CV)</h5>
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{viewingApplicant.professionalSummary}</p>
                        </div>
                    )}
                    
                    {viewingApplicant.workHistory && viewingApplicant.workHistory.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                            <h5 className="text-sm font-semibold text-gray-700">Expériences</h5>
                            <ul className="list-disc list-inside mt-1 space-y-1 text-sm text-gray-600">
                                {viewingApplicant.workHistory.map((exp: WorkExperience) => (
                                    <li key={exp.id}>
                                        <strong>{exp.position}</strong> chez {exp.company} ({exp.startDate} - {exp.endDate || 'Actuel'})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {viewingApplicant.education && viewingApplicant.education.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                            <h5 className="text-sm font-semibold text-gray-700">Formations</h5>
                            <ul className="list-disc list-inside mt-1 space-y-1 text-sm text-gray-600">
                                {viewingApplicant.education.map((edu: EducationOrCertification) => (
                                    <li key={edu.id}>
                                        <strong>{edu.degree}</strong> - {edu.institution} ({edu.year})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {viewingApplicant.skills && viewingApplicant.skills.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                            <h5 className="text-sm font-semibold text-gray-700">Compétences</h5>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {viewingApplicant.skills.map((skill: string) => (
                                    <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{skill}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
      )}

      {selectedMissionForDetails && (
        <Modal isOpen={!!selectedMissionForDetails} onClose={() => setSelectedMissionForDetails(null)} title={selectedMissionForDetails.title}>
            <div className="space-y-4 text-gray-700">
                <p><strong>Équipe:</strong> {teams?.find((t: Team) => t.id === selectedMissionForDetails.teamId)?.name}</p>
                <p><strong>Rôle:</strong> {selectedMissionForDetails.role}</p>
                <p><strong>Dates:</strong> Du {new Date(selectedMissionForDetails.startDate+'T12:00:00Z').toLocaleDateString('fr-CA')} au {new Date(selectedMissionForDetails.endDate+'T12:00:00Z').toLocaleDateString('fr-CA')}</p>
                <p><strong>Lieu:</strong> {selectedMissionForDetails.location}</p>
                <p><strong>Compensation:</strong> {selectedMissionForDetails.compensation} {selectedMissionForDetails.dailyRate ? `(${selectedMissionForDetails.dailyRate}€/jour)` : ''}</p>
                <div>
                    <strong className="font-semibold text-gray-800">Description:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{selectedMissionForDetails.description}</p>
                </div>
                {selectedMissionForDetails.requirements && selectedMissionForDetails.requirements.length > 0 && (
                    <div>
                        <strong className="font-semibold text-gray-800">Prérequis:</strong>
                        <ul className="list-disc list-inside mt-1">
                            {selectedMissionForDetails.requirements.map((req: string, i: number) => <li key={i}>{req}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </Modal>
      )}

      <Modal isOpen={isPostMissionModalOpen} onClose={() => setIsPostMissionModalOpen(false)} title={editingMission ? "Modifier la mission" : "Publier une nouvelle mission"}>
        <div className="space-y-3">
          <input type="text" placeholder="Titre de la mission" value={newMissionData.title} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMissionData((p: any) => ({ ...p, title: e.target.value }))} className={lightInputClass}/>
          <select value={newMissionData.role} onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewMissionData((p: any) => ({ ...p, role: e.target.value as StaffRole }))} className={lightSelectClass}>{Object.values(StaffRole).map((r: StaffRole) => <option key={r} value={r}>{r}</option>)}</select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={newMissionData.startDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMissionData((p: any) => ({ ...p, startDate: e.target.value }))} className={lightInputClass}/>
            <input type="date" value={newMissionData.endDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMissionData((p: any) => ({ ...p, endDate: e.target.value }))} className={lightInputClass}/>
          </div>
          <input type="text" placeholder="Lieu" value={newMissionData.location} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMissionData((p: any) => ({ ...p, location: e.target.value }))} className={lightInputClass}/>
          <textarea placeholder="Description de la mission" value={newMissionData.description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewMissionData((p: any) => ({ ...p, description: e.target.value }))} rows={3} className={lightInputClass}></textarea>
          <div>
            <label className="text-sm font-medium text-gray-700">Prérequis (un par ligne)</label>
            <textarea placeholder="Permis B obligatoire
Expérience appréciée" value={Array.isArray(newMissionData.requirements) ? newMissionData.requirements.join('\\n') : ''} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewMissionData((p: any) => ({ ...p, requirements: e.target.value.split('\\n') }))} className={lightInputClass} rows={3}></textarea>
          </div>
          <fieldset className="border p-3 rounded-md">
            <legend className="text-sm font-medium">Rémunération</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                    <label>Type de prestation</label>
                    <select value={newMissionData.compensationType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewMissionData((p: any) => ({ ...p, compensationType: e.target.value as MissionCompensationType }))} className={lightSelectClass}>
                        {Object.values(MissionCompensationType).map((ct: MissionCompensationType) => <option key={ct} value={ct}>{ct}</option>)}
                    </select>
                </div>
                {newMissionData.compensationType === MissionCompensationType.FREELANCE && (
                    <div>
                        <label>Tarif journalier (€)</label>
                        <input type="number" placeholder="150" value={newMissionData.dailyRate || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMissionData((p: any) => ({ ...p, dailyRate: e.target.value ? parseFloat(e.target.value) : undefined }))} className={lightInputClass}/>
                    </div>
                )}
            </div>
            <div className="mt-4">
                <label>Détails sur la compensation</label>
                <input type="text" placeholder="Ex: Logement et repas pris en charge" value={newMissionData.compensation} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMissionData((p: any) => ({ ...p, compensation: e.target.value }))} className={lightInputClass}/>
            </div>
          </fieldset>
          <div className="flex justify-end"><ActionButton onClick={handleSaveMission}>{editingMission ? "Sauvegarder" : "Publier"}</ActionButton></div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
          title={confirmAction.title}
          message={confirmAction.message}
        />
      )}
    </SectionWrapper>
  );
};

export default StaffSection;
