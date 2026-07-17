import { describe, it, expect } from 'vitest';
import {
  buildRiderContractSummary,
  buildStaffContractSummary,
  calculatePayrollSummary,
  calculateVacataireCostForMonth,
  getContractDurationMonths,
  getDaysUntilContractEnd,
  hasProPayrollAccess,
  hasSepaExportAccess,
  hasAccountingExportAccess,
  hasUciPdfAccess,
  isStaffAssignedToEvent,
} from '../contractUtils';
import { ContractType, RaceEvent, Rider, StaffEventSelection, StaffMember, StaffStatus, SubscriptionPlanId, TeamLevel } from '../../types';

describe('contractUtils', () => {
  const rider = {
    id: 'r1',
    firstName: 'Jean',
    lastName: 'Dupont',
    salary: 5000,
    signingBonus: 10000,
    contractStartDate: '2026-01-01',
    contractEndDate: '2026-12-31',
    contractType: ContractType.CDD,
    contractClauses: 'Clause image',
    isActive: true,
  } as Rider;

  const salariedStaff = {
    id: 's1',
    firstName: 'Marie',
    lastName: 'Martin',
    role: 'Soigneur',
    status: StaffStatus.SALARIE,
    salary: 2800,
    contractType: ContractType.CDI,
    isActive: true,
  } as StaffMember;

  const vacataireStaff = {
    id: 's2',
    firstName: 'Paul',
    lastName: 'Durand',
    role: 'Mécano',
    status: StaffStatus.VACATAIRE,
    dailyRate: 200,
    isActive: true,
  } as StaffMember;

  const raceEvent = (() => {
    const start = new Date();
    start.setDate(10);
    const end = new Date(start);
    end.setDate(12);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return {
      id: 'ev1',
      name: 'Paris-Roubaix',
      date: fmt(start),
      endDate: fmt(end),
      selectedStaffIds: ['s2'],
    } as RaceEvent;
  })();

  it('getContractDurationMonths', () => {
    expect(getContractDurationMonths('2026-01-01', '2026-12-31')).toBeGreaterThan(10);
  });

  it('buildRiderContractSummary calculates annual cost', () => {
    const summary = buildRiderContractSummary(rider);
    expect(summary.monthlySalary).toBe(5000);
    expect(summary.annualCost).toBe(5000 * 12 + 10000);
  });

  it('buildStaffContractSummary for salaried staff', () => {
    const summary = buildStaffContractSummary(salariedStaff);
    expect(summary?.monthlySalary).toBe(2800);
    expect(summary?.isEstimatedCost).toBeFalsy();
  });

  it('buildStaffContractSummary for vacataire with daily rate', () => {
    const summary = buildStaffContractSummary(vacataireStaff, { raceEvents: [raceEvent] });
    expect(summary?.dailyRate).toBe(200);
    expect(summary?.isEstimatedCost).toBe(false);
    expect(summary?.monthlySalary).toBe(200 * 3);
  });

  it('calculateVacataireCostForMonth uses event days when assigned', () => {
    const monthDate = new Date(raceEvent.date + 'T12:00:00');
    monthDate.setDate(1);
    const cost = calculateVacataireCostForMonth(vacataireStaff, monthDate, {
      raceEvents: [raceEvent],
    });
    expect(cost).toBe(200 * 3);
  });

  it('isStaffAssignedToEvent via selectedStaffIds', () => {
    expect(isStaffAssignedToEvent('s2', raceEvent, [])).toBe(true);
  });

  it('isStaffAssignedToEvent via staffEventSelections', () => {
    const selections = [
      { id: '1', eventId: 'ev1', staffId: 's2', status: 'SELECTIONNE' },
    ] as StaffEventSelection[];
    const event = { ...raceEvent, selectedStaffIds: undefined } as RaceEvent;
    expect(isStaffAssignedToEvent('s2', event, selections)).toBe(true);
  });

  it('calculatePayrollSummary includes staff salaried and vacataire', () => {
    const payroll = calculatePayrollSummary([rider], [salariedStaff, vacataireStaff], {
      raceEvents: [raceEvent],
    });
    expect(payroll.monthlyStaffSalariedMass).toBe(2800);
    expect(payroll.monthlyStaffVacataireMass).toBeGreaterThan(0);
    expect(payroll.monthlyStaffMass).toBe(payroll.monthlyStaffSalariedMass + payroll.monthlyStaffVacataireMass);
    expect(payroll.activeStaffVacataireCount).toBe(1);
  });

  it('hasProPayrollAccess for PRO plan', () => {
    expect(hasProPayrollAccess(SubscriptionPlanId.PRO)).toBe(true);
    expect(hasProPayrollAccess(SubscriptionPlanId.COMPETITION)).toBe(false);
  });

  it('hasSepaExportAccess from Competition plan', () => {
    expect(hasSepaExportAccess(SubscriptionPlanId.COMPETITION)).toBe(true);
    expect(hasSepaExportAccess(SubscriptionPlanId.CONTINENTAL)).toBe(true);
    expect(hasSepaExportAccess(SubscriptionPlanId.CLUB)).toBe(false);
  });

  it('hasAccountingExportAccess from Continental plan', () => {
    expect(hasAccountingExportAccess(SubscriptionPlanId.CONTINENTAL)).toBe(true);
    expect(hasAccountingExportAccess(SubscriptionPlanId.COMPETITION)).toBe(false);
    expect(hasUciPdfAccess(SubscriptionPlanId.PRO)).toBe(true);
    expect(hasUciPdfAccess(SubscriptionPlanId.CONTINENTAL)).toBe(false);
    expect(hasUciPdfAccess(SubscriptionPlanId.COMPETITION, TeamLevel.N1_N3)).toBe(true);
    expect(hasUciPdfAccess(SubscriptionPlanId.CLUB, TeamLevel.N1_N3)).toBe(false);
  });

  it('calculateVacataireCostForMonth returns 0 without scheduled events', () => {
    const monthDate = new Date(2026, 0, 1);
    const cost = calculateVacataireCostForMonth(vacataireStaff, monthDate, { raceEvents: [] });
    expect(cost).toBe(0);
  });

  it('getDaysUntilContractEnd returns number for future date', () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 6);
    const iso = future.toISOString().slice(0, 10);
    expect(getDaysUntilContractEnd(iso)).toBeGreaterThan(0);
  });
});
