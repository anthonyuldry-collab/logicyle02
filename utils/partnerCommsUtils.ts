import {
  CounterpartDeliverableStatus,
  IncomeCategory,
  IncomeItem,
  PartnerCounterpartDeliverable,
  PartnerGazetteFrequency,
  SponsorshipCounterpartCategory,
} from '../types';

const SPONSOR_CATEGORIES = new Set<IncomeCategory>([
  IncomeCategory.SPONSORING,
  IncomeCategory.MECENAT,
  IncomeCategory.DONS,
]);

/**
 * Vue minimale d’un partenariat pour la com :
 * nom + contreparties média uniquement — pas de montants, contrats, kit, hospitalité.
 */
export type PartnerCommsSponsorOption = Pick<
  IncomeItem,
  'id' | 'sponsorCompanyName' | 'description' | 'category' | 'partnershipDeliverables'
> & { amount: number; date: string };

/** Contreparties opérationnelles média utiles à la com (pas kit / véhicule / hospitality). */
export const COMMS_MEDIA_DELIVERABLE_CATEGORIES: SponsorshipCounterpartCategory[] = [
  'digital',
  'media',
  'event',
  'reporting',
];

const MEDIA_CHANNEL_HINTS =
  /instagram|facebook|tiktok|linkedin|twitter|\bx\b|réseaux|reseaux|story|stories|reel|reels|post|publication|social|youtube|newsletter|gazette|communiqu[ée]|dossier de presse|media guide/i;

export function isCommsMediaDeliverable(d: PartnerCounterpartDeliverable): boolean {
  if (d.category && COMMS_MEDIA_DELIVERABLE_CATEGORIES.includes(d.category)) return true;
  const hay = `${d.label} ${d.channel || ''} ${d.placement || ''} ${d.notes || ''}`;
  return MEDIA_CHANNEL_HINTS.test(hay);
}

export function filterMediaDeliverablesForComms(
  deliverables: PartnerCounterpartDeliverable[] = [],
): PartnerCounterpartDeliverable[] {
  return deliverables.filter(isCommsMediaDeliverable);
}

export function sanitizeSponsorsForComms(incomeItems: IncomeItem[] = []): PartnerCommsSponsorOption[] {
  return incomeItems
    .filter((item) => SPONSOR_CATEGORIES.has(item.category) || Boolean(item.sponsorCompanyName))
    .map((item) => ({
      id: item.id,
      sponsorCompanyName: item.sponsorCompanyName,
      description: item.description,
      category: item.category,
      amount: 0,
      date: item.date || '',
      partnershipDeliverables: filterMediaDeliverablesForComms(item.partnershipDeliverables),
    }))
    .sort((a, b) =>
      (a.sponsorCompanyName || a.description || '').localeCompare(
        b.sponsorCompanyName || b.description || '',
        'fr',
      ),
    );
}

/** Indique si l’utilisateur peut éditer les contenus partenaires (pas les contrats). */
export function canEditPartnerComms(
  effectivePermissions?: Partial<Record<string, string[]>>,
): boolean {
  const portal = effectivePermissions?.partnerPortal;
  return Boolean(portal?.includes('edit'));
}

export interface CommsMediaMission {
  incomeItemId: string;
  sponsorName: string;
  deliverable: PartnerCounterpartDeliverable;
}

export function collectCommsMediaMissions(incomeItems: IncomeItem[] = []): CommsMediaMission[] {
  const missions: CommsMediaMission[] = [];
  for (const item of incomeItems) {
    const media = filterMediaDeliverablesForComms(item.partnershipDeliverables);
    for (const deliverable of media) {
      missions.push({
        incomeItemId: item.id,
        sponsorName: item.sponsorCompanyName || item.description || 'Sponsor',
        deliverable,
      });
    }
  }
  return missions.sort((a, b) => {
    const statusOrder = (s: string) =>
      s === 'planned' ? 0 : s === 'in_progress' ? 1 : s === 'delivered' ? 2 : 3;
    return (
      statusOrder(a.deliverable.status) - statusOrder(b.deliverable.status)
      || a.sponsorName.localeCompare(b.sponsorName, 'fr')
    );
  });
}

export function updateIncomeDeliverableStatus(
  item: IncomeItem,
  deliverableId: string,
  status: CounterpartDeliverableStatus,
): IncomeItem {
  return {
    ...item,
    partnershipDeliverables: (item.partnershipDeliverables || []).map((d) =>
      d.id === deliverableId ? { ...d, status } : d,
    ),
  };
}

export const GAZETTE_FREQUENCIES: PartnerGazetteFrequency[] = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'biannual',
  'seasonal',
  'oneshot',
];

export function getGazetteFrequencyLabel(
  frequency: PartnerGazetteFrequency | undefined,
  language: 'fr' | 'en' = 'fr',
): string {
  const labels: Record<PartnerGazetteFrequency, { fr: string; en: string }> = {
    weekly: { fr: 'Hebdomadaire', en: 'Weekly' },
    biweekly: { fr: 'Bi-mensuelle', en: 'Bi-weekly' },
    monthly: { fr: 'Mensuelle', en: 'Monthly' },
    quarterly: { fr: 'Trimestrielle', en: 'Quarterly' },
    biannual: { fr: 'Semestrielle', en: 'Twice a year' },
    seasonal: { fr: 'Saisonnière', en: 'Seasonal' },
    oneshot: { fr: 'Hors-série', en: 'One-shot' },
  };
  if (!frequency || !labels[frequency]) return labels.monthly[language];
  return labels[frequency][language];
}
