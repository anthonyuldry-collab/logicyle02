import React, { useState, useEffect } from 'react';
import { Rider, User, StaffMember, Team, RaceEvent, RiderEventSelection, AppState, UserRole, StaffRole, StaffStatus, FormeStatus, MoralStatus, HealthCondition, DisciplinePracticed, AppSection, TeamRole } from '../types';
import SectionWrapper from '../components/SectionWrapper';
import RiderDashboardTab from '../components/riderDetailTabs/RiderDashboardTab';
import { useTranslations } from '../hooks/useTranslations';

interface MyDashboardSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  appState: AppState;
  navigateTo?: (section: AppSection, eventId?: string) => void;
}

const MyDashboardSection: React.FC<MyDashboardSectionProps> = ({ 
  riders, 
  staff, 
  currentUser, 
  raceEvents, 
  riderEventSelections, 
  appState,
  navigateTo
}) => {
  const [profileData, setProfileData] = useState<Rider | StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslations();

  useEffect(() => {
    console.log('🔍 DEBUG MyDashboardSection - currentUser:', currentUser);
    console.log('🔍 DEBUG MyDashboardSection - riders count:', riders.length);
    console.log('🔍 DEBUG MyDashboardSection - staff count:', staff.length);
    
    if (!currentUser || !currentUser.userRole || !currentUser.email) {
      console.log('⚠️ DEBUG MyDashboardSection - currentUser invalide');
      setIsLoading(false);
      return;
    }

    let userProfile: Rider | StaffMember | undefined;

    if (currentUser.userRole === UserRole.COUREUR) {
        console.log('🔍 DEBUG MyDashboardSection - Recherche coureur avec email:', currentUser.email);
        userProfile = riders.find(r => r.email === currentUser.email);
        console.log('🔍 DEBUG MyDashboardSection - Coureur trouvé:', userProfile);
        
        // Si le coureur n'existe pas encore, créer un profil temporaire
        if (!userProfile) {
          console.log('⚠️ DEBUG MyDashboardSection - Coureur non trouvé, création profil temporaire');
          userProfile = {
            id: currentUser.id,
            firstName: currentUser.firstName || 'Coureur',
            lastName: currentUser.lastName || 'Inconnu',
            email: currentUser.email,
            birthDate: currentUser.signupInfo?.birthDate || '1990-01-01',
            sex: currentUser.signupInfo?.sex,
            qualitativeProfile: {
              sprint: 0,
              anaerobic: 0,
              puncher: 0,
              climbing: 0,
              rouleur: 0,
              generalPerformance: 0,
              fatigueResistance: 0
            } as any,
            disciplines: [DisciplinePracticed.ROUTE],
            categories: ['Senior'],
            forme: FormeStatus.BON,
            moral: MoralStatus.BON,
            healthCondition: HealthCondition.PRET_A_COURIR,
            resultsHistory: [],
            favoriteRaces: [],
            performanceGoals: '',
            physiquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            techniquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            mentalPerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            environnementPerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            tactiquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            allergies: [],
            performanceNutrition: {
              hydrationStrategy: '',
              preRaceMeal: '',
              duringRaceNutrition: '',
              recoveryNutrition: ''
            },
            roadBikeSetup: { bikeType: 'Route', size: '', brand: '', model: '', specifics: '', cotes: '' },
            ttBikeSetup: { bikeType: 'Contre-la-montre', size: '', brand: '', model: '', specifics: '', cotes: '' },
            clothing: [],
            charSprint: 0,
            charAnaerobic: 0,
            charPuncher: 0,
            charClimbing: 0,
            charRouleur: 0,
            generalPerformanceScore: 0,
            fatigueResistanceScore: 0
          } as Rider;
        }
    } else if (currentUser.userRole === UserRole.STAFF || currentUser.userRole === UserRole.MANAGER) {
        console.log('🔍 DEBUG MyDashboardSection - Recherche staff avec email:', currentUser.email);
        userProfile = staff.find(s => s.email === currentUser.email);
        console.log('🔍 DEBUG MyDashboardSection - Staff trouvé:', userProfile);
        
        // Si le staff n'existe pas encore, créer un profil temporaire
        if (!userProfile) {
          console.log('⚠️ DEBUG MyDashboardSection - Staff non trouvé, création profil temporaire');
          userProfile = {
            id: currentUser.id,
            firstName: currentUser.firstName || 'Staff',
            lastName: currentUser.lastName || 'Inconnu',
            email: currentUser.email,
            role: StaffRole.AUTRE,
            status: StaffStatus.VACATAIRE,
            openToExternalMissions: false,
            skills: [],
            availability: []
          } as StaffMember;
        }
    }
    
    if (userProfile) {
        console.log('✅ DEBUG MyDashboardSection - Profil défini:', userProfile);
        setProfileData(userProfile);
    } else {
        console.log('❌ DEBUG MyDashboardSection - Aucun profil trouvé');
    }
    
    setIsLoading(false);
  }, [currentUser, riders, staff]);

  if (isLoading) {
    return (
      <SectionWrapper title="Mon Tableau de Bord">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </SectionWrapper>
    );
  }

  if (!profileData) {
    return (
      <SectionWrapper title="Mon Tableau de Bord">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Profil non trouvé</h3>
            <p className="text-gray-500">Impossible de charger vos données de profil.</p>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  // Si c'est un coureur, afficher la vue d'ensemble simplifiée
  if (currentUser.userRole === UserRole.COUREUR && profileData) {
    const rider = profileData as Rider;
    const upcomingEvents = raceEvents
      .filter(event => new Date(event.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 2);
    
    return (
      <SectionWrapper title="Tableau de Bord">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header simplifié */}
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-white">
                {rider.firstName?.[0] || 'C'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bonjour {rider.firstName} !
            </h1>
            <p className="text-gray-600">
              {rider.categories?.[0] || 'Senior'} • {rider.forme || 'En forme'}
            </p>
          </div>

          {/* Métriques essentielles - Layout compact */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{upcomingEvents.length}</div>
              <div className="text-sm text-gray-600">Courses à venir</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{Math.round(rider.generalPerformanceScore || 0)}</div>
              <div className="text-sm text-gray-600">Performance</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {rider.forme === FormeStatus.EXCELLENT ? '5' : rider.forme === FormeStatus.BON ? '4' : rider.forme === FormeStatus.MOYEN ? '3' : '2'}
              </div>
              <div className="text-sm text-gray-600">Forme</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-emerald-600 mb-1">✓</div>
              <div className="text-sm text-gray-600">Santé</div>
            </div>
          </div>

          {/* Prochaines courses - Design épuré */}
          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Prochaines Courses</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{event.name}</h3>
                        <p className="text-sm text-gray-500">{event.location}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(event.date).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleDateString('fr-FR', { 
                            weekday: 'short' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions rapides - Design moderne */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Accès Rapide</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={() => navigateTo?.('myProfile')}
                  className="group p-4 text-center rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="font-medium text-gray-900 group-hover:text-blue-700">Mon Profil</div>
                </button>

                <button 
                  onClick={() => navigateTo?.('myPerformance')}
                  className="group p-4 text-center rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="font-medium text-gray-900 group-hover:text-green-700">Performance</div>
                </button>

                <button 
                  onClick={() => navigateTo?.('myCalendar')}
                  className="group p-4 text-center rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="font-medium text-gray-900 group-hover:text-purple-700">Calendrier</div>
                </button>

                <button 
                  onClick={() => navigateTo?.('nutrition')}
                  className="group p-4 text-center rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-orange-100 group-hover:bg-orange-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="font-medium text-gray-900 group-hover:text-orange-700">Nutrition</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  // Si c'est un administrateur, rediriger vers le tableau de bord administrateur
  if (currentUser.permissionRole === TeamRole.ADMIN || currentUser.userRole === UserRole.MANAGER) {
    return (
      <SectionWrapper title="Tableau de Bord">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-white">👑</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Accès Administrateur
            </h1>
            <p className="text-gray-600 mb-6">
              Vous avez accès au tableau de bord administrateur complet
            </p>
            <button 
              onClick={() => navigateTo?.('adminDashboard')}
              className="bg-gradient-to-r from-red-500 to-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-red-600 hover:to-orange-700 transition-all duration-200 shadow-lg"
            >
              🚀 Ouvrir le Tableau de Bord Administrateur
            </button>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  // Si c'est un membre du staff, afficher un tableau de bord simplifié
  return (
    <SectionWrapper title="Tableau de Bord">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-white">
              {(profileData as StaffMember).firstName?.[0] || 'S'}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bonjour {(profileData as StaffMember).firstName} !
          </h1>
          <p className="text-gray-600">
            {(profileData as StaffMember).role} • {(profileData as StaffMember).status}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Informations Staff</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Équipe</h3>
                <p className="text-gray-600">{appState.teams.find(t => t.id === appState.activeTeamId)?.name || 'Non assigné'}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Missions externes</h3>
                <p className="text-gray-600">
                  {(profileData as StaffMember).openToExternalMissions ? 'Ouvert' : 'Fermé'}
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Interface simplifiée pour les membres du staff. 
                Les fonctionnalités avancées sont disponibles pour les coureurs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default MyDashboardSection;
