import {
  DisciplinePracticed,
  ProspectLevel,
  Rider,
  ScoutingDataScope,
  ScoutingProfile,
  ScoutingRequest,
  ScoutingRequestStatus,
  ScoutingStatus,
  User,
} from '../types';
import { isDemoTalentUser } from '../constants/demoTalentProfiles';
import { getTalentDiscipline } from './talentSearchUtils';

export const SCOUTING_DATA_SCOPE_OPTIONS: {
  value: ScoutingDataScope;
  label: string;
  description: string;
}[] = [
  {
    value: ScoutingDataScope.COORDINATION,
    label: 'Coordination',
    description: 'Échanges et prise de contact pour organiser un suivi',
  },
  {
    value: ScoutingDataScope.PERFORMANCE_DATA,
    label: 'Données performance',
    description: 'Caractéristiques, puissance et palmarès',
  },
  {
    value: ScoutingDataScope.PERFORMANCE_PROJECT,
    label: 'Projet sportif',
    description: 'Objectifs, axes de progression et projet de performance',
  },
];

export const ALL_SCOUTING_DATA_SCOPES = SCOUTING_DATA_SCOPE_OPTIONS.map(o => o.value);

export const PROSPECT_LEVEL_OPTIONS: {
  value: ProspectLevel;
  label: string;
  description: string;
}[] = [
  {
    value: ProspectLevel.WATCHLIST,
    label: 'Suivi discret',
    description: "Prospect interne — l'athlète n'est pas informé",
  },
  {
    value: ProspectLevel.CONTACT_REQUEST,
    label: 'Demande de contact',
    description: "L'athlète reçoit la demande et choisit ce qu'il partage",
  },
];

export function getScoutingScopeLabel(scope: ScoutingDataScope): string {
  return SCOUTING_DATA_SCOPE_OPTIONS.find(o => o.value === scope)?.label ?? scope;
}

export function getProspectLevelLabel(level?: ProspectLevel): string {
  if (!level) return '—';
  return PROSPECT_LEVEL_OPTIONS.find(o => o.value === level)?.label ?? level;
}

export function isContactScoutingRequest(request: ScoutingRequest): boolean {
  return request.prospectLevel !== ProspectLevel.WATCHLIST;
}

export function hasScoutingScopeAccess(
  userId: string,
  teamRequests: ScoutingRequest[],
  scope: ScoutingDataScope,
): boolean {
  if (isDemoTalentUser(userId)) return true;
  const accepted = teamRequests.find(
    r =>
      r.athleteId === userId &&
      r.status === ScoutingRequestStatus.ACCEPTED &&
      isContactScoutingRequest(r),
  );
  if (!accepted) return false;
  if (!accepted.grantedScopes?.length) return true;
  return accepted.grantedScopes.includes(scope);
}

export function hasAnyScoutingDataAccess(
  userId: string,
  teamRequests: ScoutingRequest[],
): boolean {
  if (isDemoTalentUser(userId)) return true;
  return teamRequests.some(
    r =>
      r.athleteId === userId &&
      r.status === ScoutingRequestStatus.ACCEPTED &&
      isContactScoutingRequest(r) &&
      (!r.grantedScopes?.length || r.grantedScopes.length > 0),
  );
}

export function isAthleteOnWatchlist(
  userId: string,
  scoutingProfiles: ScoutingProfile[],
): boolean {
  return scoutingProfiles.some(
    p =>
      p.linkedAthleteUserId === userId &&
      (p.prospectLevel === ProspectLevel.WATCHLIST || !p.prospectLevel),
  );
}

export function buildWatchlistProfileFromUser(
  user: User,
  riders: Rider[],
): ScoutingProfile {
  const discipline = getTalentDiscipline(user, riders) ?? DisciplinePracticed.ROUTE;
  return {
    id: `scout_watch_${user.id}_${Date.now()}`,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    birthDate: user.signupInfo?.birthDate,
    sex: user.signupInfo?.sex,
    nationality: user.signupInfo?.nationality,
    heightCm: user.signupInfo?.heightCm,
    weightKg: user.signupInfo?.weightKg,
    potentialRating: 3,
    status: ScoutingStatus.TO_WATCH,
    prospectLevel: ProspectLevel.WATCHLIST,
    linkedAthleteUserId: user.id,
    discipline,
    categories: user.categories ?? [],
    allergies: [],
    internalWatchNotes: 'Ajouté en suivi discret depuis la recherche talents',
  };
}

export function buildContactRequestMessage(
  teamName: string,
  scopes: ScoutingDataScope[],
): string {
  const labels = scopes.map(getScoutingScopeLabel).join(', ');
  return `${teamName} souhaite entrer en contact et accéder à : ${labels}. Vous choisissez ce que vous acceptez de partager.`;
}
