import { describe, expect, it } from 'vitest';
import {
  computeMissionCommissionEur,
  estimateMissionGmvEur,
  eurToCents,
  isMissionConnectPaymentEligible,
  isProMissionCommissionPlan,
  missionDayCount,
} from '../../constants/missionMarketplace';

describe('missionDayCount', () => {
  it('compte les jours inclusifs', () => {
    expect(missionDayCount('2026-06-01', '2026-06-05')).toBe(5);
  });

  it('retourne 1 si dates invalides', () => {
    expect(missionDayCount('', '')).toBe(1);
    expect(missionDayCount('2026-06-05', '2026-06-01')).toBe(1);
  });
});

describe('estimateMissionGmvEur', () => {
  it('utilise dailyRate × jours', () => {
    expect(
      estimateMissionGmvEur({
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        dailyRate: 150,
      }),
    ).toBe(750);
  });

  it('parse un montant fixe dans compensation', () => {
    expect(
      estimateMissionGmvEur({
        startDate: '2026-06-01',
        endDate: '2026-06-01',
        compensation: '825 € forfait',
      }),
    ).toBe(825);
  });

  it('multiplie si compensation journalière textuelle', () => {
    expect(
      estimateMissionGmvEur({
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        compensation: '150 € / jour',
      }),
    ).toBe(450);
  });
});

describe('computeMissionCommissionEur', () => {
  it('applique 12 % avec min 15 €', () => {
    expect(computeMissionCommissionEur(825)).toBe(99);
    expect(computeMissionCommissionEur(50)).toBe(15);
  });

  it('applique 10 % pour plan Pro / Performance', () => {
    expect(computeMissionCommissionEur(825, { isProTeam: true })).toBe(82.5);
    expect(isProMissionCommissionPlan('pro')).toBe(true);
    expect(isProMissionCommissionPlan('performance')).toBe(true);
    expect(isProMissionCommissionPlan('continental')).toBe(false);
  });

  it('plafonne à 450 €', () => {
    expect(computeMissionCommissionEur(10_000)).toBe(450);
  });

  it('convertit en centimes', () => {
    expect(eurToCents(99)).toBe(9900);
    expect(eurToCents(82.5)).toBe(8250);
  });
});

describe('isMissionConnectPaymentEligible', () => {
  it('autorise vacataire / montant fixe', () => {
    expect(isMissionConnectPaymentEligible('Vacataire (Facture)')).toBe(true);
    expect(isMissionConnectPaymentEligible('Montant Fixe')).toBe(true);
  });

  it('refuse CDD / CDI / stage', () => {
    expect(isMissionConnectPaymentEligible('CDD')).toBe(false);
    expect(isMissionConnectPaymentEligible('CDI')).toBe(false);
    expect(isMissionConnectPaymentEligible('Stage')).toBe(false);
    expect(isMissionConnectPaymentEligible('Bénévolat')).toBe(false);
  });
});
