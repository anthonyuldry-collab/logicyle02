import {
  ContractType,
  RaceEvent,
  Rider,
  StaffEventSelection,
  StaffEventStatus,
  StaffMember,
  StaffStatus,
  SubscriptionPlanId,
  TeamLevel,
  TeamSubscription,
} from '../types';
import { isPlanAtLeast } from '../constants/subscriptionPlans';
import { getActiveRidersForCurrentSeason, getActiveStaffForCurrentSeason } from './rosterArchiveUtils';

export type ContractPersonType = 'rider' | 'staff';

export interface PayrollContext {
  raceEvents?: RaceEvent[];
  staffEventSelections?: StaffEventSelection[];
}

export interface ContractSummary {
  id: string;
  type: ContractPersonType;
  name: string;
  role?: string;
  staffStatus?: string;
  contractType?: ContractType | string;
  contractStartDate?: string;
  contractEndDate?: string;
  monthlySalary: number;
  dailyRate?: number;
  isEstimatedCost?: boolean;
  signingBonus: number;
  annualCost: number;
  durationMonths: number | null;
  daysRemaining: number | null;
  isExpiringSoon: boolean;
  contractClauses?: string;
  performanceBonusNotes?: string;
}

export interface PayrollSummary {
  monthlyRiderMass: number;
  monthlyStaffSalariedMass: number;
  monthlyStaffVacataireMass: number;
  monthlyStaffMass: number;
  monthlyTotal: number;
  annualForecast: number;
  signingBonusesTotal: number;
  activeRiderCount: number;
  activeStaffSalariedCount: number;
  activeStaffVacataireCount: number;
  expiringWithin90Days: number;
}

export interface MonthlyPayrollForecast {
  monthKey: string;
  label: string;
  riderCost: number;
  staffSalariedCost: number;
  staffVacataireCost: number;
  staffCost: number;
  total: number;
}

const MS_PER_DAY = 86400000;
/** @deprecated Fallback retiré — vacataire = 0 € si aucun événement planifié sur le mois */
const VACATAIRE_FALLBACK_DAYS_PER_MONTH = 0;

const CONFIRMED_STAFF_STATUSES = new Set<string>([
  StaffEventStatus.SELECTIONNE,
  StaffEventStatus.PRE_SELECTION,
  StaffEventStatus.EN_ATTENTE,
]);

export function hasProPayrollAccess(planId: SubscriptionPlanId): boolean {
  return isPlanAtLeast(planId, SubscriptionPlanId.PRO);
}

/** Export SEPA pain.001 / pain.008 — disponible dès Compétition (module Finances). */
export function hasSepaExportAccess(planId: SubscriptionPlanId): boolean {
  return isPlanAtLeast(planId, SubscriptionPlanId.COMPETITION);
}

/** Export comptable FEC / CSV — dès Continental (peer review & compta). */
export function hasAccountingExportAccess(planId: SubscriptionPlanId): boolean {
  return isPlanAtLeast(planId, SubscriptionPlanId.CONTINENTAL);
}

/** Bulletins engagement UCI PDF (J-20 / J-3) — plan Pro, ou Compétition+ pour équipes N1/Pro. */
export function hasUciPdfAccess(planId: SubscriptionPlanId, teamLevel?: TeamLevel): boolean {
  if (
    teamLevel === TeamLevel.N1_N3 ||
    teamLevel === TeamLevel.PRO ||
    teamLevel === TeamLevel.FEDERATION
  ) {
    return isPlanAtLeast(planId, SubscriptionPlanId.COMPETITION);
  }
  return isPlanAtLeast(planId, SubscriptionPlanId.PRO);
}

export function resolveTeamPlanId(
  subscription: TeamSubscription | undefined,
  fallbackPlan: SubscriptionPlanId
): SubscriptionPlanId {
  return subscription?.planId ?? fallbackPlan;
}

export function parseContractDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value + (value.length === 10 ? 'T12:00:00' : ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getContractDurationMonths(start?: string, end?: string): number | null {
  const startDate = parseContractDate(start);
  const endDate = parseContractDate(end);
  if (!startDate || !endDate || endDate <= startDate) return null;
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    (endDate.getDate() >= startDate.getDate() ? 1 : 0);
  return Math.max(1, months);
}

export function getDaysUntilContractEnd(endDate?: string): number | null {
  const end = parseContractDate(endDate);
  if (!end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / MS_PER_DAY);
}

export function getAnnualSalaryCost(monthlySalary: number, signingBonus = 0): number {
  return monthlySalary * 12 + signingBonus;
}

export function getEventDurationDays(event: RaceEvent): number {
  const start = parseContractDate(event.date);
  const end = parseContractDate(event.endDate || event.date);
  if (!start || !end) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
}

function normalizeStaffStatus(status?: string): string {
  return (status || '').toLowerCase();
}

export function isSalariedStaff(member: StaffMember): boolean {
  const s = normalizeStaffStatus(String(member.status));
  return s.includes('salari');
}

export function isVacataireStaff(member: StaffMember): boolean {
  const s = normalizeStaffStatus(String(member.status));
  return s.includes('vacataire');
}

export type StaffSelectionIndex = Map<string, StaffEventSelection>;

export function buildStaffSelectionIndex(
  staffEventSelections: StaffEventSelection[] = []
): StaffSelectionIndex {
  const index: StaffSelectionIndex = new Map();
  for (let i = 0; i < staffEventSelections.length; i++) {
    const s = staffEventSelections[i];
    index.set(`${s.staffId}:${s.eventId}`, s);
  }
  return index;
}

export function isStaffAssignedToEvent(
  staffId: string,
  event: RaceEvent,
  staffEventSelections: StaffEventSelection[] = [],
  selectionIndex?: StaffSelectionIndex
): boolean {
  if (event.selectedStaffIds?.includes(staffId)) return true;

  const selection =
    selectionIndex?.get(`${staffId}:${event.id}`) ??
    staffEventSelections.find((s) => s.staffId === staffId && s.eventId === event.id);
  if (!selection) return false;

  if (!selection.status) return true;
  return CONFIRMED_STAFF_STATUSES.has(String(selection.status));
}

export function calculateVacataireCostForMonth(
  member: StaffMember,
  monthDate: Date,
  context: PayrollContext = {},
  selectionIndex?: StaffSelectionIndex
): number {
  if (!member.dailyRate || member.dailyRate <= 0) return 0;

  const { raceEvents = [], staffEventSelections = [] } = context;
  const index = selectionIndex ?? buildStaffSelectionIndex(staffEventSelections);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  let totalDays = 0;

  for (const event of raceEvents) {
    if (!isStaffAssignedToEvent(member.id, event, staffEventSelections, index)) continue;

    const eventStart = parseContractDate(event.date);
    const eventEnd = parseContractDate(event.endDate || event.date);
    if (!eventStart || !eventEnd) continue;

    if (eventEnd < monthStart || eventStart > monthEnd) continue;

    totalDays += getEventDurationDays(event);
  }

  if (totalDays === 0) {
    return 0;
  }

  return member.dailyRate * totalDays;
}

export function estimateVacataireMonthlyAverage(
  member: StaffMember,
  context: PayrollContext = {},
  monthsAhead = 12
): number {
  const today = new Date();
  today.setDate(1);
  today.setHours(0, 0, 0, 0);

  let total = 0;
  for (let i = 0; i < monthsAhead; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    total += calculateVacataireCostForMonth(member, monthDate, context);
  }
  return total / monthsAhead;
}

function isActiveInMonth(
  contractStartDate: string | undefined,
  contractEndDate: string | undefined,
  monthDate: Date
): boolean {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const start = parseContractDate(contractStartDate);
  const end = parseContractDate(contractEndDate);
  return (!start || start <= monthEnd) && (!end || end >= monthStart);
}

export function buildRiderContractSummary(rider: Rider): ContractSummary {
  const monthlySalary = rider.salary ?? 0;
  const signingBonus = rider.signingBonus ?? 0;
  const daysRemaining = getDaysUntilContractEnd(rider.contractEndDate);

  return {
    id: rider.id,
    type: 'rider',
    name: `${rider.firstName} ${rider.lastName}`.trim(),
    role: rider.rosterRole === 'reserve' ? 'Réserve' : 'Titulaire',
    contractType: rider.contractType,
    contractStartDate: rider.contractStartDate,
    contractEndDate: rider.contractEndDate,
    monthlySalary,
    signingBonus,
    annualCost: getAnnualSalaryCost(monthlySalary, signingBonus),
    durationMonths: getContractDurationMonths(rider.contractStartDate, rider.contractEndDate),
    daysRemaining,
    isExpiringSoon: daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 90,
    contractClauses: rider.contractClauses,
    performanceBonusNotes: rider.performanceBonusNotes,
  };
}

export function buildStaffContractSummary(
  member: StaffMember,
  context: PayrollContext = {}
): ContractSummary | null {
  const salaried = isSalariedStaff(member);
  const vacataire = isVacataireStaff(member);

  if (salaried && (member.salary ?? 0) > 0) {
    const monthlySalary = member.salary ?? 0;
    const daysRemaining = getDaysUntilContractEnd(member.contractEndDate);

    return {
      id: member.id,
      type: 'staff',
      name: `${member.firstName} ${member.lastName}`.trim(),
      role: String(member.role),
      staffStatus: String(member.status),
      contractType: member.contractType,
      contractEndDate: member.contractEndDate,
      monthlySalary,
      signingBonus: 0,
      annualCost: getAnnualSalaryCost(monthlySalary),
      durationMonths: getContractDurationMonths(undefined, member.contractEndDate),
      daysRemaining,
      isExpiringSoon: daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 90,
    };
  }

  if (vacataire && (member.dailyRate ?? 0) > 0) {
    const today = new Date();
    today.setDate(1);
    today.setHours(0, 0, 0, 0);
    const monthCost = calculateVacataireCostForMonth(member, today, context);
    const monthlySalary =
      monthCost > 0 ? monthCost : estimateVacataireMonthlyAverage(member, context, 6);
    const hasScheduledEvents = monthCost > 0;
    const daysRemaining = getDaysUntilContractEnd(member.contractEndDate);

    return {
      id: member.id,
      type: 'staff',
      name: `${member.firstName} ${member.lastName}`.trim(),
      role: String(member.role),
      staffStatus: String(member.status),
      contractType: member.contractType,
      contractEndDate: member.contractEndDate,
      monthlySalary,
      dailyRate: member.dailyRate,
      isEstimatedCost: !hasScheduledEvents || monthCost === 0,
      signingBonus: 0,
      annualCost: monthlySalary * 12,
      durationMonths: null,
      daysRemaining,
      isExpiringSoon: daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 90,
    };
  }

  if (member.contractEndDate || member.contractType) {
    const daysRemaining = getDaysUntilContractEnd(member.contractEndDate);
    return {
      id: member.id,
      type: 'staff',
      name: `${member.firstName} ${member.lastName}`.trim(),
      role: String(member.role),
      staffStatus: String(member.status),
      contractType: member.contractType,
      contractEndDate: member.contractEndDate,
      monthlySalary: 0,
      signingBonus: 0,
      annualCost: 0,
      durationMonths: null,
      daysRemaining,
      isExpiringSoon: daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 90,
    };
  }

  return null;
}

export function buildTeamContractSummaries(
  riders: Rider[],
  staff: StaffMember[],
  context: PayrollContext = {}
): ContractSummary[] {
  const riderSummaries = getActiveRidersForCurrentSeason(riders)
    .filter((r) => r.salary || r.contractEndDate || r.contractStartDate || r.contractType)
    .map(buildRiderContractSummary);

  const staffSummaries = getActiveStaffForCurrentSeason(staff)
    .map((member) => buildStaffContractSummary(member, context))
    .filter((s): s is ContractSummary => s !== null);

  return [...riderSummaries, ...staffSummaries].sort((a, b) => {
    if (a.isExpiringSoon !== b.isExpiringSoon) return a.isExpiringSoon ? -1 : 1;
    if (a.daysRemaining !== null && b.daysRemaining !== null) return a.daysRemaining - b.daysRemaining;
    return (a.name || '').localeCompare(b.name || '', 'fr');
  });
}

export function calculatePayrollSummary(
  riders: Rider[],
  staff: StaffMember[],
  context: PayrollContext = {}
): PayrollSummary {
  const forecast = buildMonthlyPayrollForecast(riders, staff, 12, 'fr-FR', context);
  const contracts = buildTeamContractSummaries(riders, staff, context);

  const riderContracts = contracts.filter((c) => c.type === 'rider');
  const staffContracts = contracts.filter((c) => c.type === 'staff');
  const isVacataireContract = (c: ContractSummary) =>
    String(c.staffStatus ?? '').toLowerCase().includes('vacataire');
  const staffSalariedContracts = staffContracts.filter(
    (c) => !isVacataireContract(c) && c.monthlySalary > 0
  );
  const staffVacataireContracts = staffContracts.filter(
    (c) => isVacataireContract(c) && (c.dailyRate ?? 0) > 0
  );

  const monthlyRiderMass =
    forecast.length > 0
      ? forecast.reduce((sum, row) => sum + row.riderCost, 0) / forecast.length
      : riderContracts.reduce((sum, c) => sum + c.monthlySalary, 0);

  const monthlyStaffSalariedMass =
    forecast.length > 0
      ? forecast.reduce((sum, row) => sum + row.staffSalariedCost, 0) / forecast.length
      : staffSalariedContracts.reduce((sum, c) => sum + c.monthlySalary, 0);

  const monthlyStaffVacataireMass =
    forecast.length > 0
      ? forecast.reduce((sum, row) => sum + row.staffVacataireCost, 0) / forecast.length
      : staffVacataireContracts.reduce((sum, c) => sum + c.monthlySalary, 0);

  const monthlyStaffMass = monthlyStaffSalariedMass + monthlyStaffVacataireMass;
  const signingBonusesTotal = riderContracts.reduce((sum, c) => sum + c.signingBonus, 0);
  const annualForecast =
    forecast.reduce((sum, row) => sum + row.total, 0) ||
    (monthlyRiderMass + monthlyStaffMass) * 12 + signingBonusesTotal;

  return {
    monthlyRiderMass,
    monthlyStaffSalariedMass,
    monthlyStaffVacataireMass,
    monthlyStaffMass,
    monthlyTotal: monthlyRiderMass + monthlyStaffMass,
    annualForecast,
    signingBonusesTotal,
    activeRiderCount: riderContracts.length,
    activeStaffSalariedCount: staffSalariedContracts.length,
    activeStaffVacataireCount: staffVacataireContracts.length,
    expiringWithin90Days: contracts.filter((c) => c.isExpiringSoon).length,
  };
}

export function buildMonthlyPayrollForecast(
  riders: Rider[],
  staff: StaffMember[],
  monthsAhead = 12,
  locale = 'fr-FR',
  context: PayrollContext = {}
): MonthlyPayrollForecast[] {
  const activeRiders = getActiveRidersForCurrentSeason(riders).filter(
    (r) => (r.salary ?? 0) > 0 || r.contractEndDate || r.contractStartDate
  );
  const activeStaff = getActiveStaffForCurrentSeason(staff);
  const selectionIndex = buildStaffSelectionIndex(context.staffEventSelections);

  const today = new Date();
  today.setDate(1);
  today.setHours(0, 0, 0, 0);

  const forecast: MonthlyPayrollForecast[] = [];

  for (let i = 0; i < monthsAhead; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    const label = monthDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' });

    let riderCost = 0;
    let staffSalariedCost = 0;
    let staffVacataireCost = 0;
    let signingBonusCost = 0;

    for (const rider of activeRiders) {
      if (!isActiveInMonth(rider.contractStartDate, rider.contractEndDate, monthDate)) continue;
      riderCost += rider.salary ?? 0;
      if (i === 0 && (rider.signingBonus ?? 0) > 0) {
        signingBonusCost += rider.signingBonus ?? 0;
      }
    }

    for (const member of activeStaff) {
      if (isSalariedStaff(member) && (member.salary ?? 0) > 0) {
        if (!isActiveInMonth(undefined, member.contractEndDate, monthDate)) continue;
        staffSalariedCost += member.salary ?? 0;
        continue;
      }

      if (isVacataireStaff(member) && (member.dailyRate ?? 0) > 0) {
        if (member.contractEndDate && !isActiveInMonth(undefined, member.contractEndDate, monthDate)) {
          continue;
        }
        staffVacataireCost += calculateVacataireCostForMonth(
          member,
          monthDate,
          context,
          selectionIndex
        );
      }
    }

    const staffCost = staffSalariedCost + staffVacataireCost;

    forecast.push({
      monthKey,
      label,
      riderCost: riderCost + (i === 0 ? signingBonusCost : 0),
      staffSalariedCost,
      staffVacataireCost,
      staffCost,
      total: riderCost + staffCost + (i === 0 ? signingBonusCost : 0),
    });
  }

  return forecast;
}

/**
 * Résumé paie léger pour l'overview — sans forecast 12 mois (chemin critique UI).
 */
export function calculatePayrollSummaryLite(
  riders: Rider[],
  staff: StaffMember[],
  context: PayrollContext = {}
): PayrollSummary {
  const contracts = buildTeamContractSummaries(riders, staff, context);
  const riderContracts = contracts.filter((c) => c.type === 'rider');
  const staffContracts = contracts.filter((c) => c.type === 'staff');
  const isVacataireContract = (c: ContractSummary) =>
    String(c.staffStatus ?? '').toLowerCase().includes('vacataire');
  const staffSalariedContracts = staffContracts.filter(
    (c) => !isVacataireContract(c) && c.monthlySalary > 0
  );
  const staffVacataireContracts = staffContracts.filter(
    (c) => isVacataireContract(c) && (c.dailyRate ?? 0) > 0
  );

  const monthlyRiderMass = riderContracts.reduce((sum, c) => sum + c.monthlySalary, 0);
  const monthlyStaffSalariedMass = staffSalariedContracts.reduce((sum, c) => sum + c.monthlySalary, 0);
  const monthlyStaffVacataireMass = staffVacataireContracts.reduce((sum, c) => sum + c.monthlySalary, 0);
  const monthlyStaffMass = monthlyStaffSalariedMass + monthlyStaffVacataireMass;
  const signingBonusesTotal = riderContracts.reduce((sum, c) => sum + c.signingBonus, 0);

  return {
    monthlyRiderMass,
    monthlyStaffSalariedMass,
    monthlyStaffVacataireMass,
    monthlyStaffMass,
    monthlyTotal: monthlyRiderMass + monthlyStaffMass,
    annualForecast: (monthlyRiderMass + monthlyStaffMass) * 12 + signingBonusesTotal,
    signingBonusesTotal,
    activeRiderCount: riderContracts.length,
    activeStaffSalariedCount: staffSalariedContracts.length,
    activeStaffVacataireCount: staffVacataireContracts.length,
    expiringWithin90Days: contracts.filter((c) => c.isExpiringSoon).length,
  };
}

export function formatContractDuration(months: number | null, locale = 'fr'): string {
  if (months === null) return locale === 'en' ? 'Undefined' : 'Non définie';
  if (months < 12) return locale === 'en' ? `${months} month(s)` : `${months} mois`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (locale === 'en') {
    return rest > 0 ? `${years} yr ${rest} mo` : `${years} yr`;
  }
  return rest > 0 ? `${years} an${years > 1 ? 's' : ''} ${rest} mois` : `${years} an${years > 1 ? 's' : ''}`;
}
