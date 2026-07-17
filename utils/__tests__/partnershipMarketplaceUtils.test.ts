import { describe, expect, it } from 'vitest';
import {
  computePartnershipCommissionEur,
  formatPartnershipFeeLabel,
  PARTNERSHIP_MARKETPLACE,
} from '../../constants/partnershipMarketplace';
import {
  getOpenSponsorshipNeeds,
  hasPendingMatchForNeed,
} from '../partnershipMarketplaceUtils';

describe('computePartnershipCommissionEur', () => {
  it('applique le taux standard avec minimum', () => {
    expect(computePartnershipCommissionEur(1000)).toBe(PARTNERSHIP_MARKETPLACE.minFeeEur);
    expect(computePartnershipCommissionEur(30000)).toBe(2400);
  });

  it('applique le taux Pro réduit', () => {
    expect(computePartnershipCommissionEur(50000, { isProTeam: true })).toBe(3000);
  });
});

describe('formatPartnershipFeeLabel', () => {
  it('inclut le taux et le minimum', () => {
    const label = formatPartnershipFeeLabel('fr');
    expect(label).toContain('8');
    expect(label).toContain('500');
  });
});

describe('getOpenSponsorshipNeeds', () => {
  it('retourne les annonces démo si aucune annonce réelle', () => {
    const needs = getOpenSponsorshipNeeds([]);
    expect(needs.length).toBeGreaterThan(0);
  });
});

describe('hasPendingMatchForNeed', () => {
  it('détecte une demande en cours', () => {
    expect(
      hasPendingMatchForNeed(
        [
          {
            id: 'r1',
            partnerUserId: 'u1',
            partnerProfileId: 'p1',
            teamId: 't1',
            needId: 'n1',
            status: 'pending',
            platformFeePercent: 8,
            createdAt: '2026-01-01',
          },
        ],
        'u1',
        't1',
        'n1',
      ),
    ).toBe(true);
  });
});
