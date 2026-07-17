import { describe, expect, it } from 'vitest';
import {
  buildPartantsSocialCopy,
  getActiveSponsorsForMedia,
  getRaceScheduleHighlights,
} from '../communicationMissionUtils';
import { EventType, IncomeCategory, type RaceEvent, type Rider } from '../../types';

const baseEvent = {
  id: 'e1',
  name: 'Perrigord',
  date: '2026-06-01',
  location: 'Périgueux',
  eventType: EventType.COMPETITION,
  eligibleCategory: 'Elite',
  discipline: 'Route',
  raceInfo: {
    presentationTime: '12h30',
    departReelTime: '14h',
    permanenceAddress: 'Stade',
    permanenceTime: '10h',
    reunionDSTime: '11h',
    departFictifTime: '',
    arriveePrevueTime: '17h',
    distanceKm: 120,
    radioFrequency: '446.050',
    isTimeTrial: false,
  },
  operationalLogistics: [],
  selectedRiderIds: [],
  selectedStaffIds: [],
  selectedVehicleIds: [],
  checklistEmailSimulated: false,
} as RaceEvent;

describe('getRaceScheduleHighlights', () => {
  it('extrait les horaires clés de la course', () => {
    const rows = getRaceScheduleHighlights(baseEvent);
    expect(rows.some(r => r.label === 'Présentation coureurs' && r.value === '12h30')).toBe(true);
    expect(rows.some(r => r.label === 'Départ réel' && r.value === '14h')).toBe(true);
  });
});

describe('buildPartantsSocialCopy', () => {
  it('génère un texte partantes', () => {
    const riders = [
      { id: '1', firstName: 'Léa', lastName: 'Mailly' },
    ] as Rider[];
    const text = buildPartantsSocialCopy({ event: baseEvent, riders, teamName: 'Team Test' });
    expect(text).toContain('Perrigord');
    expect(text).toContain('Léa Mailly');
  });
});

describe('getActiveSponsorsForMedia', () => {
  it('filtre les sponsors actifs sans montants', () => {
    const items = getActiveSponsorsForMedia([
      {
        id: 's1',
        description: 'VeloTech',
        amount: 5000,
        date: '2026-01-01',
        category: IncomeCategory.SPONSORING,
        sponsorCompanyName: 'VeloTech Pro',
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].sponsorCompanyName).toBe('VeloTech Pro');
  });
});
