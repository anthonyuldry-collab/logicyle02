import { describe, expect, it } from 'vitest';
import { buildRiderDossierCompletion } from '../riderDossierUtils';
import type { Rider } from '../../types';

const baseRider = {
  id: 'r1',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean@test.fr',
  phone: '0600000000',
  birthDate: '2000-01-01',
  sex: 'M',
  uciId: '123',
  licenseNumber: 'FFC-1',
  emergencyContactName: 'Marie',
  emergencyContactPhone: '0611111111',
  salary: 3000,
  contractEndDate: '2026-12-31',
  bankDetails: { iban: 'FR7630006000011234567890189' },
  qualitativeProfile: {} as Rider['qualitativeProfile'],
  disciplines: [],
  categories: [],
  forme: 'Bonne' as Rider['forme'],
  moral: 'Bon' as Rider['moral'],
  healthCondition: 'Bon' as Rider['healthCondition'],
  favoriteRaces: [],
  resultsHistory: [],
  allergies: [],
  performanceNutrition: {} as Rider['performanceNutrition'],
  roadBikeSetup: {} as Rider['roadBikeSetup'],
  ttBikeSetup: {} as Rider['ttBikeSetup'],
  clothing: [],
  performanceGoals: '',
  physiquePerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
  techniquePerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
  mentalPerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
  environnementPerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
  tactiquePerformanceProject: { forces: '', aOptimiser: '', aDevelopper: '', besoinsActions: '' },
} as unknown as Rider;

describe('buildRiderDossierCompletion', () => {
  it('retourne 100% pour un dossier complet', () => {
    const result = buildRiderDossierCompletion(baseRider);
    expect(result.percent).toBe(100);
    expect(result.done).toBe(result.total);
  });

  it('signale les blocs manquants', () => {
    const result = buildRiderDossierCompletion({
      ...baseRider,
      uciId: undefined,
      bankDetails: undefined,
    });
    expect(result.checks.find((c) => c.key === 'uci')?.ok).toBe(false);
    expect(result.checks.find((c) => c.key === 'bank')?.ok).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });
});
