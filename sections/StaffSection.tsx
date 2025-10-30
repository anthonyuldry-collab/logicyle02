import React, { useState, useMemo } from 'react';
import { 
  UserGroupIcon, 
  CalendarDaysIcon,
  TrophyIcon,
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { StaffMember, RaceEvent, User, AppState, StaffRole, StaffStatus, ContractType, StaffArchive, StaffTransition, StaffEventSelection } from '../types';
import { getCurrentSeasonYear, getAvailableSeasonYears } from '../utils/seasonUtils';
import { getActiveStaffForCurrentSeason } from '../utils/rosterArchiveUtils';
import { 
  getStaffStatsForSeason, 
  getDetailedStaffStatsForSeason,
  calculateStaffDaysForSeason 
} from '../utils/staffRosterUtils';
import { StaffTransitionManager, StaffArchiveViewer, StaffArchiveDetailModal, StaffSeasonPlanning } from '../components';

interface StaffSectionProps {
  staff: StaffMember[];
  raceEvents: RaceEvent[];
  currentUser: User;
  appState: AppState;
  onSave?: (staff: StaffMember) => void;
  onDelete?: (staff: StaffMember) => void;
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

export default function StaffSection({ 
  staff = [], 
  raceEvents = [], 
  currentUser,
  appState,
  onSave,
  onDelete,
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
  // Debug logs
  console.log('🔧 StaffSection - Debug Info:');
  console.log('🔧 staff:', staff);
  console.log('🔧 staff.length:', staff?.length);
  console.log('🔧 appState:', appState);
  console.log('🔧 currentUser:', currentUser);
  console.log('🔧 raceEvents:', raceEvents?.length);

  // Vérification plus permissive pour éviter le blocage
  if (!appState && !staff) {
    console.log('🔧 StaffSection - appState and staff are undefined');
    return <div>Chargement...</div>;
  }

  // États pour la gestion des onglets
  const [activeTab, setActiveTab] = useState<'staff' | 'workload' | 'planning' | 'archives'>('planning');
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentSeasonYear());
  
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

  // Obtenir le staff actif pour la saison courante
  const activeStaff = staff && staff.length > 0 ? getActiveStaffForCurrentSeason(staff) : [];
  const handleAssignStaffToEvent = (eventId: string, staffId: string, status: any) => {
    try {
      const event = (raceEvents || []).find((e: any) => e.id === eventId);
      if (!event) return;
      const current = new Set<string>(event.selectedStaffIds || []);
      if (status === 'SELECTIONNE' || status === 'PRE_SELECTION') {
        current.add(staffId);
      } else {
        current.delete(staffId);
      }
      const updatedEvent = { ...event, selectedStaffIds: Array.from(current) };
      if (onSaveRaceEvent) {
        onSaveRaceEvent(updatedEvent);
      }
    } catch (e) {
      console.warn('handleAssignStaffToEvent error', e);
    }
  };
  
  console.log('🔧 StaffSection - activeStaff:', activeStaff);
  console.log('🔧 StaffSection - activeStaff.length:', activeStaff.length);

  // Fonction pour calculer le nombre de jours de staff depuis le début de saison
  const getStaffDays = (staffId: string) => {
    if (!raceEvents || !Array.isArray(raceEvents)) {
      console.log('🔧 getStaffDays - raceEvents not available');
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
        console.warn('🔧 getStaffDays - Error parsing event date:', event);
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
          console.warn('🔧 getStaffDays - Error calculating event duration:', event);
          return total;
        }
      }
      
      return total;
    }, 0);
    
    console.log(`👥 Jours de staff pour ${staffId} en ${currentSeason}:`, totalDays, 'jours sur', seasonEvents.length, 'événements');
    
    return totalDays;
  };

  // Fonctions pour les modales
  const openViewModal = (staffMember: StaffMember) => {
    console.log('🔍 Ouvrir modal de visualisation pour:', staffMember);
    setSelectedStaff(staffMember);
    setIsViewModalOpen(true);
  };
  
  const openEditModal = (staffMember: StaffMember) => {
    console.log('✏️ Ouvrir modal d\'édition pour:', staffMember);
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
    console.log('🗑️ Ouvrir modal de suppression pour:', staffMember);
    setSelectedStaff(staffMember);
    setIsDeleteModalOpen(true);
  };

  const handleAddStaff = () => {
    console.log('➕ Ajouter un nouveau membre du staff');
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
    console.log('💾 Sauvegarder membre du staff:', formData);
    
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
    console.log('🗑️ Supprimer membre du staff:', staffMember);
    if (onDelete) {
      onDelete(staffMember);
    }
    setIsDeleteModalOpen(false);
    setSelectedStaff(null);
  };

  // Fonctions pour la gestion des effectifs
  const handleStaffTransition = (archive: StaffArchive, transition: StaffTransition) => {
    console.log('🔄 Transition des effectifs du staff:', { archive, transition });
    
    // Ajouter l'archive à la liste
    setStaffArchives(prev => [...prev, archive]);
    
    // Notifier le parent si nécessaire
    if (onStaffTransition) {
      onStaffTransition(archive, transition);
    }
  };

  const handleViewArchive = (archive: StaffArchive) => {
    console.log('👁️ Consultation de l\'archive du staff:', archive);
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
                          {member.role ? member.role.toLowerCase() : 'staff'}
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
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Liste du Staff - {activeStaff.length} membres
          </h3>
            </div>
            
        {/* Tableau du staff */}
        <div className="bg-white shadow rounded-lg overflow-hidden max-w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Membres du Staff</h4>
            <p className="text-sm text-gray-600">
              Gestion des membres de l'équipe technique
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
                {(activeStaff || []).map((member) => {
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
                        {member.role ? member.role.toLowerCase() : 'staff'}
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

          {(activeStaff || []).length === 0 && (
            <div className="text-center py-8">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun membre du staff</h3>
              <p className="mt-1 text-sm text-gray-500">
                Aucun membre du staff n'est disponible.
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
                
  console.log('🔧 StaffSection - Rendering with staff count:', staff?.length || 0);

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
                  <p className="text-sm text-gray-900">{selectedStaff.role ? selectedStaff.role.toLowerCase() : 'staff'}</p>
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
            <div className="flex justify-end mt-6">
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