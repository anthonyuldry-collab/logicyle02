import {
  CounterpartDeliverableStatus,
  IncomeCategory,
  PartnerCounterpartDeliverable,
  SponsorshipCounterpartCategory,
} from '../types';
import { generateId } from './themeUtils';

export const COUNTERPART_DELIVERABLE_STATUSES = Object.values(CounterpartDeliverableStatus);

export const COMPLETED_COUNTERPART_DELIVERABLE_STATUSES = new Set<CounterpartDeliverableStatus>([
  CounterpartDeliverableStatus.DELIVERED,
  CounterpartDeliverableStatus.VALIDATED,
]);

export const SPONSORSHIP_COUNTERPART_CATEGORIES: SponsorshipCounterpartCategory[] = [
  'kit',
  'vehicle',
  'digital',
  'hospitality',
  'media',
  'event',
  'reporting',
  'other',
];

export interface CounterpartCatalogItem {
  id: string;
  category: SponsorshipCounterpartCategory;
  labelFr: string;
  labelEn: string;
  quantity?: number;
  unit?: string;
  frequency?: string;
  placement?: string;
  channel?: string;
  notesFr?: string;
  notesEn?: string;
}

/** Catalogue prêt à l'emploi — niveau responsable partenariats / juridique. */
export const SPONSORSHIP_COUNTERPART_CATALOG: CounterpartCatalogItem[] = [
  {
    id: 'kit-chest',
    category: 'kit',
    labelFr: 'Logo Partenaire sur maillot — emplacement poitrine',
    labelEn: 'Partner logo on jersey — chest placement',
    quantity: 1,
    unit: 'emplacement',
    frequency: 'par tenue de course',
    placement: 'Poitrine (zone principale)',
    channel: 'Maillot de compétition',
    notesFr: 'Taille et Pantone définis en Annexe 1 ; validation charte sous 10 j. ouvrés.',
    notesEn: 'Size and Pantone set in Annex 1; brand guideline approval within 10 business days.',
  },
  {
    id: 'kit-sleeve',
    category: 'kit',
    labelFr: 'Logo Partenaire sur manche',
    labelEn: 'Partner logo on sleeve',
    quantity: 1,
    unit: 'emplacement',
    frequency: 'par tenue',
    placement: 'Manche droite ou gauche (selon Annexe 1)',
    channel: 'Maillot',
  },
  {
    id: 'kit-shorts',
    category: 'kit',
    labelFr: 'Logo Partenaire sur cuissard',
    labelEn: 'Partner logo on shorts',
    quantity: 1,
    unit: 'emplacement',
    placement: 'Cuisse',
    channel: 'Cuissard',
  },
  {
    id: 'vehicle-car',
    category: 'vehicle',
    labelFr: 'Marquage véhicules d\'équipe',
    labelEn: 'Team vehicle branding',
    quantity: 2,
    unit: 'véhicules',
    frequency: 'saison',
    placement: 'Portières / hayon',
    channel: 'Véhicules logistiques',
    notesFr: 'Pose et dépose à la charge de l\'Équipe ; kits fournis par le Partenaire.',
  },
  {
    id: 'vehicle-trailer',
    category: 'vehicle',
    labelFr: 'Marquage remorque / atelier mobile',
    labelEn: 'Trailer / mobile workshop branding',
    quantity: 1,
    unit: 'support',
    placement: 'Flanc remorque',
    channel: 'Remorque',
  },
  {
    id: 'digital-site',
    category: 'digital',
    labelFr: 'Logo + lien sur page Partenaires du site',
    labelEn: 'Logo + link on website Partners page',
    quantity: 1,
    unit: 'emplacement',
    frequency: 'durée du contrat',
    channel: 'Site internet',
    placement: 'Page partenaires',
  },
  {
    id: 'digital-social',
    category: 'digital',
    labelFr: 'Publications réseaux sociaux dédiées',
    labelEn: 'Dedicated social media posts',
    quantity: 2,
    unit: 'publications',
    frequency: 'par mois',
    channel: 'Instagram / Facebook / X',
    notesFr: 'Mention @compte Partenaire + story si applicable. Reporting mensuel.',
  },
  {
    id: 'digital-story',
    category: 'digital',
    labelFr: 'Stories / Reels mettant en avant le Partenaire',
    labelEn: 'Stories / Reels featuring the Partner',
    quantity: 1,
    unit: 'contenu',
    frequency: 'par mois',
    channel: 'Instagram / TikTok',
  },
  {
    id: 'hosp-vip',
    category: 'hospitality',
    labelFr: 'Invitations VIP course',
    labelEn: 'VIP race invitations',
    quantity: 4,
    unit: 'invitations',
    frequency: 'par saison',
    channel: 'Hospitality course',
    notesFr: 'Course à choisir d\'un commun accord ; frais d\'hébergement hors pack sauf avenant.',
  },
  {
    id: 'hosp-season',
    category: 'hospitality',
    labelFr: 'Invitation présentation d\'équipe / gala',
    labelEn: 'Team presentation / gala invitation',
    quantity: 2,
    unit: 'places',
    frequency: 'par saison',
    channel: 'Événement institutionnel',
  },
  {
    id: 'media-press',
    category: 'media',
    labelFr: 'Mention « Partenaire officiel » communiqués de presse',
    labelEn: '“Official Partner” mention in press releases',
    quantity: 1,
    unit: 'mention',
    frequency: 'chaque communiqué officiel',
    channel: 'Relations presse',
  },
  {
    id: 'media-accreditation',
    category: 'media',
    labelFr: 'Mention dossier d\'accréditation / media guide',
    labelEn: 'Mention in accreditation / media guide',
    quantity: 1,
    unit: 'dossier',
    frequency: 'par saison',
    channel: 'Media guide',
  },
  {
    id: 'event-activation',
    category: 'event',
    labelFr: 'Activation stand / espace Partenaire sur événement',
    labelEn: 'Partner booth / space activation at event',
    quantity: 1,
    unit: 'activation',
    frequency: 'par saison',
    channel: 'Événement équipe',
    notesFr: 'Surface et matériel définis en Annexe 1 ; validation 15 j. avant l\'événement.',
  },
  {
    id: 'event-photo',
    category: 'event',
    labelFr: 'Séance photo / captation vidéo Partenaire',
    labelEn: 'Partner photo / video shoot',
    quantity: 1,
    unit: 'session',
    frequency: 'par saison',
    channel: 'Production contenu',
  },
  {
    id: 'report-mid',
    category: 'reporting',
    labelFr: 'Rapport semestriel d\'exécution (visibilité)',
    labelEn: 'Semi-annual execution report (visibility)',
    quantity: 2,
    unit: 'rapports',
    frequency: 'par saison',
    channel: 'Reporting',
    notesFr: 'Inclut inventaire des publications, photos, courses couvertes et écarts éventuels.',
  },
  {
    id: 'report-final',
    category: 'reporting',
    labelFr: 'Bilan de fin de contrat / valuation média',
    labelEn: 'End-of-contract report / media valuation',
    quantity: 1,
    unit: 'bilan',
    frequency: 'à l\'échéance',
    channel: 'Reporting',
  },
];

export function normalizeCounterpartDeliverableStatus(
  value: unknown
): CounterpartDeliverableStatus {
  if (
    typeof value === 'string' &&
    COUNTERPART_DELIVERABLE_STATUSES.includes(value as CounterpartDeliverableStatus)
  ) {
    return value as CounterpartDeliverableStatus;
  }
  return CounterpartDeliverableStatus.PLANNED;
}

export function normalizePartnerCounterpartDeliverable(
  item: PartnerCounterpartDeliverable
): PartnerCounterpartDeliverable {
  return {
    ...item,
    status: normalizeCounterpartDeliverableStatus(item.status),
    quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : undefined,
  };
}

export function isCounterpartDeliverableComplete(
  status: CounterpartDeliverableStatus | string
): boolean {
  return COMPLETED_COUNTERPART_DELIVERABLE_STATUSES.has(
    normalizeCounterpartDeliverableStatus(status)
  );
}

export function createDeliverableFromCatalog(
  catalogId: string,
  language: 'fr' | 'en' = 'fr'
): PartnerCounterpartDeliverable | null {
  const item = SPONSORSHIP_COUNTERPART_CATALOG.find((c) => c.id === catalogId);
  if (!item) return null;
  return {
    id: generateId(),
    label: language === 'en' ? item.labelEn : item.labelFr,
    status: CounterpartDeliverableStatus.PLANNED,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    frequency: item.frequency,
    placement: item.placement,
    channel: item.channel,
    notes: language === 'en' ? item.notesEn : item.notesFr,
  };
}

export function createBlankDeliverable(
  language: 'fr' | 'en' = 'fr'
): PartnerCounterpartDeliverable {
  return {
    id: generateId(),
    label: language === 'en' ? 'Custom deliverable' : 'Contrepartie personnalisée',
    status: CounterpartDeliverableStatus.PLANNED,
    category: 'other',
    quantity: 1,
    unit: language === 'en' ? 'unit' : 'unité',
  };
}

/** Phrase contractuelle pour une ligne de contrepartie. */
export function formatDeliverableContractLine(
  item: PartnerCounterpartDeliverable,
  language: 'fr' | 'en' = 'fr'
): string {
  const parts: string[] = [];
  const qty =
    item.quantity && item.quantity > 0
      ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
      : '';
  if (qty) parts.push(qty);
  parts.push(item.label.trim());
  if (item.placement) {
    parts.push(
      language === 'en' ? `(placement: ${item.placement})` : `(emplacement : ${item.placement})`
    );
  }
  if (item.channel) {
    parts.push(language === 'en' ? `— ${item.channel}` : `— ${item.channel}`);
  }
  if (item.frequency) {
    parts.push(language === 'en' ? `[${item.frequency}]` : `[${item.frequency}]`);
  }
  if (item.dueDate) {
    parts.push(language === 'en' ? `due ${item.dueDate}` : `échéance ${item.dueDate}`);
  }
  let line = `— ${parts.filter(Boolean).join(' ')}`;
  if (item.notes?.trim()) {
    line += `\n  ${language === 'en' ? 'Note' : 'Précision'} : ${item.notes.trim()}`;
  }
  return line;
}

export function formatDeliverablesAsContractText(
  items: PartnerCounterpartDeliverable[] | undefined,
  language: 'fr' | 'en' = 'fr'
): string {
  const list = (items || []).map(normalizePartnerCounterpartDeliverable).filter((i) => i.label.trim());
  if (list.length === 0) return '';
  const byCat = new Map<SponsorshipCounterpartCategory | 'other', PartnerCounterpartDeliverable[]>();
  for (const item of list) {
    const cat = item.category || 'other';
    const arr = byCat.get(cat) || [];
    arr.push(item);
    byCat.set(cat, arr);
  }
  const categoryLabels: Record<SponsorshipCounterpartCategory, { fr: string; en: string }> = {
    kit: { fr: 'Tenues & équipements', en: 'Kits & equipment' },
    vehicle: { fr: 'Véhicules & marquage', en: 'Vehicles & branding' },
    digital: { fr: 'Digital & réseaux sociaux', en: 'Digital & social' },
    hospitality: { fr: 'Hospitalité & invitations', en: 'Hospitality & invitations' },
    media: { fr: 'Médias & relations presse', en: 'Media & PR' },
    event: { fr: 'Événements & activations', en: 'Events & activations' },
    reporting: { fr: 'Reporting & bilans', en: 'Reporting' },
    other: { fr: 'Autres contreparties', en: 'Other deliverables' },
  };
  const blocks: string[] = [];
  for (const cat of SPONSORSHIP_COUNTERPART_CATEGORIES) {
    const group = byCat.get(cat);
    if (!group?.length) continue;
    const title = categoryLabels[cat][language];
    blocks.push(`${title} :\n${group.map((i) => formatDeliverableContractLine(i, language)).join('\n')}`);
  }
  return blocks.join('\n\n');
}

export function getCounterpartCategoryLabel(
  category: SponsorshipCounterpartCategory | undefined,
  language: 'fr' | 'en' = 'fr'
): string {
  const labels: Record<SponsorshipCounterpartCategory, { fr: string; en: string }> = {
    kit: { fr: 'Tenue', en: 'Kit' },
    vehicle: { fr: 'Véhicule', en: 'Vehicle' },
    digital: { fr: 'Digital', en: 'Digital' },
    hospitality: { fr: 'Hospitalité', en: 'Hospitality' },
    media: { fr: 'Médias', en: 'Media' },
    event: { fr: 'Événement', en: 'Event' },
    reporting: { fr: 'Reporting', en: 'Reporting' },
    other: { fr: 'Autre', en: 'Other' },
  };
  return labels[category || 'other'][language];
}

/** Packs de démarrage selon la nature du revenu. */
export function suggestDeliverableCatalogIds(category: IncomeCategory): string[] {
  if (category === IncomeCategory.MECENAT) {
    return ['digital-site', 'hosp-season', 'report-final'];
  }
  if (category === IncomeCategory.SUBVENTIONS) {
    return ['report-mid', 'report-final', 'media-press'];
  }
  return ['kit-chest', 'vehicle-car', 'digital-social', 'hosp-vip', 'media-press', 'report-mid'];
}

export function buildSuggestedDeliverables(
  category: IncomeCategory,
  language: 'fr' | 'en' = 'fr'
): PartnerCounterpartDeliverable[] {
  return suggestDeliverableCatalogIds(category)
    .map((id) => createDeliverableFromCatalog(id, language))
    .filter((d): d is PartnerCounterpartDeliverable => Boolean(d));
}
