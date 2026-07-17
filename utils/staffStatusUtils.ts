import { StaffStatus } from '../types';
import { STAFF_STATUS_COLORS } from '../constants';

export type StaffStatusKey = 'BENEVOLE' | 'VACATAIRE' | 'SALARIE';

export const STAFF_STATUS_KEYS: StaffStatusKey[] = ['BENEVOLE', 'VACATAIRE', 'SALARIE'];

/** Ordre d'affichage / tri : salariés, vacataires, bénévoles */
export const STAFF_STATUS_SORT_ORDER: Record<StaffStatusKey, number> = {
  SALARIE: 0,
  VACATAIRE: 1,
  BENEVOLE: 2,
};

const STATUS_KEY_ALIASES: Record<string, StaffStatusKey> = {
  BENEVOLE: 'BENEVOLE',
  VACATAIRE: 'VACATAIRE',
  SALARIE: 'SALARIE',
  [StaffStatus.BENEVOLE]: 'BENEVOLE',
  [StaffStatus.VACATAIRE]: 'VACATAIRE',
  [StaffStatus.SALARIE]: 'SALARIE',
};

export const normalizeStaffStatusKey = (status: string | null | undefined): StaffStatusKey | null => {
  if (!status) return null;
  const direct = STATUS_KEY_ALIASES[status];
  if (direct) return direct;
  const upper = status.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (upper.includes('SALAR')) return 'SALARIE';
  if (upper.includes('VACAT')) return 'VACATAIRE';
  if (upper.includes('BENEV')) return 'BENEVOLE';
  return null;
};

export const getStaffStatusLabel = (status: string | null | undefined): string => {
  const key = normalizeStaffStatusKey(status);
  if (key === 'BENEVOLE') return 'Bénévole';
  if (key === 'VACATAIRE') return 'Vacataire';
  if (key === 'SALARIE') return 'Salarié(e)';
  return 'Non défini';
};

export const getStaffStatusBadgeClass = (status: string | null | undefined): string => {
  const key = normalizeStaffStatusKey(status);
  if (key === 'BENEVOLE') return STAFF_STATUS_COLORS[StaffStatus.BENEVOLE];
  if (key === 'VACATAIRE') return STAFF_STATUS_COLORS[StaffStatus.VACATAIRE];
  if (key === 'SALARIE') return STAFF_STATUS_COLORS[StaffStatus.SALARIE];
  return 'bg-gray-100 text-gray-600';
};

export const compareStaffByStatus = (
  a: string | null | undefined,
  b: string | null | undefined,
  direction: 'asc' | 'desc' = 'asc'
): number => {
  const keyA = normalizeStaffStatusKey(a);
  const keyB = normalizeStaffStatusKey(b);
  const orderA = keyA ? STAFF_STATUS_SORT_ORDER[keyA] : 99;
  const orderB = keyB ? STAFF_STATUS_SORT_ORDER[keyB] : 99;
  const diff = orderA - orderB;
  return direction === 'asc' ? diff : -diff;
};

export const staffMatchesEmploymentStatus = (
  memberStatus: string | null | undefined,
  filter: '' | 'all' | StaffStatusKey
): boolean => {
  if (!filter || filter === 'all') return true;
  return normalizeStaffStatusKey(memberStatus) === filter;
};
