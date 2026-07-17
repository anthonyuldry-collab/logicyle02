import {
  IncomeCategory,
  IncomeItem,
  InvoiceStatus,
  PartnerNewsletter,
  CounterpartDeliverableStatus,
} from '../types';
import { buildNewsletterFromTemplate } from '../utils/partnerNewsletterUtils';

export const DEMO_PARTNER_EMAIL = 'partenaire.demo@logicycle.app';
export const DEMO_PARTNER_INCOME_ID = 'demo_partner_velotech';
export const DEMO_PARTNER_NEWSLETTER_ID = 'demo_partner_newsletter_velotech';

export function isDemoPartnerIncome(id: string): boolean {
  return id === DEMO_PARTNER_INCOME_ID || id.startsWith('demo_partner_');
}

export function isDemoPartnerNewsletter(id: string): boolean {
  return id === DEMO_PARTNER_NEWSLETTER_ID || id.startsWith('demo_partner_newsletter_');
}

export function buildDemoPartnerIncome(params: {
  teamName?: string;
  language?: 'fr' | 'en';
} = {}): IncomeItem {
  const year = new Date().getFullYear();
  const isFr = (params.language ?? 'fr') === 'fr';
  return {
    id: DEMO_PARTNER_INCOME_ID,
    description: isFr
      ? `Partenariat principal — ${params.teamName || 'équipe'}`
      : `Main partnership — ${params.teamName || 'team'}`,
    amount: 45000,
    date: `${year}-01-15`,
    category: IncomeCategory.SPONSORING,
    sponsorCompanyName: 'VeloTech Pro',
    sponsorSiret: '12345678901234',
    sponsorRepresentative: isFr ? 'Marie Dupont' : 'Marie Dupont',
    sponsorshipContactName: isFr ? 'Marie Dupont' : 'Marie Dupont',
    sponsorshipContactEmail: DEMO_PARTNER_EMAIL,
    sponsorshipContactPhone: '+33 6 12 34 56 78',
    sponsorshipContractStart: `${year}-01-01`,
    sponsorshipContractEnd: `${year}-12-31`,
    partnershipCounterparts: isFr
      ? 'Logo sur maillots et véhicules · 2 publications réseaux / mois · Hospitality VIP · Mention communiqués post-course'
      : 'Logo on kits and vehicles · 2 social posts / month · VIP hospitality · Post-race release mentions',
    partnershipDeliverables: [
      {
        id: 'demo_del_logo',
        label: isFr ? 'Logo sur maillots saison' : 'Season kit logo placement',
        dueDate: `${year}-03-01`,
        status: CounterpartDeliverableStatus.DELIVERED,
      },
      {
        id: 'demo_del_social',
        label: isFr ? 'Campagne réseaux Q2' : 'Q2 social campaign',
        dueDate: `${year}-06-15`,
        status: CounterpartDeliverableStatus.IN_PROGRESS,
      },
      {
        id: 'demo_del_vip',
        label: isFr ? 'Hospitality Tour de France' : 'Tour de France hospitality',
        dueDate: `${year}-07-10`,
        status: CounterpartDeliverableStatus.PLANNED,
      },
    ],
    invoiceStatus: InvoiceStatus.ISSUED,
    issuedAt: `${year}-01-20`,
    clientName: 'VeloTech Pro',
    notes: isFr
      ? 'Exemple de partenariat — créé via « Installer l\'exemple partenaire ».'
      : 'Sample partnership — created via « Install partner example ».',
  };
}

export function buildDemoPartnerNewsletter(params: {
  teamId: string;
  teamName: string;
  language?: 'fr' | 'en';
}): PartnerNewsletter {
  const language = params.language ?? 'fr';
  const template = buildNewsletterFromTemplate('sponsor_spotlight', {
    teamName: params.teamName,
    sponsorName: 'VeloTech Pro',
    language,
  });
  const now = new Date().toISOString();
  return {
    id: DEMO_PARTNER_NEWSLETTER_ID,
    teamId: params.teamId,
    incomeItemId: DEMO_PARTNER_INCOME_ID,
    ...template,
    status: 'published',
    createdAt: now,
    publishedAt: now,
  };
}
