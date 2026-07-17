import { ChecklistRole, ChecklistTemplate } from '../types';

/** Enregistrement vide pour tous les rôles checklist */
export function buildEmptyChecklistTemplatesRecord(): Record<ChecklistRole, ChecklistTemplate[]> {
  return Object.values(ChecklistRole).reduce(
    (acc, role) => {
      acc[role] = [];
      return acc;
    },
    {} as Record<ChecklistRole, ChecklistTemplate[]>
  );
}

/** StaffRole (enum / string) → ChecklistRole si applicable */
export function mapStaffRoleToChecklistRole(
  staffRole: string | null | undefined
): ChecklistRole | null {
  if (!staffRole) return null;
  const normalized = String(staffRole).trim().toLowerCase();
  const map: Record<string, ChecklistRole> = {
    [ChecklistRole.DS.toLowerCase()]: ChecklistRole.DS,
    'directeur sportif': ChecklistRole.DS,
    ds: ChecklistRole.DS,
    [ChecklistRole.ASSISTANT.toLowerCase()]: ChecklistRole.ASSISTANT,
    'assistant(e)': ChecklistRole.ASSISTANT,
    assistant: ChecklistRole.ASSISTANT,
    [ChecklistRole.MECANO.toLowerCase()]: ChecklistRole.MECANO,
    mécanicien: ChecklistRole.MECANO,
    mecano: ChecklistRole.MECANO,
    [ChecklistRole.MANAGER.toLowerCase()]: ChecklistRole.MANAGER,
    manager: ChecklistRole.MANAGER,
    [ChecklistRole.COMMUNICATION.toLowerCase()]: ChecklistRole.COMMUNICATION,
    communication: ChecklistRole.COMMUNICATION,
    [ChecklistRole.ENTRAINEUR.toLowerCase()]: ChecklistRole.ENTRAINEUR,
    entraîneur: ChecklistRole.ENTRAINEUR,
    entraineur: ChecklistRole.ENTRAINEUR,
    [ChecklistRole.KINE.toLowerCase()]: ChecklistRole.KINE,
    kinésithérapeute: ChecklistRole.KINE,
    kine: ChecklistRole.KINE,
    [ChecklistRole.MEDECIN.toLowerCase()]: ChecklistRole.MEDECIN,
    médecin: ChecklistRole.MEDECIN,
    medecin: ChecklistRole.MEDECIN,
    'responsable performance': ChecklistRole.ENTRAINEUR,
    'préparateur physique': ChecklistRole.ENTRAINEUR,
    'preparateur physique': ChecklistRole.ENTRAINEUR,
  };
  return map[normalized] ?? null;
}

export function mapStaffRoleKeyToChecklistRole(
  roleKey: string | null | undefined
): ChecklistRole | null {
  if (!roleKey) return null;
  const map: Record<string, ChecklistRole> = {
    DS: ChecklistRole.DS,
    ASSISTANT: ChecklistRole.ASSISTANT,
    MECANO: ChecklistRole.MECANO,
    MANAGER: ChecklistRole.MANAGER,
    COMMUNICATION: ChecklistRole.COMMUNICATION,
    ENTRAINEUR: ChecklistRole.ENTRAINEUR,
    KINE: ChecklistRole.KINE,
    MEDECIN: ChecklistRole.MEDECIN,
    RESP_PERF: ChecklistRole.ENTRAINEUR,
    PREPA_PHYSIQUE: ChecklistRole.ENTRAINEUR,
  };
  return map[roleKey] ?? null;
}
