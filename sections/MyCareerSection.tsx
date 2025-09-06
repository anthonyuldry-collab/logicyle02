import React, { useState } from 'react';
import { Rider, User, Team, ResultItem, DisciplinePracticed } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import MyPerformanceSection from './MyPerformanceSection';
import MyPerformanceProjectSection from './MyPerformanceProjectSection';
import { UsersIcon, ClockIcon } from '../components/icons';

interface MyCareerSectionProps {
  riders: Rider[];
  currentUser: User;
  onSaveRider: (rider: Rider) => void;
  teams?: Team[];
  raceEvents?: any[];
  scoutingProfiles?: any[];
  onUpdateScoutingProfile?: (profile: any) => void;
}

type CareerTab = 'performances' | 'project' | 'teams';

const MyCareerSection: React.FC<MyCareerSectionProps> = ({
  riders,
  currentUser,
  onSaveRider,
  teams = [],
  raceEvents = [],
  scoutingProfiles = [],
  onUpdateScoutingProfile
}) => {
  const [activeTab, setActiveTab] = useState<CareerTab>('performances');

  // Trouver le profil du coureur
  const riderProfile = riders.find(r => r.email === currentUser.email);

  if (!riderProfile) {
    return (
      <SectionWrapper title="Ma Carrière">
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <p className="mt-4 text-lg font-medium text-gray-700">Profil coureur non trouvé</p>
          <p className="mt-2 text-gray-500">Cette section est réservée aux coureurs.</p>
        </div>
      </SectionWrapper>
    );
  }

  const tabButtonStyle = (tabName: CareerTab) => 
    `px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap transition-colors duration-150 focus:outline-none ${
      activeTab === tabName 
        ? 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;


  const handleScoutingToggle = async () => {
    if (!riderProfile) return;
    
    const updatedRider = {
      ...riderProfile,
      isSearchable: !riderProfile.isSearchable
    };
    
    try {
      await onSaveRider(updatedRider);
      
      // Mettre à jour le profil de scouting si nécessaire
      if (onUpdateScoutingProfile) {
        const scoutingProfile = {
          id: riderProfile.id,
          firstName: riderProfile.firstName,
          lastName: riderProfile.lastName,
          birthDate: riderProfile.birthDate,
          sex: riderProfile.sex,
          nationality: riderProfile.nationality,
          weightKg: riderProfile.weightKg,
          heightCm: riderProfile.heightCm,
          qualitativeProfile: riderProfile.qualitativeProfile,
          disciplines: riderProfile.disciplines,
          categories: riderProfile.categories,
          powerProfileFresh: riderProfile.powerProfileFresh,
          powerProfile15KJ: riderProfile.powerProfile15KJ,
          powerProfile30KJ: riderProfile.powerProfile30KJ,
          powerProfile45KJ: riderProfile.powerProfile45KJ,
          generalPerformanceScore: riderProfile.generalPerformanceScore,
          fatigueResistanceScore: riderProfile.fatigueResistanceScore,
          charSprint: riderProfile.charSprint,
          charAnaerobic: riderProfile.charAnaerobic,
          charPuncher: riderProfile.charPuncher,
          charClimbing: riderProfile.charClimbing,
          charRouleur: riderProfile.charRouleur,
          isSearchable: updatedRider.isSearchable,
          lastUpdated: new Date().toISOString()
        };
        
        onUpdateScoutingProfile(scoutingProfile);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil de scouting:', error);
    }
  };

  const renderPerformancesTab = () => (
    <div className="space-y-6">
      {/* Section de partage pour le scouting */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Partage pour le Scouting</h3>
            <p className="text-sm text-gray-600 mt-1">
              Rendez votre profil visible pour les recruteurs et les équipes
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${riderProfile?.isSearchable ? 'text-green-600' : 'text-gray-500'}`}>
              {riderProfile?.isSearchable ? 'Profil partagé' : 'Profil privé'}
            </span>
            <button
              onClick={handleScoutingToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                riderProfile?.isSearchable ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  riderProfile?.isSearchable ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        {riderProfile?.isSearchable && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">Profil visible pour le scouting</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Votre profil de performance est maintenant visible par les recruteurs et les équipes. 
                  Ils peuvent voir vos données de puissance, caractéristiques et objectifs de carrière.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {!riderProfile?.isSearchable && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-800">Profil privé</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Votre profil n'est pas visible pour le scouting. Activez le partage pour permettre aux recruteurs de découvrir votre profil.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section des performances PPR */}
      <MyPerformanceSection
        riders={riders}
        currentUser={currentUser}
        onSaveRider={onSaveRider}
      />
    </div>
  );

  const renderProjectTab = () => (
    <MyPerformanceProjectSection
      riders={riders}
      currentUser={currentUser}
      onSaveRider={onSaveRider}
    />
  );

  const renderTeamsTab = () => {
    const teamsHistory = riderProfile?.teamsHistory || [];
    const currentTeamName = riderProfile?.teamName;
    
    // Créer une liste complète incluant l'équipe actuelle
    let allTeams = [...teamsHistory];
    
    // Ajouter l'équipe actuelle si elle existe et n'est pas déjà dans l'historique
    if (currentTeamName && !teamsHistory.some(team => team.teamName === currentTeamName)) {
      allTeams.unshift({
        teamName: currentTeamName,
        startDate: new Date().getFullYear().toString() + '-01-01', // Date de début de l'année actuelle
        endDate: undefined, // Pas de date de fin = équipe actuelle
        role: 'Coureur',
        status: 'Actif' as const,
        achievements: []
      });
    }
    
    // Trier les équipes par date de début (plus récente en premier)
    const sortedTeams = allTeams.sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    // Calculer la durée dans chaque équipe
    const calculateDuration = (startDate: string, endDate?: string) => {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      
      if (years > 0) {
        return `${years} an${years > 1 ? 's' : ''}${months > 0 ? ` et ${months} mois` : ''}`;
      } else {
        return `${months} mois`;
      }
    };

    // Obtenir l'année de début et de fin
    const getYear = (dateString: string) => {
      return new Date(dateString).getFullYear();
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes Équipes</h3>
          
          {sortedTeams.length > 0 ? (
            <div className="space-y-3">
              {sortedTeams.map((teamHistory, index) => {
                const startYear = getYear(teamHistory.startDate);
                const endYear = teamHistory.endDate ? getYear(teamHistory.endDate) : new Date().getFullYear();
                const isCurrentTeam = !teamHistory.endDate;
                
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${isCurrentTeam ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{teamHistory.teamName}</h4>
                        <p className="text-sm text-gray-600">
                          {startYear === endYear ? (isCurrentTeam ? `${startYear} - Aujourd'hui` : startYear) : `${startYear} - ${isCurrentTeam ? 'Aujourd\'hui' : endYear}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isCurrentTeam 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isCurrentTeam ? 'Actuel' : 'Ancien'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <UsersIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Aucune équipe renseignée</p>
            </div>
          )}
        </div>
      </div>
    );
  };



  const renderActiveTab = () => {
    switch (activeTab) {
      case 'performances':
        return renderPerformancesTab();
      case 'project':
        return renderProjectTab();
      case 'teams':
        return renderTeamsTab();
      default:
        return renderPerformancesTab();
    }
  };

  return (
    <SectionWrapper title="Ma Carrière">
      <div className="space-y-6">
        {/* Onglets de navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
            <button onClick={() => setActiveTab('performances')} className={tabButtonStyle('performances')}>
              📊 Performances
            </button>
            <button onClick={() => setActiveTab('project')} className={tabButtonStyle('project')}>
              🎯 Projet Performance
            </button>
            <button onClick={() => setActiveTab('teams')} className={tabButtonStyle('teams')}>
              👥 Équipes
            </button>
          </nav>
        </div>

        {/* Contenu des onglets */}
        {renderActiveTab()}
      </div>
    </SectionWrapper>
  );
};

export default MyCareerSection;
