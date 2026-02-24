/**
 * Uniformise l'affichage des rôles du personnel.
 * Toutes les variantes (mecano, mécanicien, MECANO, etc.) sont affichées avec le même libellé officiel.
 */
import { StaffRole } from '../types';

/** Libellés d'affichage officiels pour chaque rôle (singulier, pour listes et badges). */
const STAFF_ROLE_DISPLAY_LABELS: Record<StaffRole, string> = {
  [StaffRole.MANAGER]: 'Manager',
  [StaffRole.DS]: 'Directeur Sportif',
  [StaffRole.ASSISTANT]: 'Assistant(e)',
  [StaffRole.MECANO]: 'Mécanicien',
  [StaffRole.COMMUNICATION]: 'Communication',
  [StaffRole.MEDECIN]: 'Médecin',
  [StaffRole.KINE]: 'Kinésithérapeute',
  [StaffRole.RESP_PERF]: 'Responsable Performance',
  [StaffRole.ENTRAINEUR]: 'Entraîneur',
  [StaffRole.DATA_ANALYST]: 'Data Analyste',
  [StaffRole.PREPA_PHYSIQUE]: 'Préparateur Physique',
  [StaffRole.AUTRE]: 'Autre',
};

/** Clés des rôles (pour couleurs, options formulaire). */
export const STAFF_ROLE_KEYS = [
  'MANAGER', 'DS', 'ASSISTANT', 'MECANO', 'COMMUNICATION', 'MEDECIN', 'KINE',
  'RESP_PERF', 'ENTRAINEUR', 'DATA_ANALYST', 'PREPA_PHYSIQUE', 'AUTRE'
] as const;
export type StaffRoleKeyString = typeof STAFF_ROLE_KEYS[number];

/** Clés des rôles dans l'objet événement (ex: mecanoId, assistantId). */
export const STAFF_ROLE_KEY_TO_EVENT_KEY: Record<StaffRoleKeyString, string> = {
  MANAGER: 'managerId',
  DS: 'directeurSportifId',
  ASSISTANT: 'assistantId',
  MECANO: 'mecanoId',
  COMMUNICATION: 'communicationId',
  MEDECIN: 'medecinId',
  KINE: 'kineId',
  RESP_PERF: 'respPerfId',
  ENTRAINEUR: 'entraineurId',
  DATA_ANALYST: 'dataAnalystId',
  PREPA_PHYSIQUE: 'prepaPhysiqueId',
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
  ds: StaffRole.DS,
  'directeur sportif': StaffRole.DS,
  assistant: StaffRole.ASSISTANT,
  'assistant(e)': StaffRole.ASSISTANT,
  mecano: StaffRole.MECANO,
  mécanicien: StaffRole.MECANO,
  mecanicien: StaffRole.MECANO,
  mécaniciens: StaffRole.MECANO,
  mecaniciens: StaffRole.MECANO,
  communication: StaffRole.COMMUNICATION,
  medecin: StaffRole.MEDECIN,
  médecin: StaffRole.MEDECIN,
  kine: StaffRole.KINE,
  kinésithérapeute: StaffRole.KINE,
  kinesthetrapeute: StaffRole.KINE,
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
  autre: StaffRole.AUTRE,
};

/**
 * Retourne le libellé d'affichage uniforme pour un rôle de staff.
 * Gère les valeurs enum (clé ou valeur), les variantes courantes (mecano, ds, resp_perf, etc.)
 * et les anciennes données.
 */
export function getStaffRoleDisplayLabel(role: StaffRole | string | null | undefined): string {
  if (role == null || role === '') return '';
  const s = String(role).trim();
  if (!s) return '';

  // Déjà une clé enum
  if (Object.prototype.hasOwnProperty.call(STAFF_ROLE_DISPLAY_LABELS, s as StaffRole)) {
    return STAFF_ROLE_DISPLAY_LABELS[s as StaffRole];
  }

  // Valeur enum exacte (ex: "Mécanicien", "Assistant(e)")
  const byValue = (Object.entries(STAFF_ROLE_DISPLAY_LABELS) as [StaffRole, string][]).find(
    ([, label]) => label === s
  );
  if (byValue) return byValue[1];

  // Variantes (minuscule, sans accent)
  const normalized = s.toLowerCase().trim();
  const variantKey = ROLE_VARIANTS_TO_KEY[normalized];
  if (variantKey != null) return STAFF_ROLE_DISPLAY_LABELS[variantKey];

  // Variante sans accents pour comparaison
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
    ([key]) => key.replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/î/g, 'i').replace(/ï/g, 'i').replace(/ô/g, 'o').replace(/û/g, 'u').replace(/ù/g, 'u').replace(/ç/g, 'c') === noAccent
  );
  if (byNoAccent) return STAFF_ROLE_DISPLAY_LABELS[byNoAccent[1]];

  return s;
}

/** Retourne la clé du rôle (ex: "MECANO") à partir d'une valeur quelconque (pour couleurs, options). */
export function getStaffRoleKey(role: StaffRole | string | null | undefined): StaffRoleKeyString | null {
  if (role == null || role === '') return null;
  const s = String(role).trim();
  const normalized = s.toLowerCase().trim();
  const variantKey = ROLE_VARIANTS_TO_KEY[normalized];
  if (variantKey != null) return keyOfStaffRole(variantKey);
  if (Object.values(StaffRole).includes(s as StaffRole)) return keyOfStaffRole(s as StaffRole);
  const byValue = (Object.entries(STAFF_ROLE_DISPLAY_LABELS) as [StaffRole, string][]).find(([, label]) => label === s);
  return byValue ? keyOfStaffRole(byValue[0]) : null;
}

function keyOfStaffRole(r: StaffRole): StaffRoleKeyString {
  const map: Record<StaffRole, StaffRoleKeyString> = {
    [StaffRole.MANAGER]: 'MANAGER',
    [StaffRole.DS]: 'DS',
    [StaffRole.ASSISTANT]: 'ASSISTANT',
    [StaffRole.MECANO]: 'MECANO',
    [StaffRole.COMMUNICATION]: 'COMMUNICATION',
    [StaffRole.MEDECIN]: 'MEDECIN',
    [StaffRole.KINE]: 'KINE',
    [StaffRole.RESP_PERF]: 'RESP_PERF',
    [StaffRole.ENTRAINEUR]: 'ENTRAINEUR',
    [StaffRole.DATA_ANALYST]: 'DATA_ANALYST',
    [StaffRole.PREPA_PHYSIQUE]: 'PREPA_PHYSIQUE',
    [StaffRole.AUTRE]: 'AUTRE',
  };
  return map[r];
}
