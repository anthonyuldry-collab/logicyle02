import {
  PartnerMarketplaceProfile,
  PartnershipMatchRequest,
  TeamSponsorshipNeed,
  User,
} from '../types';
import { DEMO_TEAM_SPONSORSHIP_NEEDS } from '../constants/demoPartnershipMarketplace';

export function buildDefaultPartnerProfile(user: User): PartnerMarketplaceProfile {
  const now = new Date().toISOString();
  return {
    id: `pmp-${user.id}`,
    userId: user.id,
    companyName: `${user.firstName} ${user.lastName}`.trim() || 'Mon entreprise',
    contactName: `${user.firstName} ${user.lastName}`.trim(),
    contactEmail: user.email,
    isVisible: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function getPartnerProfileForUser(
  profiles: PartnerMarketplaceProfile[],
  userId: string,
): PartnerMarketplaceProfile | undefined {
  return profiles.find((p) => p.userId === userId);
}

export function getVisiblePartnerProfiles(
  profiles: PartnerMarketplaceProfile[],
): PartnerMarketplaceProfile[] {
  return profiles.filter((p) => p.isVisible);
}

export function getOpenSponsorshipNeeds(
  needs: TeamSponsorshipNeed[],
  options?: { includeDemo?: boolean },
): TeamSponsorshipNeed[] {
  const open = needs.filter((n) => n.isOpen);
  if (open.length > 0 || options?.includeDemo === false) {
    return open;
  }
  return DEMO_TEAM_SPONSORSHIP_NEEDS;
}

export function getMatchRequestsForPartner(
  requests: PartnershipMatchRequest[],
  partnerUserId: string,
): PartnershipMatchRequest[] {
  return requests.filter((r) => r.partnerUserId === partnerUserId);
}

export function getMatchRequestsForTeam(
  requests: PartnershipMatchRequest[],
  teamId: string,
): PartnershipMatchRequest[] {
  return requests.filter((r) => r.teamId === teamId);
}

export function getSponsorshipNeedsForTeam(
  needs: TeamSponsorshipNeed[],
  teamId: string,
): TeamSponsorshipNeed[] {
  return needs.filter((n) => n.teamId === teamId);
}

export function formatBudgetRange(
  min?: number,
  max?: number,
  language: 'fr' | 'en' = 'fr',
): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${language === 'fr' ? 'À partir de' : 'From'} ${fmt(min)}`;
  if (max != null) return `${language === 'fr' ? 'Jusqu\'à' : 'Up to'} ${fmt(max)}`;
  return language === 'fr' ? 'Budget à définir' : 'Budget TBD';
}

export function hasPendingMatchForNeed(
  requests: PartnershipMatchRequest[],
  partnerUserId: string,
  teamId: string,
  needId?: string,
): boolean {
  return requests.some(
    (r) =>
      r.partnerUserId === partnerUserId
      && r.teamId === teamId
      && (needId ? r.needId === needId : true)
      && (r.status === 'pending' || r.status === 'accepted'),
  );
}
