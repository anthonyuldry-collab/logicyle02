import React, { useState } from 'react';
import { Rider, RaceEvent, RiderEventSelection, RiderEventStatus, Sex } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { RiderDetailModal } from '../components/RiderDetailModal';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import EyeIcon from '../components/icons/EyeIcon';
import SearchIcon from '../components/icons/SearchIcon';
import UserCircleIcon from '../components/icons/UserCircleIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTranslations } from '../hooks/useTranslations';

import { getAgeCategory } from '../utils/ageUtils';

interface RosterSectionProps {
  raceEvents: RaceEvent[];
  riders: Rider[];
  riderEventSelections: RiderEventSelection[];
  setRiderEventSelections: (selections: RiderEventSelection[]) => void;
  setRaceEvents: (events: RaceEvent[]) => void;
  appState: any;
}

export default function RosterSection({
  raceEvents,
  riders,
  riderEventSelections,
  setRiderEventSelections,
  setRaceEvents,
  appState
}: RosterSectionProps) {
  // Protection contre appState null/undefined
  if (!appState) {
    console.warn('⚠️ RosterSection: appState is null or undefined');
    return (
      <SectionWrapper title="Annuaire de l'Equipe">
        <div className="p-6 text-center text-gray-500">
          Chargement des données...
        </div>
      </SectionWrapper>
    );
  }
  const { t } = useTranslations();

  const [activeTab, setActiveTab] = useState<'roster' | 'seasonPlanning' | 'quality'>('roster');
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | Sex>('all');
  const [ageCategoryFilter, setAgeCategoryFilter] = useState<string>('all');
  const [minAgeFilter, setMinAgeFilter] = useState<number>(0);
  const [maxAgeFilter, setMaxAgeFilter] = useState<number>(100);
  const [rosterSortBy, setRosterSortBy] = useState<'name' | 'age' | 'category'>('name');
  const [rosterSortDirection, setRosterSortDirection] = useState<'asc' | 'desc'>('asc');
  const [planningSortBy, setPlanningSortBy] = useState<'name' | 'raceDays'>('name');
  const [planningSortDirection, setPlanningSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [riderToDelete, setRiderToDelete] = useState<Rider | null>(null);

  const openViewModal = (rider: Rider) => {
    setSelectedRider(rider);
    setIsViewModalOpen(true);
  };

  const handleDeleteRider = (rider: Rider) => {
    setRiderToDelete(rider);
    setIsDeleteModalOpen(true);
  };

  // Fonction de tri pour l'effectif
  const handleRosterSort = (sortBy: 'name' | 'age' | 'category') => {
    if (rosterSortBy === sortBy) {
      setRosterSortDirection(rosterSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRosterSortBy(sortBy);
      setRosterSortDirection('asc');
    }
  };

  // Fonction de tri pour le planning
  const handlePlanningSort = (sortBy: 'name' | 'raceDays') => {
    if (planningSortBy === sortBy) {
      setPlanningSortDirection(planningSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPlanningSortBy(sortBy);
      setPlanningSortDirection('asc');
    }
  };

  // Filtrage et tri des coureurs pour l'effectif
  const filteredRiders = riders.filter(rider => {
    if (searchTerm) {
      const fullName = `${rider.firstName} ${rider.lastName}`.toLowerCase();
      if (!fullName.includes(searchTerm.toLowerCase())) return false;
    }
    if (genderFilter !== 'all' && rider.sex !== genderFilter) return false;
    
    const { age } = getAgeCategory(rider.birthDate);
    if (age !== null) {
      if (age < minAgeFilter || age > maxAgeFilter) return false;
    }
    
    if (ageCategoryFilter !== 'all') {
      const { category } = getAgeCategory(rider.birthDate);
      if (category !== ageCategoryFilter) return false;
    }
    
    
    
    return true;
  });

  // Tri des coureurs filtrés
  const sortedRidersForAdmin = [...filteredRiders].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (rosterSortBy) {
      case 'name':
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case 'age':
        const aAge = getAgeCategory(a.birthDate).age || 0;
        const bAge = getAgeCategory(b.birthDate).age || 0;
        aValue = aAge;
        bValue = bAge;
        break;
      case 'category':
        aValue = getAgeCategory(a.birthDate).category;
        bValue = getAgeCategory(b.birthDate).category;
        break;

      default:
        return 0;
    }
    
    if (rosterSortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Calcul des jours de course par coureur pour le planning
  const raceDaysByRider = riders.map(rider => {
    const riderEvents = raceEvents.filter(event => 
      event.selectedRiderIds?.includes(rider.id)
    );
    return {
      rider,
      raceDays: riderEvents.length,
      events: riderEvents
    };
  });

  // Tri des coureurs pour le planning
  const sortedRidersForPlanning = [...raceDaysByRider].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (planningSortBy) {
      case 'name':
        aValue = `${a.rider.firstName} ${a.rider.lastName}`.toLowerCase();
        bValue = `${b.rider.firstName} ${b.rider.lastName}`.toLowerCase();
        break;
      case 'raceDays':
        aValue = a.raceDays;
        bValue = b.raceDays;
        break;
      default:
        return 0;
    }
    
    if (planningSortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const renderRosterTab = () => (
    <div className="bg-white p-3 rounded-lg shadow-md">
      {/* Filtres et recherche */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label htmlFor="rosterSearch" className="block text-xs font-medium text-gray-700 mb-0.5">Rechercher</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <SearchIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              id="rosterSearch"
              placeholder="Rechercher un coureur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`
                block w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md 
                leading-5 bg-white text-gray-900 placeholder-gray-500 
                focus:outline-none focus:placeholder-gray-400 focus:ring-1 
                focus:ring-blue-500 focus:border-blue-500 text-xs
              `}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="rosterGenderFilter" className="block text-xs font-medium text-gray-700 mb-0.5">Sexe</label>
          <select
            id="rosterGenderFilter"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as 'all' | Sex)}
            className="block w-full pl-3 pr-10 py-1.5 text-xs border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          >
            <option value="all">Tous</option>
            <option value={Sex.MALE}>Homme</option>
            <option value={Sex.FEMALE}>Femme</option>
          </select>
        </div>

        <div>
          <label htmlFor="ageCategoryFilter" className="block text-xs font-medium text-gray-700 mb-0.5">Categorie</label>
          <select
            id="ageCategoryFilter"
            value={ageCategoryFilter}
            onChange={(e) => setAgeCategoryFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-1.5 text-xs border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          >
            <option value="all">Toutes</option>
            <option value="U17">U17</option>
            <option value="U19">U19</option>
            <option value="U23">U23</option>
            <option value="Elite">Elite</option>
          </select>
        </div>
      </div>

      {/* Contrôles de tri */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-xs font-medium text-gray-700 mr-2">Trier par:</span>
        <button
          onClick={() => handleRosterSort('name')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            rosterSortBy === 'name' 
              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Nom {rosterSortBy === 'name' && (rosterSortDirection === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleRosterSort('age')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            rosterSortBy === 'age' 
              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Age {rosterSortBy === 'age' && (rosterSortDirection === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleRosterSort('category')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            rosterSortBy === 'category' 
              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Categorie {rosterSortBy === 'category' && (rosterSortDirection === 'asc' ? '↑' : '↓')}
        </button>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedRidersForAdmin.map(rider => (
          <div key={rider.id} className="bg-gray-50 rounded-lg shadow-md overflow-hidden flex flex-col border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="p-3">
              <div className="flex items-center space-x-3">
                {rider.photoUrl ? <img src={rider.photoUrl} alt={rider.firstName} className="w-12 h-12 rounded-full object-cover"/> : <UserCircleIcon className="w-12 h-12 text-gray-400"/>}
                <div>
                  <h3 className="text-md font-semibold text-gray-800">{rider.firstName} {rider.lastName}</h3>
                  <p className="text-xs text-gray-500">{(rider as any).qualitativeProfile || 'Profil N/A'}</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                <p><strong>Forme:</strong> {(rider as any).forme || '?'}</p>
                <p><strong>Moral:</strong> {(rider as any).moral || '?'}</p>
                <p><strong>Sante:</strong> {(rider as any).healthCondition || '-'}</p>
                
                {(() => {
                  const { category, age } = getAgeCategory(rider.birthDate);
                  return (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                                             <p><strong>Age:</strong> {age !== null ? `${age} ans` : '?'} <span className="text-blue-600 font-medium">({category})</span></p>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="mt-auto p-2 border-t border-gray-200 flex justify-end space-x-1 bg-gray-50">
              <ActionButton onClick={() => openViewModal(rider)} variant="info" size="sm" icon={<EyeIcon className="w-4 h-4"/>} title="Voir">
                <span className="sr-only">Voir</span>
              </ActionButton>
              <ActionButton onClick={() => handleDeleteRider(rider)} variant="danger" size="sm" icon={<TrashIcon className="w-4 h-4"/>} title="Supprimer">
                <span className="sr-only">Supprimer</span>
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSeasonPlanningTab = () => (
    <div className="bg-white p-3 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Planning Previsionnel de la Saison</h3>
      
      {/* Contrôles de tri pour le planning */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-xs font-medium text-gray-700 mr-2">Trier par:</span>
        <button
          onClick={() => handlePlanningSort('name')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            planningSortBy === 'name' 
              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Nom {planningSortBy === 'name' && (planningSortDirection === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handlePlanningSort('raceDays')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            planningSortBy === 'raceDays' 
              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Jours de Course {planningSortBy === 'raceDays' && (planningSortDirection === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      {/* Tableau du planning */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Coureur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Categorie</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Jours de Course</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Evenements</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Forme</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedRidersForPlanning.map(({ rider, raceDays, events }) => {
              const { category, age } = getAgeCategory(rider.birthDate);
              const forme = (rider as any).forme || 'Non defini';
              
              return (
                <tr key={rider.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {rider.photoUrl ? (
                        <img src={rider.photoUrl} alt={rider.firstName} className="w-8 h-8 rounded-full mr-3"/>
                      ) : (
                        <UserCircleIcon className="w-8 h-8 text-gray-400 mr-3"/>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{rider.firstName} {rider.lastName}</div>
                        <div className="text-sm text-gray-500">{age !== null ? `${age} ans` : 'Age inconnu'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {category}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      raceDays === 0 ? 'bg-gray-100 text-gray-600' :
                      raceDays <= 2 ? 'bg-green-100 text-green-600' :
                      raceDays <= 5 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {raceDays} jour(s)
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="space-y-1">
                      {events.slice(0, 2).map(event => (
                        <div key={event.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {event.name}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <p className="text-xs text-blue-600">+{events.length - 2} autres</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      forme === 'Excellente' ? 'text-green-600 bg-green-100' :
                      forme === 'Bonne' ? 'text-green-700 bg-green-50' :
                      forme === 'Moyenne' ? 'text-yellow-600 bg-yellow-100' :
                      forme === 'Faible' ? 'text-red-600 bg-red-100' :
                      'text-gray-600 bg-gray-100'
                    }`}>
                      {forme}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <ActionButton onClick={() => openViewModal(rider)} variant="info" size="sm" icon={<EyeIcon className="w-4 h-4"/>} title="Voir">
                      <span className="sr-only">Voir</span>
                    </ActionButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Statistiques du planning */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Repartition des Charges</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>0-2 courses:</span>
              <span className="font-medium">{sortedRidersForPlanning.filter(r => r.raceDays <= 2).length} coureurs</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>3-5 courses:</span>
              <span className="font-medium">{sortedRidersForPlanning.filter(r => r.raceDays >= 3 && r.raceDays <= 5).length} coureurs</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>6+ courses:</span>
              <span className="font-medium">{sortedRidersForPlanning.filter(r => r.raceDays >= 6).length} coureurs</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="text-sm font-semibold text-green-800 mb-2">Coureurs les Plus Actifs</h4>
          <div className="space-y-1">
            {sortedRidersForPlanning
              .filter(r => r.raceDays > 0)
              .slice(0, 3)
              .map(({ rider, raceDays }) => (
                <div key={rider.id} className="flex justify-between text-xs">
                  <span>{rider.firstName} {rider.lastName}</span>
                  <span className="font-medium text-green-600">{raceDays} courses</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h4 className="text-sm font-semibold text-orange-800 mb-2">Coureurs Disponibles</h4>
          <div className="space-y-1">
            {sortedRidersForPlanning
              .filter(r => r.raceDays === 0)
              .slice(0, 3)
              .map(({ rider }) => (
                <div key={rider.id} className="text-xs text-orange-600">
                  {rider.firstName} {rider.lastName}
                </div>
              ))}
            {sortedRidersForPlanning.filter(r => r.raceDays === 0).length > 3 && (
              <p className="text-xs text-orange-500">+{sortedRidersForPlanning.filter(r => r.raceDays === 0).length - 3} autres</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SectionWrapper 
      title="Annuaire de l'Equipe"
      actionButton={<ActionButton onClick={() => {}} icon={<PlusCircleIcon className="w-5 h-5"/>}>Ajouter Coureur</ActionButton>}
    >
      <div className="mb-2 border-b border-gray-200">
        <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
          <button 
            onClick={() => setActiveTab('roster')} 
            className={
              activeTab === 'roster' 
                ? 'border-blue-500 text-blue-600 border-b-2 py-2 px-3 text-sm font-medium' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-2 px-3 text-sm font-medium'
            }
          >
            Effectif
          </button>
          <button 
            onClick={() => setActiveTab('seasonPlanning')} 
            className={
              activeTab === 'seasonPlanning' 
                ? 'border-blue-500 text-blue-600 border-b-2 py-2 px-3 text-sm font-medium' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-2 px-3 text-sm font-medium'
            }
          >
            Planning Saison
          </button>
          <button 
            onClick={() => setActiveTab('quality')} 
            className={
              activeTab === 'quality' 
                ? 'border-blue-500 text-blue-600 border-b-2 py-2 px-3 text-sm font-medium' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-2 px-3 text-sm font-medium'
            }
          >
            Qualite d'Effectif
          </button>
        </nav>
      </div>
      
      {activeTab === 'roster' ? renderRosterTab() : 
       activeTab === 'seasonPlanning' ? renderSeasonPlanningTab() : 
       activeTab === 'quality' ? renderQualityTab() : 
       renderRosterTab()}

      {selectedRider && (
        <RiderDetailModal
          rider={selectedRider}
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          onEdit={() => setIsViewModalOpen(false)}
          onDelete={() => {
            setIsViewModalOpen(false);
            handleDeleteRider(selectedRider);
          }}
          isAdmin={true}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          setIsDeleteModalOpen(false);
          setRiderToDelete(null);
        }}
        title="Confirmer la suppression"
        message="Etes-vous sur de vouloir supprimer ce coureur ? Cette action est irreversible et supprimera toutes les donnees associees."
      />
    </SectionWrapper>
  );
}
