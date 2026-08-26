import { describe, expect, it } from 'vitest';
import {
  MissionApplicationStatus,
  MissionCompensationType,
  MissionStatus,
  StaffRole,
  type Mission,
  type MissionApplication,
  type MissionPayment,
} from '../../types';
import {
  buildTeamMissionInvoice,
  buildTeamMissionInvoiceNumber,
  buildVacataireDraftInvoiceNumber,
  buildVacataireDraftMissionInvoice,
  resolveMissionPaymentAmounts,
} from '../missionInvoiceUtils';

const mission: Mission = {
  id: 'mission_abc123xyz',
  teamId: 'team1',
  title: 'Assistant Tour de Test',
  role: StaffRole.ASSISTANT,
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  location: 'Lorient',
  description: 'Test',
  requirements: [],
  compensationType: MissionCompensationType.FREELANCE,
  compensation: '150 € / jour',
  dailyRate: 150,
  status: MissionStatus.FILLED,
};

const accepted: MissionApplication = {
  id: 'app1',
  userId: 'user-v',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea@example.com',
  appliedAt: '2026-05-01T10:00:00.000Z',
  status: MissionApplicationStatus.ACCEPTED,
};

const payment: MissionPayment = {
  status: 'paid',
  gmvCents: 75000,
  commissionCents: 9000,
  paidAt: '2026-06-10T12:00:00.000Z',
  paymentIntentId: 'pi_test',
};

describe('resolveMissionPaymentAmounts', () => {
  it('lit les centimes du paiement', () => {
    expect(resolveMissionPaymentAmounts(payment, 0, 0)).toEqual({
      gmvEur: 750,
      commissionEur: 90,
      netEur: 660,
    });
  });
});

describe('invoice numbers', () => {
  it('sont stables pour une mission / date', () => {
    expect(buildTeamMissionInvoiceNumber(mission.id, payment.paidAt)).toBe(
      buildTeamMissionInvoiceNumber(mission.id, payment.paidAt),
    );
    expect(buildVacataireDraftInvoiceNumber(mission.id, payment.paidAt)).toMatch(/^DRAFT-V-/);
  });
});

describe('buildTeamMissionInvoice', () => {
  it('facture Rovik → équipe pour le GMV', () => {
    const inv = buildTeamMissionInvoice({
      mission,
      payment,
      teamName: 'VC Atlantique',
      accepted,
      gmvEur: 750,
      commissionEur: 90,
    });
    expect(inv.kind).toBe('team');
    // Soft-launch : watermark tant que LEGAL_ENTITY incomplet (K-bis).
    expect(inv.isDraftTemplate).toBe(true);
    expect(inv.legalNoteFr).toMatch(/PROVISOIRE|K-bis/i);
    expect(inv.line.amountEur).toBe(750);
    expect(inv.line.commissionEur).toBe(90);
    expect(inv.client.name).toBe('VC Atlantique');
    expect(inv.issuer.name).toBe('Rovik');
  });
});

describe('buildVacataireDraftMissionInvoice', () => {
  it('modèle vacataire → Rovik pour le net', () => {
    const inv = buildVacataireDraftMissionInvoice({
      mission,
      payment,
      teamName: 'VC Atlantique',
      accepted,
      gmvEur: 750,
      commissionEur: 90,
    });
    expect(inv.kind).toBe('vacataire_draft');
    expect(inv.isDraftTemplate).toBe(true);
    expect(inv.line.amountEur).toBe(660);
    expect(inv.client.name).toBe('Rovik');
    expect(inv.issuer.siret).toContain('À COMPLÉTER');
  });

  it('préremplit SIRET depuis le dossier société', () => {
    const inv = buildVacataireDraftMissionInvoice({
      mission,
      payment,
      teamName: 'VC Atlantique',
      accepted,
      gmvEur: 750,
      commissionEur: 90,
      business: {
        legalName: 'Léa Martin Micro',
        siret: '12345678900012',
        addressLine: '1 rue du Velodrome',
        city: 'Lorient',
        postalCode: '56100',
        vatRegime: 'franchise_293b',
      },
    });
    expect(inv.isDraftTemplate).toBe(false);
    expect(inv.issuer.name).toBe('Léa Martin Micro');
    expect(inv.issuer.siret).toBe('12345678900012');
    expect(inv.vatMentionFr).toContain('293 B');
  });
});
