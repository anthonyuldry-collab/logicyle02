import {
  IncomeCategory,
  IncomeItem,
  SponsorshipContractTerms,
  SponsorshipExclusivityMode,
  SponsorshipImageRightsScope,
  TeamInvoiceSettings,
} from '../types';
import { formatDeliverablesAsContractText } from './counterpartDeliverableUtils';

export type CerfaFormId = '11580-03' | '16216-01';

export interface PartnershipConventionData {
  conventionNumber: string;
  conventionType: 'partenariat' | 'mecenat' | 'subvention';
  issueDate: string;
  team: {
    name: string;
    address?: string;
    siret?: string;
    representative?: string;
    representativeTitle?: string;
    rna?: string;
    object?: string;
  };
  partner: {
    companyName: string;
    siret?: string;
    representative?: string;
    legalForm?: string;
    address?: string;
    contactName?: string;
    email?: string;
    phone?: string;
  };
  partnership: {
    description: string;
    amount: number;
    startDate?: string;
    endDate?: string;
    counterparts?: string;
    paymentTerms?: string;
    notes?: string;
    contractTerms?: SponsorshipContractTerms;
  };
}

export interface CerfaReceiptData {
  formId: CerfaFormId;
  formTitle: string;
  receiptNumber: string;
  issueDate: string;
  beneficiary: {
    name: string;
    address?: string;
    siret?: string;
    rna?: string;
    object?: string;
    isGeneralInterest: boolean;
    decree?: string;
    representative?: string;
    representativeTitle?: string;
  };
  donor: {
    companyName: string;
    siret?: string;
    representative?: string;
    address?: string;
  };
  donation: {
    amount: number;
    date: string;
    form: string;
    purpose: string;
    taxReductionRate: number;
    taxReductionAmount: number;
    legalBasis: string;
  };
}

const CONVENTION_CATEGORIES = new Set<IncomeCategory>([
  IncomeCategory.SPONSORING,
  IncomeCategory.MECENAT,
  IncomeCategory.SUBVENTIONS,
]);

const CERFA_CATEGORIES = new Set<IncomeCategory>([
  IncomeCategory.MECENAT,
  IncomeCategory.DONS,
]);

export function isConventionEligible(category: IncomeCategory): boolean {
  return CONVENTION_CATEGORIES.has(category);
}

export function isCerfaEligible(category: IncomeCategory): boolean {
  return CERFA_CATEGORIES.has(category);
}

export function getCerfaFormId(category: IncomeCategory): CerfaFormId {
  return category === IncomeCategory.MECENAT ? '16216-01' : '11580-03';
}

export function getCerfaFormTitle(category: IncomeCategory, language: 'fr' | 'en'): string {
  if (language === 'en') {
    return category === IncomeCategory.MECENAT
      ? 'Tax receipt for corporate patronage'
      : 'Tax receipt for donations to associations';
  }
  return category === IncomeCategory.MECENAT
    ? 'Reçu fiscal pour mécénat d\'entreprise'
    : 'Reçu au titre des dons et versements ouvrant droit à réduction d\'impôt';
}

export function getConventionType(category: IncomeCategory): PartnershipConventionData['conventionType'] {
  if (category === IncomeCategory.MECENAT) return 'mecenat';
  if (category === IncomeCategory.SUBVENTIONS) return 'subvention';
  return 'partenariat';
}

export function getConventionTitle(category: IncomeCategory, language: 'fr' | 'en'): string {
  const type = getConventionType(category);
  if (language === 'en') {
    return type === 'mecenat'
      ? 'Patronage agreement'
      : type === 'subvention'
        ? 'Grant agreement'
        : 'Partnership agreement';
  }
  return type === 'mecenat'
    ? 'Convention de mécénat'
    : type === 'subvention'
      ? 'Convention de subvention'
      : 'Convention de partenariat';
}

export function getTaxReductionInfo(category: IncomeCategory): {
  rate: number;
  legalBasis: string;
} {
  if (category === IncomeCategory.MECENAT) {
    return {
      rate: 60,
      legalBasis: 'Article 238 bis du code général des impôts (mécénat d\'entreprise)',
    };
  }
  return {
    rate: 66,
    legalBasis: 'Article 200 du code général des impôts (dons aux organismes d\'intérêt général)',
  };
}

export function formatDocumentNumber(
  prefix: string,
  sequence: number,
  year = new Date().getFullYear()
): string {
  return `${prefix.toUpperCase()}-${year}-${String(sequence).padStart(4, '0')}`;
}

export function getDefaultSponsorshipContractTerms(): SponsorshipContractTerms {
  return {
    exclusivityMode: 'none',
    imageRightsScope: 'external_free',
    athleteImageAuthorized: false,
    paymentSchedule: '5050',
    latePaymentDays: 30,
    noticePeriodDays: 15,
    autoRenewal: false,
    renewalNoticeDays: 30,
    governingLaw: 'droit français',
    jurisdiction: 'tribunaux du ressort du siège social de l\'Équipe',
    confidentialityYears: 2,
    validationBusinessDays: 10,
  };
}

export function formatSponsorshipPaymentTerms(
  terms: SponsorshipContractTerms | undefined,
  iban?: string
): string {
  const schedule = terms?.paymentSchedule || '5050';
  let body: string;
  switch (schedule) {
    case 'full_signature':
      body =
        '— 100 % à la signature de la présente convention, sur présentation de la facture correspondante.';
      break;
    case '334':
      body =
        '— 33 % à la signature de la présente convention ;\n— 33 % à mi-période contractuelle ;\n— 34 % au plus tard trente (30) jours avant le terme, sur présentation des factures correspondantes.';
      break;
    case 'custom':
      body =
        terms?.customPaymentTerms?.trim() ||
        '— Modalités de paiement définies d\'un commun accord entre les Parties (voir observations particulières).';
      break;
    case '5050':
    default:
      body =
        '— 50 % à la signature de la présente convention ;\n— 50 % au plus tard à mi-période contractuelle, sur présentation de la facture correspondante.';
  }
  if (iban?.trim()) {
    body += `\nLe règlement s'effectue par virement bancaire sur le compte IBAN : ${iban.trim()}.`;
  }
  return body;
}

export function formatExclusivityClause(
  terms: SponsorshipContractTerms | undefined,
  partnerName: string,
  teamName: string
): string[] {
  const mode: SponsorshipExclusivityMode = terms?.exclusivityMode || 'none';
  const sector = terms?.exclusivitySector?.trim();
  const territory = terms?.exclusivityTerritory?.trim();
  const annex = terms?.annexExclusivityNotes?.trim();

  if (mode === 'none') {
    return [
      `Sauf stipulation contraire en Annexe, le présent partenariat ne confère pas à ${partnerName} d'exclusivité sectorielle. ${teamName} demeure libre de conclure d'autres partenariats, sous réserve de ne pas porter atteinte aux engagements de visibilité du Partenaire.`,
      annex
        ? `Précisions annexes : ${annex}`
        : 'Si une exclusivité sectorielle est ultérieurement convenue, ses termes (secteur, zone géographique, durée) feront l\'objet d\'un avenant écrit.',
    ];
  }

  if (mode === 'sector') {
    return [
      `${teamName} s'engage, pendant la durée de la convention, à ne pas conclure de partenariat concurrent dans le secteur suivant : ${sector || 'secteur à préciser en Annexe 2'}, avec un concurrent direct de ${partnerName}.`,
      territory
        ? `Cette exclusivité s'applique sur le territoire : ${territory}.`
        : 'Cette exclusivité s\'applique sur le territoire français, sauf précision contraire en Annexe 2.',
      annex ? `Modalités complémentaires : ${annex}` : 'Le détail des marques / catégories concurrentes figure en Annexe 2.',
    ];
  }

  if (mode === 'territorial') {
    return [
      `${teamName} confère à ${partnerName} une exclusivité territoriale pour la promotion de ses produits/services sur : ${territory || 'territoire à préciser en Annexe 2'}.`,
      sector
        ? `Cette exclusivité est limitée au secteur : ${sector}.`
        : 'L\'Équipe demeure libre de conclure des partenariats hors de ce territoire.',
      annex ? `Modalités complémentaires : ${annex}` : 'Les Parties précisent en Annexe 2 les exceptions éventuelles (événements internationaux, partenaires institutionnels).',
    ];
  }

  // full
  return [
    `${teamName} confère à ${partnerName} une exclusivité commerciale pleine pour la catégorie d'activité convenue${sector ? ` (${sector})` : ''}, pendant toute la durée de la convention${territory ? `, sur le territoire : ${territory}` : ''}.`,
    'L\'Équipe s\'interdit de conclure, sans accord préalable écrit du Partenaire, tout autre partenariat susceptible de concurrencer directement l\'image ou les produits du Partenaire.',
    annex
      ? `Exceptions et précisions : ${annex}`
      : 'Les exceptions éventuelles (partenaires institutionnels, équipementiers techniques) sont listées en Annexe 2.',
  ];
}

export function formatImageRightsClause(
  terms: SponsorshipContractTerms | undefined,
  partnerName: string,
  teamName: string
): string[] {
  const scope: SponsorshipImageRightsScope = terms?.imageRightsScope || 'external_free';
  const athleteOk = Boolean(terms?.athleteImageAuthorized);

  const base = [
    'Chaque Partie conserve l\'entière propriété de ses signes distinctifs (marques, logos, noms commerciaux). Les Parties s\'accordent mutuellement une licence non exclusive, gratuite et limitée à la durée de la convention, pour l\'utilisation de leurs logos respectifs dans le cadre strict du partenariat.',
  ];

  if (scope === 'internal') {
    base.push(
      `${teamName} autorise ${partnerName} à utiliser des visuels officiels de l'Équipe (photos d'équipe, logo) exclusivement pour sa communication interne (intranet, rapports RSE, supports salariaux). Toute diffusion externe nécessite l'accord préalable écrit de l'Équipe.`
    );
  } else if (scope === 'paid_ads_allowed') {
    base.push(
      `${teamName} autorise ${partnerName} à utiliser des visuels officiels de l'Équipe (photos d'équipe, logo) pour sa communication interne et externe, y compris les campagnes publicitaires payantes liées au partenariat, sous réserve du respect de la charte graphique et d'une information préalable de l'Équipe.`
    );
  } else {
    base.push(
      `${teamName} autorise ${partnerName} à utiliser des visuels officiels de l'Équipe (photos d'équipe, logo) pour sa communication interne et externe liée au partenariat. Toute utilisation à des fins publicitaires payantes nécessite l'accord préalable écrit de l'Équipe.`
    );
  }

  if (athleteOk) {
    base.push(
      `Sous réserve du consentement individuel des personnes concernées et des règles fédérales applicables, ${partnerName} est autorisé à utiliser l'image nominative des athlètes et du staff dans le cadre strict du partenariat, pour la durée de la convention.`
    );
  } else {
    base.push(
      `${partnerName} s'interdit toute utilisation de l'image nominative des coureurs ou du staff en dehors du cadre défini aux présentes, conformément aux dispositions du code civil relatives au droit à l'image.`
    );
  }

  return base;
}

export function buildPartnershipConventionData(
  item: IncomeItem,
  settings: TeamInvoiceSettings,
  teamName: string
): PartnershipConventionData {
  const partnerName =
    item.sponsorCompanyName || item.clientName || item.sponsorshipContactName || 'Partenaire';
  const contractTerms = {
    ...getDefaultSponsorshipContractTerms(),
    ...item.sponsorshipContractTerms,
  };
  const paymentTerms =
    item.sponsorshipContractTerms?.customPaymentTerms?.trim() &&
    item.sponsorshipContractTerms?.paymentSchedule === 'custom'
      ? formatSponsorshipPaymentTerms(contractTerms, settings.issuerIban)
      : formatSponsorshipPaymentTerms(contractTerms, settings.issuerIban);

  return {
    conventionNumber: item.conventionNumber || 'BROUILLON',
    conventionType: getConventionType(item.category),
    issueDate: item.conventionGeneratedAt || new Date().toISOString(),
    team: {
      name: settings.issuerName || teamName,
      address: settings.issuerAddress,
      siret: settings.issuerSiret,
      representative: settings.legalRepresentative,
      representativeTitle: settings.legalRepresentativeTitle,
      rna: settings.rnaNumber,
      object: settings.associationObject,
    },
    partner: {
      companyName: partnerName,
      siret: item.sponsorSiret || item.clientVatNumber,
      representative: item.sponsorRepresentative || item.sponsorshipContactName,
      legalForm: item.sponsorLegalForm,
      address: item.clientAddress,
      contactName: item.sponsorshipContactName,
      email: item.sponsorshipContactEmail,
      phone: item.sponsorshipContactPhone,
    },
    partnership: {
      description: item.description,
      amount: item.amount,
      startDate: item.sponsorshipContractStart,
      endDate: item.sponsorshipContractEnd,
      counterparts:
        formatDeliverablesAsContractText(item.partnershipDeliverables) ||
        item.partnershipCounterparts,
      paymentTerms,
      notes: item.notes,
      contractTerms,
    },
  };
}

export function buildCerfaReceiptData(
  item: IncomeItem,
  settings: TeamInvoiceSettings,
  teamName: string
): CerfaReceiptData {
  const tax = getTaxReductionInfo(item.category);
  const taxReductionAmount = Math.round(item.amount * (tax.rate / 100) * 100) / 100;

  return {
    formId: getCerfaFormId(item.category),
    formTitle: getCerfaFormTitle(item.category, 'fr'),
    receiptNumber: item.cerfaReceiptNumber || 'BROUILLON',
    issueDate: item.cerfaGeneratedAt || new Date().toISOString(),
    beneficiary: {
      name: settings.issuerName || teamName,
      address: settings.issuerAddress,
      siret: settings.issuerSiret,
      rna: settings.rnaNumber,
      object: settings.associationObject,
      isGeneralInterest: settings.isGeneralInterest ?? true,
      decree: settings.prefecturalDecree,
      representative: settings.legalRepresentative,
      representativeTitle: settings.legalRepresentativeTitle,
    },
    donor: {
      companyName:
        item.sponsorCompanyName || item.clientName || item.sponsorshipContactName || 'Donateur',
      siret: item.sponsorSiret || item.clientVatNumber,
      representative: item.sponsorRepresentative || item.sponsorshipContactName,
      address: item.clientAddress,
    },
    donation: {
      amount: item.amount,
      date: item.date,
      form: item.donationForm || 'numéraire',
      purpose: item.description,
      taxReductionRate: tax.rate,
      taxReductionAmount,
      legalBasis: tax.legalBasis,
    },
  };
}

export function issueConvention(
  item: IncomeItem,
  settings: TeamInvoiceSettings
): { item: IncomeItem; settings: TeamInvoiceSettings } {
  const year = item.sponsorshipContractStart
    ? new Date(item.sponsorshipContractStart + 'T12:00:00').getFullYear()
    : new Date().getFullYear();
  const nextNumber = settings.nextConventionNumber ?? 1;
  const prefix = settings.conventionPrefix || 'CONV';
  const conventionNumber = item.conventionNumber || formatDocumentNumber(prefix, nextNumber, year);

  return {
    item: {
      ...item,
      conventionNumber,
      conventionGeneratedAt: new Date().toISOString(),
    },
    settings: {
      ...settings,
      nextConventionNumber: item.conventionNumber ? nextNumber : nextNumber + 1,
    },
  };
}

export function issueCerfaReceipt(
  item: IncomeItem,
  settings: TeamInvoiceSettings
): { item: IncomeItem; settings: TeamInvoiceSettings } {
  const year = new Date(item.date + 'T12:00:00').getFullYear();
  const nextNumber = settings.nextCerfaNumber ?? 1;
  const prefix = settings.cerfaReceiptPrefix || 'RF';
  const cerfaReceiptNumber = item.cerfaReceiptNumber || formatDocumentNumber(prefix, nextNumber, year);

  return {
    item: {
      ...item,
      cerfaReceiptNumber,
      cerfaGeneratedAt: new Date().toISOString(),
    },
    settings: {
      ...settings,
      nextCerfaNumber: item.cerfaReceiptNumber ? nextNumber : nextNumber + 1,
    },
  };
}

export const DEFAULT_COUNTERPARTS: Record<IncomeCategory, string> = {
  [IncomeCategory.SPONSORING]:
    '- Logo Partenaire sur maillots (poitrine ou manche, placement défini en annexe)\n- Logo sur véhicules d\'équipe et remorques\n- Visibilité site internet et réseaux sociaux (min. 2 publications/mois)\n- Invitation VIP à une course sélectionnée par le Partenaire\n- Mention « Partenaire officiel » sur communiqués de presse et dossiers accréditation\n- Présentation d\'équipe en début de saison avec hospitality',
  [IncomeCategory.MECENAT]:
    '- Reconnaissance du mécène sur le site internet (page partenaires / mécènes)\n- Mention dans le rapport d\'activité annuel\n- Invitation à un événement institutionnel (présentation saison)\n- Rapport d\'utilisation des fonds transmis sous six (6) mois\n- Contreparties limitées et proportionnées conformément à l\'article 238 bis du CGI',
  [IncomeCategory.SUBVENTIONS]:
    '- Rapport d\'activité à mi-parcours et en fin de projet\n- État récapitulatif des dépenses avec justificatifs\n- Mention du financeur sur les supports prévus au dossier de demande\n- Transmission des éléments de bilan du projet dans les 30 jours suivant la clôture',
  [IncomeCategory.DONS]:
    '- Reçu fiscal CERFA n° 11580*03 conforme aux articles 200 et 238 bis du CGI\n- Attestation d\'affectation du don à l\'objet associatif',
  [IncomeCategory.ACTIVITES_COMMERCIALES]: '',
  [IncomeCategory.AUTRE]: '',
};

export function suggestPartnershipCounterparts(category: IncomeCategory): string {
  return DEFAULT_COUNTERPARTS[category] || '';
}
