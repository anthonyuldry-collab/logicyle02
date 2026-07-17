import React, { useState, useEffect, useMemo } from 'react';
import {
  Rider,
  User,
  UserRole,
  StaffMember,
  RaceEvent,
  RiderEventSelection,
  AppState,
  StaffRole,
  StaffStatus,
  FormeStatus,
  MoralStatus,
  HealthCondition,
  DisciplinePracticed,
  AppSection,
  TeamRole,
  RiderEventPreference,
  PermissionLevel,
  EventTransportLeg,
  EventChecklistItem,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import RiderDashboardTab from '../components/riderDetailTabs/RiderDashboardTab';
import StaffDashboardTab from '../components/StaffDashboardTab';
import { getOwnRider } from '../utils/riderAccessUtils';
import { getStaffMemberForUser } from '../utils/staffMemberUtils';

interface MyDashboardSectionProps {
  riders: Rider[];
  staff: StaffMember[];
  currentUser: User;
  raceEvents: RaceEvent[];
  riderEventSelections: RiderEventSelection[];
  eventTransportLegs?: EventTransportLeg[];
  eventChecklistItems?: EventChecklistItem[];
  effectivePermissions?: Partial<Record<AppSection, PermissionLevel[]>>;
  appState: AppState;
  navigateTo?: (section: AppSection, eventId?: string, tabHint?: string) => void;
  onUpdateRiderPreference?: (
    eventId: string,
    riderId: string,
    preference: RiderEventPreference,
    objectives?: string
  ) => void;
  onSaveRider?: (rider: Rider) => void;
}

const MyDashboardSection: React.FC<MyDashboardSectionProps> = ({
  riders,
  staff,
  currentUser,
  raceEvents,
  riderEventSelections,
  eventTransportLegs = [],
  eventChecklistItems = [],
  effectivePermissions,
  appState,
  navigateTo,
  onUpdateRiderPreference,
  onSaveRider,
}) => {
  const [profileData, setProfileData] = useState<Rider | StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.userRole || !currentUser.email) {
      setIsLoading(false);
      return;
    }

    if (currentUser.userRole === UserRole.COUREUR) {
      const found = getOwnRider(riders, currentUser);
      setProfileData(
        found ??
          ({
            id: currentUser.id,
            firstName: currentUser.firstName || 'Coureur',
            lastName: currentUser.lastName || '',
            email: currentUser.email,
            qualitativeProfile: {} as Rider['qualitativeProfile'],
            disciplines: [DisciplinePracticed.ROUTE],
            categories: ['Senior'],
            forme: FormeStatus.INCONNU,
            moral: MoralStatus.NEUTRE,
            healthCondition: HealthCondition.PRET_A_COURIR,
            favoriteRaces: [],
            resultsHistory: [],
            performanceGoals: '',
            physiquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            techniquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            mentalPerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            environnementPerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            tactiquePerformanceProject: { score: 0, notes: '', forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
            allergies: [],
            performanceNutrition: { hydrationStrategy: '', preRaceMeal: '', duringRaceNutrition: '', recoveryNutrition: '' },
            roadBikeSetup: { bikeType: 'Route', size: '', brand: '', model: '', specifics: '', cotes: '' },
            ttBikeSetup: { bikeType: 'Contre-la-montre', size: '', brand: '', model: '', specifics: '', cotes: '' },
            clothing: [],
            charSprint: 0,
            charAnaerobic: 0,
            charPuncher: 0,
            charClimbing: 0,
            charRouleur: 0,
            generalPerformanceScore: 0,
            fatigueResistanceScore: 0,
          } as Rider)
      );
    } else if (currentUser.userRole === UserRole.STAFF || currentUser.userRole === UserRole.MANAGER) {
      setProfileData(
        getStaffMemberForUser(currentUser, staff) ??
          ({
            id: currentUser.id,
            firstName: currentUser.firstName || 'Staff',
            lastName: currentUser.lastName || '',
            email: currentUser.email,
            role: StaffRole.AUTRE,
            status: StaffStatus.VACATAIRE,
            openToExternalMissions: false,
            skills: [],
            availability: [],
          } as StaffMember)
      );
    } else {
      setProfileData(null);
    }

    setIsLoading(false);
  }, [currentUser, riders, staff]);

  const riderForDashboard = useMemo(() => {
    if (!profileData || currentUser.userRole !== UserRole.COUREUR) return null;
    const rider = profileData as Rider;
    const teamName = appState.teams.find((t) => t.id === appState.activeTeamId)?.name;
    return { ...rider, teamName: rider.teamName || teamName };
  }, [profileData, currentUser.userRole, appState.teams, appState.activeTeamId]);

  if (isLoading) {
    return (
      <SectionWrapper title="Tableau de bord" variant="immersive">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
        </div>
      </SectionWrapper>
    );
  }

  if (!profileData) {
    return (
      <SectionWrapper title="Tableau de bord" variant="immersive">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center">
          <p className="text-slate-300">Profil introuvable.</p>
        </div>
      </SectionWrapper>
    );
  }

  if (currentUser.userRole === UserRole.COUREUR && riderForDashboard) {
    return (
      <SectionWrapper
        title={`Bonjour, ${riderForDashboard.firstName}`}
        variant="immersive"
      >
        <RiderDashboardTab
          formData={riderForDashboard}
          raceEvents={raceEvents}
          riderEventSelections={riderEventSelections}
          onUpdateRiderPreference={onUpdateRiderPreference}
          onUpdateGlobalPreferences={(riderId, globalWishes, seasonObjectives) => {
            onSaveRider?.({
              ...riderForDashboard,
              id: riderId,
              globalWishes,
              seasonObjectives,
            });
          }}
          currentUser={currentUser}
          teamProducts={appState.teamProducts}
          onNavigateTo={navigateTo}
          riderSelfDebriefs={appState.riderSelfDebriefs || []}
        />
      </SectionWrapper>
    );
  }

  if (currentUser.permissionRole === TeamRole.ADMIN || currentUser.userRole === UserRole.MANAGER) {
    return null;
  }

  const staffMember = profileData as StaffMember;
  return (
    <SectionWrapper title="Tableau de bord" variant="immersive">
      <StaffDashboardTab
        staffMember={staffMember}
        raceEvents={raceEvents}
        eventTransportLegs={eventTransportLegs}
        eventChecklistItems={eventChecklistItems}
        effectivePermissions={effectivePermissions}
        teamLevel={appState.teamLevel}
        operationalSettings={appState.operationalSettings}
        onNavigateTo={navigateTo}
      />
    </SectionWrapper>
  );
};

export default MyDashboardSection;
