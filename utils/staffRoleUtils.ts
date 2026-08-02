/**
 * Uniformise l'affichage des rôles du personnel.
 * Toutes les variantes (mecano, mécanicien, MECANO, etc.) sont affichées avec le même libellé officiel.
 */
import { StaffRole } from '../types';

/** Libellés d'affichage officiels pour chaque rôle (singulier, pour listes et badges). */
const STAFF_ROLE_DISPLAY_LABELS: Record<StaffRole, string> = {
  [StaffRole.MANAGER]: 'Manager',
  [StaffRole.PRESIDENT]: 'Président',
  [StaffRole.VICE_PRESIDENT]: 'Vice-président',
  [StaffRole.SECRETAIRE]: 'Secrétaire',
  [StaffRole.TRESORIER]: 'Trésorier',
  [StaffRole.DS]: 'Directeur Sportif',
  [StaffRole.ASSISTANT]: 'Assistant(e)',
  [StaffRole.SOIGNEUR]: 'Soigneur / Soigneuse',
  [StaffRole.MECANO]: 'Mécanicien',
  [StaffRole.MATERIAL]: 'Responsable matériel',
  [StaffRole.COMMUNICATION]: 'Communication',
  [StaffRole.PHOTO_VIDEO]: 'Photographe / Vidéaste',
  [StaffRole.MEDECIN]: 'Médecin',
  [StaffRole.KINE]: 'Kinésithérapeute',
  [StaffRole.OSTEOPATHE]: 'Ostéopathe',
  [StaffRole.NUTRITIONNISTE]: 'Nutritionniste',
  [StaffRole.RESP_PERF]: 'Responsable Performance',
  [StaffRole.ENTRAINEUR]: 'Entraîneur',
  [StaffRole.DATA_ANALYST]: 'Data Analyste',
  [StaffRole.PREPA_PHYSIQUE]: 'Préparateur Physique',
  [StaffRole.CHAUFFEUR]: 'Chauffeur',
  [StaffRole.LOGISTICIEN]: 'Logisticien',
  [StaffRole.CUISINIER]: 'Cuisinier / Restauration',
  [StaffRole.HOSPITALITY]: 'Hospitalité / Accueil',
  [StaffRole.AUTRE]: 'Autre (à préciser)',
};

/** Clés des rôles (pour couleurs, options formulaire). */
export const STAFF_ROLE_KEYS = [
  'MANAGER',
  'PRESIDENT',
  'VICE_PRESIDENT',
  'SECRETAIRE',
  'TRESORIER',
  'DS',
  'ASSISTANT',
  'SOIGNEUR',
  'MECANO',
  'MATERIAL',
  'COMMUNICATION',
  'PHOTO_VIDEO',
  'MEDECIN',
  'KINE',
  'OSTEOPATHE',
  'NUTRITIONNISTE',
  'RESP_PERF',
  'ENTRAINEUR',
  'DATA_ANALYST',
  'PREPA_PHYSIQUE',
  'CHAUFFEUR',
  'LOGISTICIEN',
  'CUISINIER',
  'HOSPITALITY',
  'AUTRE',
] as const;
export type StaffRoleKeyString = typeof STAFF_ROLE_KEYS[number];

/**
 * Rôles bureau / direction avec le même niveau d’accès que Manager
 * (plein accès équipe, hors Super Admin plateforme).
 */
export const MANAGER_EQUIVALENT_STAFF_ROLES = new Set<StaffRoleKeyString>([
  'MANAGER',
  'PRESIDENT',
  'VICE_PRESIDENT',
]);

export function isManagerEquivalentStaffRole(
  role: StaffRole | string | null | undefined,
): boolean {
  const key = getStaffRoleKey(role);
  return Boolean(key && MANAGER_EQUIVALENT_STAFF_ROLES.has(key));
}

/** Clés des rôles dans l'objet événement (ex: mecanoId, assistantId). */
export const STAFF_ROLE_KEY_TO_EVENT_KEY: Record<StaffRoleKeyString, string> = {
  MANAGER: 'managerId',
  PRESIDENT: 'managerId',
  VICE_PRESIDENT: 'managerId',
  SECRETAIRE: 'assistantId',
  TRESORIER: 'assistantId',
  DS: 'directeurSportifId',
  ASSISTANT: 'assistantId',
  SOIGNEUR: 'assistantId',
  MECANO: 'mecanoId',
  MATERIAL: 'mecanoId',
  COMMUNICATION: 'communicationId',
  PHOTO_VIDEO: 'communicationId',
  MEDECIN: 'medecinId',
  KINE: 'kineId',
  OSTEOPATHE: 'kineId',
  NUTRITIONNISTE: 'assistantId',
  RESP_PERF: 'respPerfId',
  ENTRAINEUR: 'entraineurId',
  DATA_ANALYST: 'dataAnalystId',
  PREPA_PHYSIQUE: 'prepaPhysiqueId',
  CHAUFFEUR: 'assistantId',
  LOGISTICIEN: 'assistantId',
  CUISINIER: 'assistantId',
  HOSPITALITY: 'assistantId',
  AUTRE: 'assistantId',
};

/** Liste des clés événement pour les rôles staff (pour retirer un staff de tous les rôles). */
export const EVENT_ROLE_KEYS = [
  'managerId', 'directeurSportifId', 'assistantId', 'mecanoId', 'kineId', 'medecinId',
  'respPerfId', 'entraineurId', 'dataAnalystId', 'prepaPhysiqueId', 'communicationId'
] as const;

/** Retourne la clé du champ événement (ex: mecanoId) pour le rôle d'un staff. */
export function getEventRoleKeyForStaff(role: StaffRole | string | null | undefined): string | null {
  const key = getStaffRoleKey(role);
  return key ? STAFF_ROLE_KEY_TO_EVENT_KEY[key] : null;
}

/** Variantes (minuscule, sans accent, abréviations) → clé enum. */
const ROLE_VARIANTS_TO_KEY: Record<string, StaffRole> = {
  manager: StaffRole.MANAGER,
  president: StaffRole.PRESIDENT,
  président: StaffRole.PRESIDENT,
  presidente: StaffRole.PRESIDENT,
  présidente: StaffRole.PRESIDENT,
  'vice-president': StaffRole.VICE_PRESIDENT,
  'vice-président': StaffRole.VICE_PRESIDENT,
  'vice president': StaffRole.VICE_PRESIDENT,
  'vice président': StaffRole.VICE_PRESIDENT,
  vicepresident: StaffRole.VICE_PRESIDENT,
  secretaire: StaffRole.SECRETAIRE,
  secrétaire: StaffRole.SECRETAIRE,
  tresorier: StaffRole.TRESORIER,
  trésorier: StaffRole.TRESORIER,
  tresoriere: StaffRole.TRESORIER,
  trésorière: StaffRole.TRESORIER,
  ds: StaffRole.DS,
  'directeur sportif': StaffRole.DS,
  assistant: StaffRole.ASSISTANT,
  'assistant(e)': StaffRole.ASSISTANT,
  soigneur: StaffRole.SOIGNEUR,
  soigneuse: StaffRole.SOIGNEUR,
  mecano: StaffRole.MECANO,
  mécanicien: StaffRole.MECANO,
  mecanicien: StaffRole.MECANO,
  mécaniciens: StaffRole.MECANO,
  mecaniciens: StaffRole.MECANO,
  material: StaffRole.MATERIAL,
  'responsable materiel': StaffRole.MATERIAL,
  'responsable matériel': StaffRole.MATERIAL,
  communication: StaffRole.COMMUNICATION,
  photo: StaffRole.PHOTO_VIDEO,
  photographe: StaffRole.PHOTO_VIDEO,
  video: StaffRole.PHOTO_VIDEO,
  vidéaste: StaffRole.PHOTO_VIDEO,
  videaste: StaffRole.PHOTO_VIDEO,
  medecin: StaffRole.MEDECIN,
  médecin: StaffRole.MEDECIN,
  kine: StaffRole.KINE,
  kinésithérapeute: StaffRole.KINE,
  kinesthetrapeute: StaffRole.KINE,
  osteopathe: StaffRole.OSTEOPATHE,
  ostéopathe: StaffRole.OSTEOPATHE,
  nutritionniste: StaffRole.NUTRITIONNISTE,
  dieteticien: StaffRole.NUTRITIONNISTE,
  diététicien: StaffRole.NUTRITIONNISTE,
  resp_perf: StaffRole.RESP_PERF,
  'resp perf': StaffRole.RESP_PERF,
  'responsable performance': StaffRole.RESP_PERF,
  entraineur: StaffRole.ENTRAINEUR,
  entraîneur: StaffRole.ENTRAINEUR,
  'data analyste': StaffRole.DATA_ANALYST,
  data_analyst: StaffRole.DATA_ANALYST,
  prepa_physique: StaffRole.PREPA_PHYSIQUE,
  'préparateur physique': StaffRole.PREPA_PHYSIQUE,
  preparateur: StaffRole.PREPA_PHYSIQUE,
  chauffeur: StaffRole.CHAUFFEUR,
  driver: StaffRole.CHAUFFEUR,
  logisticien: StaffRole.LOGISTICIEN,
  logistique: StaffRole.LOGISTICIEN,
  cuisinier: StaffRole.CUISINIER,
  cuisine: StaffRole.CUISINIER,
  hospitality: StaffRole.HOSPITALITY,
  hospitalite: StaffRole.HOSPITALITY,
  accueil: StaffRole.HOSPITALITY,
  autre: StaffRole.AUTRE,
};

/**
 * Retourne le libellé d'affichage uniforme pour un rôle de staff.
 * Gère les valeurs enum (clé ou valeur), les variantes courantes (mecano, ds, resp_perf, etc.)
 * et les anciennes données.
 * @param otherLabel précision si rôle = Autre (staffRoleOtherLabel / customRole)
 */
export function getStaffRoleDisplayLabel(
  role: StaffRole | string | null | undefined,
  otherLabel?: string | null,
): string {
  if (role == null || role === '') return '';
  const s = String(role).trim();
  if (!s) return '';

  const resolved = resolveStaffRole(s);
  if (resolved === StaffRole.AUTRE) {
    const detail = String(otherLabel || '').trim();
    return detail ? `Autre — ${detail}` : STAFF_ROLE_DISPLAY_LABELS[StaffRole.AUTRE];
  }
  if (resolved) return STAFF_ROLE_DISPLAY_LABELS[resolved];

  // Déjà une clé enum
  if (Object.prototype.hasOwnProperty.call(STAFF_ROLE_DISPLAY_LABELS, s as StaffRole)) {
    return STAFF_ROLE_DISPLAY_LABELS[s as StaffRole];
  }

  // Valeur enum exacte
  const byValue = (Object.entries(STAFF_ROLE_DISPLAY_LABELS) as [StaffRole, string][]).find(
    ([, label]) => label === s || label.startsWith(s),
  );
  if (byValue) {
    if (byValue[0] === StaffRole.AUTRE) {
      const detail = String(otherLabel || '').trim();
      return detail ? `Autre — ${detail}` : byValue[1];
    }
    return byValue[1];
  }

  // Variantes
  const normalized = s.toLowerCase().trim();
  const variantKey = ROLE_VARIANTS_TO_KEY[normalized];
  if (variantKey != null) {
    if (variantKey === StaffRole.AUTRE) {
      const detail = String(otherLabel || '').trim();
      return detail ? `Autre — ${detail}` : STAFF_ROLE_DISPLAY_LABELS[StaffRole.AUTRE];
    }
    return STAFF_ROLE_DISPLAY_LABELS[variantKey];
  }

  const noAccent = normalized
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/î/g, 'i')
    .replace(/ï/g, 'i')
    .replace(/ô/g, 'o')
    .replace(/û/g, 'u')
    .replace(/ù/g, 'u')
    .replace(/ç/g, 'c');
  const byNoAccent = Object.entries(ROLE_VARIANTS_TO_KEY).find(
    ([key]) =>
      key
        .replace(/é/g, 'e')
        .replace(/è/g, 'e')
        .replace(/ê/g, 'e')
        .replace(/î/g, 'i')
        .replace(/ï/g, 'i')
        .replace(/ô/g, 'o')
        .replace(/û/g, 'u')
        .replace(/ù/g, 'u')
        .replace(/ç/g, 'c') === noAccent,
  );
  if (byNoAccent) return STAFF_ROLE_DISPLAY_LABELS[byNoAccent[1]];

  return s;
}

/** Retourne la clé du rôle (ex: "MECANO") à partir d'une valeur quelconque (pour couleurs, options). */
export function getStaffRoleKey(role: StaffRole | string | null | undefined): StaffRoleKeyString | null {
  if (role == null || role === '') return null;
  const s = String(role).trim();
  if ((STAFF_ROLE_KEYS as readonly string[]).includes(s)) return s as StaffRoleKeyString;
  const normalized = s.toLowerCase().trim();
  const variantKey = ROLE_VARIANTS_TO_KEY[normalized];
  if (variantKey != null) return keyOfStaffRole(variantKey);
  if (Object.values(StaffRole).includes(s as StaffRole)) return keyOfStaffRole(s as StaffRole);
  const byValue = (Object.entries(STAFF_ROLE_DISPLAY_LABELS) as [StaffRole, string][]).find(
    ([, label]) => label === s,
  );
  return byValue ? keyOfStaffRole(byValue[0]) : null;
}

function keyOfStaffRole(r: StaffRole): StaffRoleKeyString {
  const map: Record<StaffRole, StaffRoleKeyString> = {
    [StaffRole.MANAGER]: 'MANAGER',
    [StaffRole.PRESIDENT]: 'PRESIDENT',
    [StaffRole.VICE_PRESIDENT]: 'VICE_PRESIDENT',
    [StaffRole.SECRETAIRE]: 'SECRETAIRE',
    [StaffRole.TRESORIER]: 'TRESORIER',
    [StaffRole.DS]: 'DS',
    [StaffRole.ASSISTANT]: 'ASSISTANT',
    [StaffRole.SOIGNEUR]: 'SOIGNEUR',
    [StaffRole.MECANO]: 'MECANO',
    [StaffRole.MATERIAL]: 'MATERIAL',
    [StaffRole.COMMUNICATION]: 'COMMUNICATION',
    [StaffRole.PHOTO_VIDEO]: 'PHOTO_VIDEO',
    [StaffRole.MEDECIN]: 'MEDECIN',
    [StaffRole.KINE]: 'KINE',
    [StaffRole.OSTEOPATHE]: 'OSTEOPATHE',
    [StaffRole.NUTRITIONNISTE]: 'NUTRITIONNISTE',
    [StaffRole.RESP_PERF]: 'RESP_PERF',
    [StaffRole.ENTRAINEUR]: 'ENTRAINEUR',
    [StaffRole.DATA_ANALYST]: 'DATA_ANALYST',
    [StaffRole.PREPA_PHYSIQUE]: 'PREPA_PHYSIQUE',
    [StaffRole.CHAUFFEUR]: 'CHAUFFEUR',
    [StaffRole.LOGISTICIEN]: 'LOGISTICIEN',
    [StaffRole.CUISINIER]: 'CUISINIER',
    [StaffRole.HOSPITALITY]: 'HOSPITALITY',
    [StaffRole.AUTRE]: 'AUTRE',
  };
  return map[r];
}

const KEY_TO_STAFF_ROLE: Record<StaffRoleKeyString, StaffRole> = {
  MANAGER: StaffRole.MANAGER,
  PRESIDENT: StaffRole.PRESIDENT,
  VICE_PRESIDENT: StaffRole.VICE_PRESIDENT,
  SECRETAIRE: StaffRole.SECRETAIRE,
  TRESORIER: StaffRole.TRESORIER,
  DS: StaffRole.DS,
  ASSISTANT: StaffRole.ASSISTANT,
  SOIGNEUR: StaffRole.SOIGNEUR,
  MECANO: StaffRole.MECANO,
  MATERIAL: StaffRole.MATERIAL,
  COMMUNICATION: StaffRole.COMMUNICATION,
  PHOTO_VIDEO: StaffRole.PHOTO_VIDEO,
  MEDECIN: StaffRole.MEDECIN,
  KINE: StaffRole.KINE,
  OSTEOPATHE: StaffRole.OSTEOPATHE,
  NUTRITIONNISTE: StaffRole.NUTRITIONNISTE,
  RESP_PERF: StaffRole.RESP_PERF,
  ENTRAINEUR: StaffRole.ENTRAINEUR,
  DATA_ANALYST: StaffRole.DATA_ANALYST,
  PREPA_PHYSIQUE: StaffRole.PREPA_PHYSIQUE,
  CHAUFFEUR: StaffRole.CHAUFFEUR,
  LOGISTICIEN: StaffRole.LOGISTICIEN,
  CUISINIER: StaffRole.CUISINIER,
  HOSPITALITY: StaffRole.HOSPITALITY,
  AUTRE: StaffRole.AUTRE,
};

/**
 * Normalise n’importe quelle valeur (clé enum, libellé FR, variante) vers un StaffRole.
 * Retourne undefined si vide / non reconnu (pour validation inscription).
 */
export function resolveStaffRole(
  role: StaffRole | string | null | undefined,
): StaffRole | undefined {
  if (role == null || String(role).trim() === '') return undefined;
  const s = String(role).trim();
  if ((Object.values(StaffRole) as string[]).includes(s)) return s as StaffRole;
  if ((STAFF_ROLE_KEYS as readonly string[]).includes(s)) return KEY_TO_STAFF_ROLE[s as StaffRoleKeyString];
  const key = getStaffRoleKey(s);
  return key ? KEY_TO_STAFF_ROLE[key] : undefined;
}

/** Comme resolveStaffRole, avec repli sur Autre. */
export function resolveStaffRoleOrDefault(
  role: StaffRole | string | null | undefined,
): StaffRole {
  return resolveStaffRole(role) ?? StaffRole.AUTRE;
}

export function isStaffRoleAutre(role: StaffRole | string | null | undefined): boolean {
  return resolveStaffRole(role) === StaffRole.AUTRE || getStaffRoleKey(role) === 'AUTRE';
}
