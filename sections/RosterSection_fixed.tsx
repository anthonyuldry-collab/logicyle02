import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCircleIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { RiderDetailModal } from '../components/RiderDetailModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { saveData, deleteData } from '../services/firebaseService';
import { Rider, RaceEvent, RiderEventSelection, FormeStatus, Sex, RiderQualitativeProfile, MoralStatus, HealthCondition, RiderEventStatus, RiderEventPreference, ScoutingProfile, TeamProduct, User, AppState } from '../types';
import { getAge, getAgeCategory, getLevelCategory } from '../utils/ageUtils';
import { calculateRiderCharacteristics } from '../utils/performanceCalculations';

interface RosterSectionProps {
  riders: Rider[];
  onSaveRider: (rider: Rider) => void;
  onDeleteRider: (rider: Rider) => void;
  raceEvents: RaceEvent[];
  setRaceEvents: (updater: React.SetStateAction<RaceEvent[]>) => void;
  riderEventSelections: RiderEventSelection[];
  setRiderEventSelections: (updater: React.SetStateAction<RiderEventSelection[]>) => void;
  performanceEntries: PerformanceEntry[];
  scoutingProfiles: ScoutingProfile[];
  teamProducts: TeamProduct[];
  currentUser: User;
  appState: AppState;
}

export default function RosterSection({ 
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
  appState 
}: RosterSectionProps) {
  if (!appState) {
    return <div>Chargement...</div>;
  }
  
  // Vérifications de sécurité pour éviter les erreurs undefined
  if (!riders || !Array.isArray(riders)) {
    return <div>Erreur: Données des athlètes non disponibles</div>;
  }
  
  if (!raceEvents || !Array.isArray(raceEvents)) {
    return <div>Erreur: Données des événements non disponibles</div>;
  }
  
  if (!riderEventSelections || !Array.isArray(riderEventSelections)) {
    return <div>Erreur: Données des sélections non disponibles</div>;
  }
  
  // États pour la gestion des onglets
  const [activeTab, setActiveTab] = useState<'roster' | 'seasonPlanning' | 'quality'>('roster');
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [minAgeFilter, setMinAgeFilter] = useState<number>(0);
  const [maxAgeFilter, setMaxAgeFilter] = useState<number>(100);
  
  // États pour le tri
  const [rosterSortBy, setRosterSortBy] = useState<'name' | 'firstName' | 'age' | 'ageCategory' | 'levelCategory' | 'raceDays'>('name');
  const [rosterSortDirection, setRosterSortDirection] = useState<'asc' | 'desc'>('asc');
  const [planningSortBy, setPlanningSortBy] = useState<'name' | 'raceDays'>('name');
  const [planningSortDirection, setPlanningSortDirection] = useState<'asc' | 'desc'>('asc');
  const [planningExpanded, setPlanningExpanded] = useState(true);
  const [localRaceEvents, setLocalRaceEvents] = useState(appState.raceEvents || []);
  const [includeScouts, setIncludeScouts] = useState(false);
  const [localRiderEventSelections, setLocalRiderEventSelections] = useState(appState.riderEventSelections || []);

  // États pour la qualité
  const [qualitySortField, setQualitySortField] = useState<'name' | 'age' | 'general' | 'sprint' | 'climbing' | 'puncher' | 'rouleur' | 'fatigue'>('general');
  const [qualitySortDirection, setQualitySortDirection] = useState<'asc' | 'desc'>('desc');
  
  // États pour le planning de saison
  const [planningSearchTerm, setPlanningSearchTerm] = useState('');
  const [planningGenderFilter, setPlanningGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [planningStatusFilter, setPlanningStatusFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [activePlanningTab, setActivePlanningTab] = useState<'unified' | 'monitoring'>('monitoring');
  const [riderSortField, setRiderSortField] = useState<'alphabetical' | 'raceDays' | 'potential'>('alphabetical');
  const [riderSortDirection, setRiderSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeMonitoringTab, setActiveMonitoringTab] = useState<'monitoring' | 'selections'>('monitoring');
  
  // États pour les modales
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editableRider, setEditableRider] = useState<Rider | null>(null);

  // Fonctions pour les modales
  const openViewModal = (rider: Rider) => {
    setSelectedRider(rider);
    setIsViewModalOpen(true);
  };
  
  const openEditModal = (rider: Rider) => {
    setSelectedRider(rider);
    setIsEditModalOpen(true);
  };

  // Reste du code de RosterSection sera ajouté ici...
  // Pour l'instant, retournons une structure de base
  return (
    <SectionWrapper 
      title="Annuaire de l'Equipe"
      actionButton={
        <ActionButton onClick={() => console.log('Add rider')} icon={<PlusCircleIcon className="w-5 h-5"/>}>
          Ajouter Coureur
        </ActionButton>
      }
    >
      <div className="text-center p-8">
        <p>Section en cours de reconstruction...</p>
      </div>
    </SectionWrapper>
  );
}
