import { describe, expect, it } from 'vitest';
import { TransportDirection, TransportMode, type EventTransportLeg, type StageDayLogistics } from '../../types';
import {
  buildApresStageTransportDefaults,
  isAllerSurCourseLeg,
  isPendantCourseLeg,
  TRANSPORT_PHASE_UI,
  transportDirectionToPhase,
} from '../stageTransportLegUtils';

const stage = (overrides: Partial<StageDayLogistics> = {}): StageDayLogistics =>
  ({
    id: 's1',
    stageNumber: 2,
    date: '2026-08-15',
    departLocation: 'Quimper départ',
    arriveeLocation: 'Brest arrivée',
    arriveePrevueTime: '16:30',
    permanenceAddress: '',
    permanenceTime: '',
    permanenceDate: '2026-08-15',
    reunionDSTime: '',
    presentationTime: '',
    departFictifTime: '',
    departReelTime: '',
    distanceKm: 120,
    radioFrequency: '',
    ...overrides,
  });

describe('buildApresStageTransportDefaults', () => {
  it('préremplit arrivée course → hôtel', () => {
    const defaults = buildApresStageTransportDefaults(stage(), {
      transfer: {
        departLocation: 'Brest arrivée',
        arriveeLocation: 'Hôtel Oceania Brest',
        departTime: '17:00',
        arriveePrevueTime: '17:45',
      },
    });
    expect(defaults.direction).toBe(TransportDirection.RETOUR);
    expect(defaults.logisticsPhase).toBe('retour');
    expect(defaults.departureLocation).toBe('Brest arrivée');
    expect(defaults.arrivalLocation).toBe('Hôtel Oceania Brest');
    expect(defaults.details).toMatch(/hôtel/i);
  });

  it('expose les libellés Avant / Pendant / Après', () => {
    expect(TRANSPORT_PHASE_UI.avant.short).toBe('Avant');
    expect(TRANSPORT_PHASE_UI.pendant.short).toBe('Pendant');
    expect(TRANSPORT_PHASE_UI.apres.short).toBe('Après');
  });

  it('mappe les directions techniques vers les phases UX', () => {
    expect(transportDirectionToPhase(TransportDirection.ALLER)).toBe('avant');
    expect(transportDirectionToPhase(TransportDirection.JOUR_J)).toBe('pendant');
    expect(transportDirectionToPhase(TransportDirection.RETOUR)).toBe('apres');
  });
});

describe('isPendantCourseLeg (Jour J)', () => {
  it('classe un trajet Jour J staff-only dans Jour J, pas Avant', () => {
    const leg: EventTransportLeg = {
      id: 'jj1',
      eventId: 'evt-1',
      mode: TransportMode.VOITURE_EQUIPE,
      direction: TransportDirection.JOUR_J,
      stageDate: '2026-08-15',
      departureDate: '2026-08-15',
      arrivalDate: '2026-08-15',
      departureLocation: 'Parking départ',
      arrivalLocation: 'Parking départ',
      occupants: [{ type: 'staff', id: 's1' }],
    };
    expect(isAllerSurCourseLeg(leg, '2026-08-15', stage())).toBe(false);
    expect(isPendantCourseLeg(leg, '2026-08-15', '2026-08-10', stage())).toBe(true);
  });

  it('classe hôtel → départ staff-only le jour même dans Jour J', () => {
    const leg: EventTransportLeg = {
      id: 'jj2',
      eventId: 'evt-1',
      mode: TransportMode.VOITURE_EQUIPE,
      direction: TransportDirection.JOUR_J,
      stageDate: '2026-08-15',
      departureDate: '2026-08-15',
      arrivalDate: '2026-08-15',
      departureLocation: 'Hôtel Oceania',
      arrivalLocation: 'Quimper départ',
      occupants: [{ type: 'staff', id: 's1' }],
    };
    expect(isAllerSurCourseLeg(leg, '2026-08-15', stage())).toBe(false);
    expect(isPendantCourseLeg(leg, '2026-08-15', '2026-08-10', stage())).toBe(true);
  });

  it('classe un trajet Jour J avec coureurs dans Avant', () => {
    const leg: EventTransportLeg = {
      id: 'av1',
      eventId: 'evt-1',
      mode: TransportMode.VOITURE_EQUIPE,
      direction: TransportDirection.JOUR_J,
      stageDate: '2026-08-15',
      departureDate: '2026-08-15',
      arrivalDate: '2026-08-15',
      departureLocation: 'Hôtel',
      arrivalLocation: 'Quimper départ',
      occupants: [{ type: 'rider', id: 'r1' }],
    };
    expect(isAllerSurCourseLeg(leg, '2026-08-15', stage())).toBe(true);
    expect(isPendantCourseLeg(leg, '2026-08-15', '2026-08-10', stage())).toBe(false);
  });
});
