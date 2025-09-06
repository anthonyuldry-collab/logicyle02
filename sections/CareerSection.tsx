

import React, { useMemo, useState, useEffect } from 'react';
import { User, ResultItem, DisciplinePracticed, Rider, Team, ScoutingRequest, ScoutingRequestStatus, StaffMember, UserRole, TeamMembership, TeamMembershipStatus } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import TrophyIcon from '../components/icons/TrophyIcon';
import ActionButton from '../components/ActionButton';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import Modal from '../components/Modal';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import XCircleIcon from '../components/icons/XCircleIcon';
import EyeIcon from '../components/icons/EyeIcon';
import { ResultFormModal } from '../components/riderDetailTabs/ResultsTab';
import { ELIGIBLE_CATEGORIES_CONFIG } from '../constants';

interface CareerSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  setRiders: (updater: React.SetStateAction<Rider[]>) => void;
  setStaff: (updater: React.SetStateAction<StaffMember[]>) => void;
  teams: Team[];
  currentTeamId: string | null;
  onRequestTransfer: (destinationTeamId: string) => void;
  scoutingRequests: ScoutingRequest[];
  onRespondToScoutingRequest: (requestId: string, response: 'accepted' | 'rejected') => void;
  onUpdateVisibility: (updates: { isSearchable?: boolean; openToMissions?: boolean; }) => void;
  teamMemberships: TeamMembership[];
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const getCategoryLabel = (id: string = ''): string => {
    const category = ELIGIBLE_CATEGORIES_CONFIG.flatMap(g => g.categories).find(cat => cat.id === id);
    return category ? category.label : id;
};

const CareerSection: React.FC<CareerSectionProps> = ({ 
    riders, 
    staff,
    currentUser, 
    setRiders, 
    setStaff,
    teams, 
    currentTeamId, 
    onRequestTransfer, 
    scoutingRequests, 
    onRespondToScoutingRequest,
    onUpdateVisibility,
    teamMemberships
}) => {
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<ResultItem | null>(null);
  const [disciplineFilter, setDisciplineFilter] = useState<'all' | DisciplinePracticed>('all');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [destinationTeamId, setDestinationTeamId] = useState('');
  const [transferRequestConfirmation, setTransferRequestConfirmation] = useState<Team | null>(null);
  const [teamSearchFilter, setTeamSearchFilter] = useState('');
  const [visibilityConfirmation, setVisibilityConfirmation] = useState<{ isSearchable?: boolean; openToMissions?: boolean } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentSkill, setCurrentSkill] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  // Vérification de sécurité pour currentUser
  if (!currentUser) {
    return (
      <SectionWrapper title="Ma Carrière">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <p>Chargement des informations utilisateur...</p>
        </div>
      </SectionWrapper>
    );
  }

  const isRider = currentUser.userRole === UserRole.COUREUR;
  const isIndependent = !currentTeamId;
  const riderProfile = useMemo(() => isRider ? riders.find(r => r.email === currentUser.email) : null, [riders, currentUser, isRider]);
  const staffProfile = useMemo(() => !isRider ? staff.find(s => s.email === currentUser.email) : null, [staff, currentUser, isRider]);
  
  const careerStats = useMemo(() => {
    if (!riderProfile?.resultsHistory) return { wins: 0, podiums: 0, top10s: 0 };
    
    let wins = 0;
    let podiums = 0;
    let top10s = 0;

    riderProfile.resultsHistory.forEach(result => {
        const rank = typeof result.rank === 'string' ? parseInt(result.rank.replace(/\D/g, ''), 10) : result.rank;
        if (!isNaN(rank) && rank > 0) {
            if (rank === 1) wins++;
            if (rank <= 3) podiums++;
            if (rank <= 10) top10s++;
        }
    });

    return { wins, podiums, top10s };
  }, [riderProfile?.resultsHistory]);

  // Historique des équipes du coureur
  const teamHistory = useMemo(() => {
    if (!teamMemberships || !currentUser) return [];
    
    const userMemberships = teamMemberships.filter(m => m.userId === currentUser.id);
    
    // Si l'utilisateur a une équipe actuelle mais pas de membership correspondant, l'ajouter
    const currentTeamMembership = userMemberships.find(m => m.teamId === currentTeamId);
    if (currentTeamId && !currentTeamMembership) {
      const currentTeam = teams.find(t => t.id === currentTeamId);
      if (currentTeam) {
        userMemberships.push({
          id: `current-${currentTeamId}`,
          email: currentUser.email,
          userId: currentUser.id,
          teamId: currentTeamId,
          status: TeamMembershipStatus.ACTIVE,
          userRole: currentUser.userRole,
          startDate: new Date().toISOString().split('T')[0], // Date actuelle
          teamName: currentTeam.name,
          teamLevel: currentTeam.level,
          teamCountry: currentTeam.country
        });
      }
    }
    
    return userMemberships
      .map(membership => {
        const team = teams.find(t => t.id === membership.teamId);
        return {
          ...membership,
          teamName: team?.name || membership.teamName || 'Équipe inconnue',
          teamLevel: team?.level || membership.teamLevel || 'Inconnu',
          teamCountry: team?.country || membership.teamCountry || 'Inconnu'
        };
      })
      .sort((a, b) => {
        // Trier par date de début (plus récent en premier)
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [teamMemberships, currentUser, teams, currentTeamId]);
  
  const pendingScoutingRequests = useMemo(() => {
    if (!scoutingRequests) return [];
    return scoutingRequests.filter(
        req => req.athleteId === currentUser.id && req.status === ScoutingRequestStatus.PENDING
    );
  }, [scoutingRequests, currentUser.id]);

  const handleSaveResult = (resultToSave: ResultItem) => {
    if (!riderProfile) return;
    const history = riderProfile.resultsHistory || [];
    let newHistory;
    if (editingResult) {
        newHistory = history.map(r => r.id === editingResult.id ? { ...resultToSave, id: editingResult.id } : r);
    } else {
        newHistory = [...history, { ...resultToSave, id: generateId() }];
    }
    setRiders(prevRiders => prevRiders.map(r => r.id === riderProfile.id ? { ...r, resultsHistory: newHistory } : r));
    setIsResultModalOpen(false);
  };

  const handleDeleteResult = (resultId: string) => {
    if (window.confirm("Supprimer ce résultat ?")) {
        if (!riderProfile) return;
        const newHistory = (riderProfile.resultsHistory || []).filter(r => r.id !== resultId);
        setRiders(prevRiders => prevRiders.map(r => r.id === riderProfile.id ? { ...r, resultsHistory: newHistory } : r));
    }
  };


  const openEditResultModal = (result: ResultItem) => {
    setEditingResult(result);
    setIsResultModalOpen(true);
  };

  const openTransferRequestModal = () => {
    const firstOtherTeam = teams.find(t => t.id !== currentTeamId);
    setDestinationTeamId(firstOtherTeam ? firstOtherTeam.id : '');
    setTeamSearchFilter(''); // Reset filter when opening modal
    setIsTransferModalOpen(true);
  };

  // Filtrer les équipes disponibles pour le transfert
  const availableTeams = useMemo(() => {
    return teams
      .filter(team => team.id !== currentTeamId) // Exclure l'équipe actuelle
      .filter(team => {
        if (!teamSearchFilter) return true;
        const searchTerm = teamSearchFilter.toLowerCase();
        return (
          team.name.toLowerCase().includes(searchTerm) ||
          team.country.toLowerCase().includes(searchTerm) ||
          team.level.toLowerCase().includes(searchTerm)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Trier par nom
  }, [teams, currentTeamId, teamSearchFilter]);

  const handleRequestTransferConfirm = () => {
    if (destinationTeamId) {
        const destinationTeam = teams.find(t => t.id === destinationTeamId);
        if (destinationTeam) {
            setTransferRequestConfirmation(destinationTeam);
        }
        setIsTransferModalOpen(false);
    }
  };

  const executeTransferRequest = () => {
    if (transferRequestConfirmation) {
        onRequestTransfer(transferRequestConfirmation.id);
        setTransferRequestConfirmation(null);
    }
  };

  const handleVisibilityChangeRequest = () => {
    if (isRider && riderProfile) {
      setVisibilityConfirmation({ isSearchable: !(riderProfile.isSearchable || false) });
    } else if (!isRider && staffProfile) {
      setVisibilityConfirmation({ openToMissions: !(staffProfile.openToExternalMissions || false) });
    }
  };

  const executeVisibilityChange = () => {
    if (visibilityConfirmation === null) return;
    onUpdateVisibility(visibilityConfirmation);
    setVisibilityConfirmation(null);
    setSuccessMessage('Visibilité du profil mise à jour !');
    setTimeout(() => setSuccessMessage(''), 3000);
  };
  
  const handleStaffInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (staffProfile) {
        setStaff(prevStaff => prevStaff.map(s => s.id === staffProfile.id ? { ...s, [name]: value } : s));
    }
  };

  const handleAddSkill = () => {
    if (currentSkill && staffProfile && !staffProfile.skills.includes(currentSkill)) {
        const updatedSkills = [...staffProfile.skills, currentSkill];
        setStaff(prevStaff => prevStaff.map(s => s.id === staffProfile.id ? { ...s, skills: updatedSkills } : s));
        setCurrentSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (staffProfile) {
        const updatedSkills = staffProfile.skills.filter(s => s !== skillToRemove);
        setStaff(prevStaff => prevStaff.map(s => s.id === staffProfile.id ? { ...s, skills: updatedSkills } : s));
    }
  };

  const resultsByYear = useMemo(() => {
    if (!riderProfile?.resultsHistory) return [];
    const filtered = riderProfile.resultsHistory.filter(r => disciplineFilter === 'all' || r.discipline === disciplineFilter);
    const grouped = filtered.reduce((acc, result) => {
        const year = new Date(result.date + "T12:00:00Z").getUTCFullYear();
        if (!acc[year]) acc[year] = [];
        acc[year].push(result);
        return acc;
    }, {} as Record<string, ResultItem[]>);
    
    // Calculer les statistiques pour chaque année
    return Object.entries(grouped)
      .map(([year, results]) => {
        let wins = 0;
        let podiums = 0;
        let top10s = 0;
        
        results.forEach(result => {
          const rank = typeof result.rank === 'string' ? parseInt(result.rank.replace(/\D/g, ''), 10) : result.rank;
          if (!isNaN(rank) && rank > 0) {
            if (rank === 1) wins++;
            if (rank <= 3) podiums++;
            if (rank <= 10) top10s++;
          }
        });
        
        return {
          year,
          results: results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          stats: { wins, podiums, top10s, total: results.length }
        };
      })
      .sort((a, b) => parseInt(b.year) - parseInt(a.year));
  }, [riderProfile?.resultsHistory, disciplineFilter]);

  // Initialiser la saison sélectionnée avec la plus récente
  useEffect(() => {
    if (resultsByYear.length > 0 && !selectedSeason) {
      setSelectedSeason(resultsByYear[0].year);
    }
  }, [resultsByYear, selectedSeason]);

  // Obtenir les données de la saison sélectionnée
  const selectedSeasonData = useMemo(() => {
    if (!selectedSeason) return null;
    return resultsByYear.find(season => season.year === selectedSeason) || null;
  }, [selectedSeason, resultsByYear]);

  // Obtenir le nom de l'équipe actuelle
  const currentTeamName = useMemo(() => {
    if (!currentTeamId) return null;
    const currentTeam = teams.find(t => t.id === currentTeamId);
    return currentTeam?.name || null;
  }, [currentTeamId, teams]);

  if (!riderProfile && !staffProfile) {
    return (
       <SectionWrapper title="Ma Carrière">
          <div className="text-center p-8 bg-gray-50 rounded-lg border">
              <p>Impossible de trouver le profil associé à cet utilisateur.</p>
          </div>
      </SectionWrapper>
    );
  }

  const renderRiderView = () => riderProfile && (
    <div className="space-y-6">
        {successMessage && (
            <div className="absolute top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-md transition-opacity duration-300 z-50" role="alert">
                <strong className="font-bold">Succès !</strong>
                <span className="block sm:inline ml-2">{successMessage}</span>
            </div>
        )}
        <div className="p-4 bg-white rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
            <EyeIcon className="w-5 h-5 mr-2 text-blue-500" />
            Visibilité de Mon Profil
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Rendez votre profil visible pour que d'autres équipes puissent découvrir vos talents et potentiellement vous contacter pour des opportunités.
          </p>
          <div className="flex items-center cursor-pointer" onClick={handleVisibilityChangeRequest}>
            <input
              type="checkbox"
              readOnly
              checked={riderProfile.isSearchable || false}
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              Rendre mon profil visible dans la recherche de talents
            </span>
          </div>
        </div>

        {pendingScoutingRequests.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Demandes de Suivi</h3>
                <div className="space-y-2">
                    {pendingScoutingRequests.map(req => {
                        const team = teams.find(t => t.id === req.requesterTeamId);
                        return (
                            <div key={req.id} className="p-3 bg-white rounded-md flex justify-between items-center">
                                <div>
                                    <p>L'équipe <strong>{team?.name || "Inconnue"}</strong> souhaite accéder à vos données de performance.</p>
                                    <p className="text-xs text-gray-500">Date de la demande: {new Date(req.requestDate + 'T12:00:00').toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <ActionButton onClick={() => onRespondToScoutingRequest(req.id, 'accepted')} variant="primary" size="sm" icon={<CheckCircleIcon className="w-4 h-4"/>}>Accepter</ActionButton>
                                    <ActionButton onClick={() => onRespondToScoutingRequest(req.id, 'rejected')} variant="danger" size="sm" icon={<XCircleIcon className="w-4 h-4"/>}>Refuser</ActionButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Historique des équipes */}
        <div className="p-4 bg-white rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <TrophyIcon className="w-5 h-5 mr-2 text-blue-500" />
                Mon Historique d'Équipes
            </h3>
            {teamHistory.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                        {teamHistory.map((membership, index) => {
                            const isCurrentTeam = membership.teamId === currentTeamId;
                            const startYear = membership.startDate ? new Date(membership.startDate + 'T12:00:00Z').getFullYear() : new Date().getFullYear();
                            const endYear = membership.endDate ? new Date(membership.endDate + 'T12:00:00Z').getFullYear() : null;
                            
                            // Format de l'année : "2019-2024" ou "2025-" ou "2017"
                            const yearRange = endYear ? `${startYear}-${endYear}` : (isCurrentTeam ? `${startYear}-` : `${startYear}`);
                            
                            return (
                                <div key={membership.id} className="flex items-center justify-between py-2 hover:bg-gray-100 rounded px-2 -mx-2">
                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-800 font-medium text-sm min-w-[80px]">
                                            {yearRange}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-blue-600 font-medium ${
                                                isCurrentTeam ? 'text-blue-700 font-semibold' : ''
                                            }`}>
                                                {membership.teamName}
                                            </span>
                                            {isCurrentTeam && (
                                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                                                    Actuel
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600">{membership.teamLevel}</span>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-gray-600">{membership.teamCountry}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <TrophyIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">Aucun historique d'équipe</h4>
                    <p className="text-gray-500">Votre historique d'équipes apparaîtra ici au fur et à mesure de vos adhésions.</p>
                </div>
            )}
        </div>
        <div className="p-4 bg-white rounded-lg shadow border">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Mon Palmarès</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Vos résultats sont automatiquement mis à jour par votre équipe lors des débriefings de compétitions
                    </p>
                </div>
                <div className="flex items-center gap-2">
                     <ActionButton onClick={() => { setEditingResult(null); setIsResultModalOpen(true);}} icon={<PlusCircleIcon className="w-4 h-4"/>} size="sm" variant="secondary">Ajouter manuellement</ActionButton>
                     <ActionButton onClick={openTransferRequestModal} variant="secondary" size="sm">Demander un Transfert</ActionButton>
                </div>
            </div>
            
            {/* Statistiques du palmarès */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-100 text-sm font-medium">Victoires</p>
                            <p className="text-3xl font-bold">{careerStats.wins}</p>
                        </div>
                        <TrophyIcon className="w-8 h-8 text-yellow-200" />
                    </div>
                </div>
                <div className="bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-100 text-sm font-medium">Podiums</p>
                            <p className="text-3xl font-bold">{careerStats.podiums}</p>
                        </div>
                        <TrophyIcon className="w-8 h-8 text-gray-200" />
                    </div>
                </div>
                <div className="bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Top 10</p>
                            <p className="text-3xl font-bold">{careerStats.top10s}</p>
                        </div>
                        <TrophyIcon className="w-8 h-8 text-blue-200" />
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>Résultats automatiques</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span>Ajoutés manuellement</span>
                    </div>
                </div>
                <select 
                    value={disciplineFilter} 
                    onChange={e => setDisciplineFilter(e.target.value as any)} 
                    className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                    <option value="all">Toutes Disciplines</option>
                    {Object.values(DisciplinePracticed).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            {/* Information sur l'alimentation automatique */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">Alimentation automatique des résultats</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            Votre équipe met à jour automatiquement vos résultats lors des débriefings de compétitions. 
                            Les résultats apparaissent ici en temps réel au fur et à mesure de la saison.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
            {resultsByYear.length > 0 ? (
                <>
                    {/* Mini-onglets des saisons */}
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                            {resultsByYear.map(({ year, stats }) => (
                                <button
                                    key={year}
                                    onClick={() => setSelectedSeason(year)}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                        selectedSeason === year
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <TrophyIcon className="w-4 h-4" />
                                        <span className="font-semibold">{year}</span>
                                        <div className="flex items-center space-x-1 text-xs">
                                            <span className="text-yellow-600 font-bold">{stats.wins}</span>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-gray-600 font-bold">{stats.podiums}</span>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-blue-600 font-bold">{stats.top10s}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Contenu de la saison sélectionnée */}
                    {selectedSeasonData && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            {/* En-tête de la saison avec statistiques détaillées */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 border-b border-gray-200">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                                    <div className="flex items-center">
                                        <TrophyIcon className="w-8 h-8 mr-3 text-blue-600" />
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-3xl">Saison {selectedSeasonData.year}</h4>
                                            <p className="text-gray-600 text-sm mt-1">
                                                {selectedSeasonData.stats.total} course{selectedSeasonData.stats.total > 1 ? 's' : ''} disputée{selectedSeasonData.stats.total > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Statistiques en cartes */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-yellow-200">
                                            <div className="text-3xl font-bold text-yellow-600">{selectedSeasonData.stats.wins}</div>
                                            <div className="text-xs text-gray-600 font-medium mt-1">Victoires</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200">
                                            <div className="text-3xl font-bold text-gray-600">{selectedSeasonData.stats.podiums}</div>
                                            <div className="text-xs text-gray-600 font-medium mt-1">Podiums</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-blue-200">
                                            <div className="text-3xl font-bold text-blue-600">{selectedSeasonData.stats.top10s}</div>
                                            <div className="text-xs text-gray-600 font-medium mt-1">Top 10</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200">
                                            <div className="text-3xl font-bold text-gray-800">{selectedSeasonData.stats.total}</div>
                                            <div className="text-xs text-gray-600 font-medium mt-1">Total</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Tableau des résultats de la saison */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Épreuve</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rang</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Équipe</th>
                                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedSeasonData.results.map(result => {
                                            // Simuler un indicateur de source (à adapter selon votre logique métier)
                                            const isAutoGenerated = result.team === currentTeamName;
                                            
                                            return (
                                                <tr key={result.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="flex items-center">
                                                            <div className={`w-2 h-2 rounded-full mr-3 ${
                                                                isAutoGenerated ? 'bg-green-500' : 'bg-blue-500'
                                                            }`}></div>
                                                            {new Date(result.date + 'T12:00:00Z').toLocaleDateString('fr-FR')}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        <div className="flex items-center">
                                                            {result.eventName}
                                                            {isAutoGenerated && (
                                                                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                                                    Auto
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{getCategoryLabel(result.category)}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                            result.rank === 1 ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200' :
                                                            result.rank <= 3 ? 'bg-gray-100 text-gray-800 ring-1 ring-gray-200' :
                                                            result.rank <= 10 ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200' :
                                                            'bg-gray-50 text-gray-600 ring-1 ring-gray-100'
                                                        }`}>
                                                            {result.rank}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{result.team}</td>
                                                    <td className="px-6 py-4 text-right text-sm space-x-2">
                                                        {!isAutoGenerated && (
                                                            <>
                                                                <ActionButton onClick={() => openEditResultModal(result)} size="sm" variant="secondary" icon={<PencilIcon className="w-3 h-3"/>}/>
                                                                <ActionButton onClick={() => handleDeleteResult(result.id)} size="sm" variant="danger" icon={<TrashIcon className="w-3 h-3"/>}/>
                                                            </>
                                                        )}
                                                        {isAutoGenerated && (
                                                            <span className="text-xs text-gray-500 italic">Géré par l'équipe</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center p-12 bg-gray-50 rounded-lg border">
                    <TrophyIcon className="w-20 h-20 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-2xl font-semibold text-gray-700 mb-2">Aucun résultat enregistré</h3>
                    <p className="text-gray-500 mb-4">
                        Vos résultats apparaîtront automatiquement ici après les débriefings de compétitions par votre équipe.
                    </p>
                    <p className="text-sm text-gray-400 mb-6">
                        Vous pouvez également ajouter manuellement des résultats d'épreuves non suivies par votre équipe.
                    </p>
                    <ActionButton 
                        onClick={() => { setEditingResult(null); setIsResultModalOpen(true);}} 
                        icon={<PlusCircleIcon className="w-4 h-4"/>}
                        variant="secondary"
                    >
                        Ajouter manuellement
                    </ActionButton>
                </div>
            )}
            </div>
        </div>
    </div>
  );

  const renderStaffView = () => staffProfile && (
    <div className="space-y-6">
        {successMessage && (
            <div className="absolute top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-md transition-opacity duration-300 z-50" role="alert">
                <strong className="font-bold">Succès !</strong>
                <span className="block sm:inline ml-2">{successMessage}</span>
            </div>
        )}
        <div className="p-4 bg-white rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Mon Profil Professionnel</h3>
          {isIndependent ? (
            <div className="space-y-3">
                <div>
                    <label htmlFor="professionalSummary" className="block text-sm font-medium text-gray-700">Résumé professionnel</label>
                    <textarea
                        id="professionalSummary"
                        name="professionalSummary"
                        rows={4}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={staffProfile.professionalSummary || ""}
                        onChange={handleStaffInputChange}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Compétences</label>
                     <div className="flex gap-2 mb-2">
                        <input type="text" value={currentSkill} onChange={e => setCurrentSkill(e.target.value)} onKeyDown={e => {if(e.key === 'Enter'){ e.preventDefault(); handleAddSkill();}}} placeholder="Ajouter une compétence..." className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
                        <ActionButton type="button" onClick={handleAddSkill} size="sm" icon={<PlusCircleIcon className="w-4 h-4"/>}>Ajouter</ActionButton>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(staffProfile.skills || []).length > 0 ? staffProfile.skills.map(skill => (
                          <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center">
                              {skill}
                              <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-1.5 text-blue-600 hover:text-blue-800">
                                <XCircleIcon className="w-4 h-4"/>
                              </button>
                          </span>
                      )) : <p className="text-xs text-gray-500 italic">Aucune compétence renseignée.</p>}
                    </div>
                </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">{staffProfile.professionalSummary || "Aucun résumé professionnel renseigné."}</p>
              <h4 className="font-semibold text-gray-700">Compétences:</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                  {(staffProfile.skills || []).length > 0 ? staffProfile.skills.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{skill}</span>
                  )) : <p className="text-xs text-gray-500 italic">Aucune compétence renseignée.</p>}
              </div>
              <p className="text-xs text-gray-500 mt-3">Pour modifier ces informations, veuillez contacter un manager ou modifier votre profil via l'onglet "Staff".</p>
            </>
          )}
        </div>
        <div className="p-4 bg-white rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
            <EyeIcon className="w-5 h-5 mr-2 text-blue-500" />
            Recherche de Missions
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Activez cette option pour que votre profil soit visible par d'autres équipes sur la plateforme LogiCycle lorsqu'elles recherchent des vacataires.
          </p>
          <div className="flex items-center cursor-pointer" onClick={handleVisibilityChangeRequest}>
            <input
              type="checkbox"
              readOnly
              checked={staffProfile.openToExternalMissions || false}
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              Je suis ouvert(e) aux missions externes (en tant que vacataire)
            </span>
          </div>
        </div>
    </div>
  );

  return (
    <SectionWrapper title="Ma Carrière">
        {isRider ? renderRiderView() : renderStaffView()}
        
        {isResultModalOpen && (
            <ResultFormModal 
                isOpen={isResultModalOpen}
                onClose={() => setIsResultModalOpen(false)}
                onSave={handleSaveResult}
                initialData={editingResult}
                currentTeamName={currentTeamName || undefined}
            />
        )}


        <Modal isOpen={isTransferModalOpen} onClose={() => {
          setIsTransferModalOpen(false);
          setTeamSearchFilter('');
          setDestinationTeamId('');
        }} title="Demander un transfert">
            <div className="space-y-4">
            <p>Sélectionnez l'équipe que vous souhaitez rejoindre. Une demande sera envoyée à leurs managers.</p>
            
            {/* Champ de recherche */}
            <div>
                <label htmlFor="team-search-filter" className="block text-sm font-medium text-gray-700">Rechercher une équipe</label>
                <input
                    type="text"
                    id="team-search-filter"
                    value={teamSearchFilter}
                    onChange={(e) => setTeamSearchFilter(e.target.value)}
                    placeholder="Tapez le nom, pays ou niveau de l'équipe..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>

            {/* Liste des équipes filtrées */}
            <div>
                <label htmlFor="destination-team-career" className="block text-sm font-medium text-gray-700">Équipe de destination</label>
                {availableTeams.length > 0 ? (
                    <select
                        id="destination-team-career"
                        value={destinationTeamId}
                        onChange={(e) => setDestinationTeamId(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="">-- Sélectionnez une équipe --</option>
                        {availableTeams.map(team => (
                            <option key={team.id} value={team.id}>
                                {team.name} ({team.country}) - {team.level}
                            </option>
                        ))}
                    </select>
                ) : (
                    <div className="mt-1 p-3 text-center text-gray-500 bg-gray-50 rounded-md border">
                        {teamSearchFilter ? 'Aucune équipe trouvée pour cette recherche' : 'Aucune équipe disponible'}
                    </div>
                )}
            </div>
                <div className="flex justify-end space-x-2 pt-3">
                <ActionButton type="button" variant="secondary" onClick={() => setIsTransferModalOpen(false)}>Annuler</ActionButton>
                <ActionButton onClick={handleRequestTransferConfirm} disabled={!destinationTeamId}>
                    Envoyer la Demande
                </ActionButton>
            </div>
        </div>
        </Modal>

        {transferRequestConfirmation && (
            <ConfirmationModal
                isOpen={true}
                onClose={() => setTransferRequestConfirmation(null)}
                onConfirm={executeTransferRequest}
                title="Confirmer la demande de transfert"
                message={
                    <span>
                        Êtes-vous sûr de vouloir envoyer une demande de transfert à l'équipe <strong>{transferRequestConfirmation.name}</strong> ?
                    </span>
                }
            />
        )}

        {visibilityConfirmation !== null && (
            <ConfirmationModal
                isOpen={true}
                onClose={() => setVisibilityConfirmation(null)}
                onConfirm={executeVisibilityChange}
                title="Confirmer la visibilité du profil"
                message={
                    isRider
                        ? (visibilityConfirmation.isSearchable ? "Rendre votre profil visible permettra aux recruteurs de vous trouver. Êtes-vous sûr ?" : "Rendre votre profil invisible le cachera des recherches des recruteurs. Êtes-vous sûr ?")
                        : (visibilityConfirmation.openToMissions ? "Rendre votre profil visible pour des missions externes ?" : "Rendre votre profil invisible aux autres équipes ?")
                }
            />
        )}

    </SectionWrapper>
  );
};

export default CareerSection;