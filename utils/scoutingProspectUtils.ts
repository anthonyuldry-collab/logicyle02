import {
  DisciplinePracticed,
  ProspectLevel,
  Rider,
  ScoutingConsentMethod,
  ScoutingDataScope,
  ScoutingProfile,
  ScoutingRequest,
  ScoutingRequestStatus,
  ScoutingStatus,
  User,
} from '../types';
import { LEGAL_VERSIONS } from '../constants';
import { isDemoTalentUser } from '../constants/demoTalentProfiles';
import { getAge } from './ageUtils';
import { getTalentDiscipline } from './talentSearchUtils';
import { LEGAL_ENTITY } from '../legal/meta';

export const SCOUTING_DATA_SCOPE_OPTIONS: {
  value: ScoutingDataScope;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
}[] = [
  {
    value: ScoutingDataScope.COORDINATION,
    label: 'Coordination',
    labelEn: 'Coordination',
    description: 'Échanges et prise de contact pour organiser un suivi',
    descriptionEn: 'Contact and coordination to organise follow-up',
  },
  {
    value: ScoutingDataScope.PERFORMANCE_DATA,
    label: 'Données performance',
    labelEn: 'Performance data',
    description:
      'Caractéristiques, puissance et palmarès — hors santé, allergies, données médicales (art. 9)',
    descriptionEn:
      'Characteristics, power and results — excluding health, allergies, medical data (Art. 9)',
  },
  {
    value: ScoutingDataScope.PERFORMANCE_PROJECT,
    label: 'Projet sportif',
    labelEn: 'Sporting project',
    description: 'Objectifs, axes de progression et projet de performance (hors données de santé)',
    descriptionEn: 'Goals, development areas and performance project (no health data)',
  },
];

export const ALL_SCOUTING_DATA_SCOPES = SCOUTING_DATA_SCOPE_OPTIONS.map(o => o.value);

/**
 * Champs exclus du partage scouting inter-équipes (catégorie particulière / trop sensibles).
 * Un avocat bloquerait leur copie automatique vers le CRM scouting d’une équipe tierce.
 */
export const SCOUTING_EXCLUDED_SENSITIVE_FIELDS = [
  'allergies',
  'healthCondition',
  'emergencyContactName',
  'emergencyContactPhone',
  'socialSecurityNumber',
  'assistantInstructions',
  'dietaryRegimen',
  'foodPreferences',
  'performanceNutrition',
] as const;

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

export function getScoutingScopeLabel(
  scope: ScoutingDataScope,
  language: 'fr' | 'en' = 'fr',
): string {
  const opt = SCOUTING_DATA_SCOPE_OPTIONS.find(o => o.value === scope);
  if (!opt) return scope;
  return language === 'en' ? opt.labelEn : opt.label;
}

export function getProspectLevelLabel(level?: ProspectLevel): string {
  if (!level) return '—';
  return PROSPECT_LEVEL_OPTIONS.find(o => o.value === level)?.label ?? level;
}

export function isContactScoutingRequest(request: ScoutingRequest): boolean {
  return request.prospectLevel !== ProspectLevel.WATCHLIST;
}

export function resolveAthleteBirthDate(user: Pick<User, 'birthDate' | 'signupInfo'>): string | undefined {
  return user.signupInfo?.birthDate || user.birthDate;
}

/** Mineur = âge < 18, ou âge inconnu traité comme mineur pour le partage scouting (prudence). */
export function isAthleteMinorForScouting(
  user: Pick<User, 'birthDate' | 'signupInfo' | 'gdprConsent'>,
): boolean {
  const age = getAge(resolveAthleteBirthDate(user));
  if (age === null) return true;
  return age < 18;
}

/**
 * Capacité à consentir au partage scouting :
 * majeur, ou mineur avec autorisation parentale enregistrée à l’inscription.
 */
export function canAthleteConsentToScouting(
  user: Pick<User, 'birthDate' | 'signupInfo' | 'gdprConsent'>,
): { ok: boolean; reason?: 'minor_no_parental' | 'unknown_age_no_parental' } {
  const age = getAge(resolveAthleteBirthDate(user));
  const hasParental = Boolean(user.gdprConsent?.parentalConsentAcceptedAt);
  if (age !== null && age >= 18) return { ok: true };
  if (hasParental) return { ok: true };
  return {
    ok: false,
    reason: age === null ? 'unknown_age_no_parental' : 'minor_no_parental',
  };
}

export function buildScoutingConsentNoticeText(params: {
  teamName: string;
  scopes: ScoutingDataScope[];
  language: 'fr' | 'en';
}): string {
  const { teamName, scopes, language } = params;
  const scopeLabels = scopes.map(s => getScoutingScopeLabel(s, language)).join(', ');
  if (language === 'en') {
    return [
      `You authorise the team "${teamName}" to access the selected scopes: ${scopeLabels}.`,
      'Purpose: sporting recruitment / scouting evaluation only.',
      'Excluded: health data, allergies, medical data (GDPR Art. 9), social security number, emergency contacts.',
      'You may withdraw consent at any time in-app; access is cut immediately. Proof of consent is retained as required by Art. 7.',
      `Controller for this sharing flow: LogiCycle (${LEGAL_ENTITY.privacyEmail}). Privacy policy: /legal/privacy.`,
      `Notice version: ${LEGAL_VERSIONS.SCOUTING_CONSENT_NOTICE_VERSION} · Privacy pack: ${LEGAL_VERSIONS.PRIVACY_POLICY_VERSION}.`,
    ].join(' ');
  }
  return [
    `Vous autorisez l’équipe « ${teamName} » à accéder aux périmètres sélectionnés : ${scopeLabels}.`,
    'Finalité : évaluation / recrutement sportif (scouting) uniquement.',
    'Exclus : données de santé, allergies, données médicales (art. 9 RGPD), n° de sécurité sociale, contacts d’urgence.',
    'Vous pouvez retirer votre consentement à tout moment in-app ; l’accès est coupé immédiatement. La preuve du consentement est conservée (art. 7).',
    `Responsable pour ce flux de partage : LogiCycle (${LEGAL_ENTITY.privacyEmail}). Politique : /legal/privacy.`,
    `Version notice : ${LEGAL_VERSIONS.SCOUTING_CONSENT_NOTICE_VERSION} · Pack privacy : ${LEGAL_VERSIONS.PRIVACY_POLICY_VERSION}.`,
  ].join(' ');
}

export type ScoutingConsentProofPayload = {
  grantedScopes: ScoutingDataScope[];
  consentRecordedAt: string;
  consentPrivacyVersion: string;
  consentNoticeVersion: string;
  consentNoticeSnapshot: string;
  consentLocale: 'fr' | 'en';
  consentMethod: ScoutingConsentMethod;
  consentNoticeAcknowledged: true;
  responseDate: string;
};

/** Champs preuve consentement à persister / refléter en state local à l'acceptation. */
export function buildScoutingConsentProof(params: {
  grantedScopes: ScoutingDataScope[];
  teamName: string;
  language: 'fr' | 'en';
}): ScoutingConsentProofPayload {
  const now = new Date().toISOString();
  const snapshot = buildScoutingConsentNoticeText({
    teamName: params.teamName,
    scopes: params.grantedScopes,
    language: params.language,
  });
  return {
    grantedScopes: params.grantedScopes,
    consentRecordedAt: now,
    consentPrivacyVersion: LEGAL_VERSIONS.PRIVACY_POLICY_VERSION,
    consentNoticeVersion: LEGAL_VERSIONS.SCOUTING_CONSENT_NOTICE_VERSION,
    consentNoticeSnapshot: snapshot.slice(0, 4000),
    consentLocale: params.language,
    consentMethod: 'in_app_scope_selection',
    consentNoticeAcknowledged: true,
    responseDate: now,
  };
}

/** Consentement actif : accepté, non retiré, demande de contact. */
export function isActiveScoutingConsent(request: ScoutingRequest): boolean {
  return (
    request.status === ScoutingRequestStatus.ACCEPTED &&
    !request.consentWithdrawnAt &&
    isContactScoutingRequest(request)
  );
}

export function hasScoutingScopeAccess(
  userId: string,
  teamRequests: ScoutingRequest[],
  scope: ScoutingDataScope,
): boolean {
  if (isDemoTalentUser(userId)) return true;
  const accepted = teamRequests.find(
    r => r.athleteId === userId && isActiveScoutingConsent(r),
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
      isActiveScoutingConsent(r) &&
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

/**
 * Profil scouting issu d’un utilisateur public / demande de contact :
 * identité sportive de base uniquement — jamais de champs art. 9 / admin sensibles.
 */
export function buildPublicScoutingProfileFromUser(
  user: User,
  riders: Rider[],
  overrides: Partial<ScoutingProfile> = {},
): ScoutingProfile {
  const discipline = getTalentDiscipline(user, riders) ?? DisciplinePracticed.ROUTE;
  const base: ScoutingProfile = {
    id: overrides.id ?? `scout_${user.id}_${Date.now()}`,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    birthDate: resolveAthleteBirthDate(user),
    sex: user.signupInfo?.sex,
    nationality: user.signupInfo?.nationality,
    heightCm: user.signupInfo?.heightCm,
    weightKg: user.signupInfo?.weightKg,
    potentialRating: overrides.potentialRating ?? 3,
    status: overrides.status ?? ScoutingStatus.TO_WATCH,
    prospectLevel: overrides.prospectLevel ?? ProspectLevel.CONTACT_REQUEST,
    linkedAthleteUserId: user.id,
    discipline,
    categories: user.categories ?? [],
    allergies: [],
    photoUrl: user.photoUrl,
  };
  return {
    ...base,
    ...overrides,
    // Jamais d’allergies / données santé via import talent (art. 9)
    allergies: [],
  };
}

export function buildWatchlistProfileFromUser(
  user: User,
  riders: Rider[],
): ScoutingProfile {
  return buildPublicScoutingProfileFromUser(user, riders, {
    id: `scout_watch_${user.id}_${Date.now()}`,
    prospectLevel: ProspectLevel.WATCHLIST,
    status: ScoutingStatus.TO_WATCH,
    internalWatchNotes: 'Ajouté en suivi discret depuis la recherche talents',
  });
}

export function buildContactRequestMessage(
  teamName: string,
  scopes: ScoutingDataScope[],
  language: 'fr' | 'en' = 'fr',
): string {
  const labels = scopes.map(s => getScoutingScopeLabel(s, language)).join(', ');
  if (language === 'en') {
    return `${teamName} wants to get in touch and access: ${labels}. You choose what you agree to share. Health/medical data are never included.`;
  }
  return `${teamName} souhaite entrer en contact et accéder à : ${labels}. Vous choisissez ce que vous acceptez de partager. Les données de santé / médicales sont exclues.`;
}
