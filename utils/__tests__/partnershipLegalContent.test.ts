import { describe, it, expect } from 'vitest';
import {
  buildConventionArticles,
  buildCerfa16216Sections,
  buildCerfa11580Sections,
  buildConventionAnnexes,
  buildConventionPreamble,
} from '../partnershipLegalContent';
import {
  buildCerfaReceiptData,
  buildPartnershipConventionData,
} from '../partnershipDocumentUtils';
import { IncomeCategory } from '../../types';

describe('partnershipLegalContent', () => {
  const settings = {
    issuerName: 'Association Cycliste',
    issuerAddress: '1 rue du Vélodrome',
    issuerSiret: '12345678900012',
    rnaNumber: 'W123456789',
    associationObject: 'Promotion du cyclisme',
    legalRepresentative: 'Marie Dupont',
    legalRepresentativeTitle: 'Présidente',
    isGeneralInterest: true,
    prefecturalDecree: 'Arrêté préfectoral n°2020-45',
  };

  const sponsoringItem = {
    id: 'i1',
    description: 'Partenariat maillot principal',
    amount: 25000,
    date: '2026-01-15',
    category: IncomeCategory.SPONSORING,
    sponsorCompanyName: 'Sponsor SA',
    sponsorshipContractStart: '2026-01-01',
    sponsorshipContractEnd: '2026-12-31',
    partnershipCounterparts: '- Logo maillot',
  };

  const mecenatItem = {
    ...sponsoringItem,
    category: IncomeCategory.MECENAT,
    description: 'Soutien activité jeunes',
  };

  it('génère un préambule juridique complet', () => {
    const data = buildPartnershipConventionData(sponsoringItem, settings, 'Team');
    const preamble = buildConventionPreamble(data, IncomeCategory.SPONSORING, 'fr-FR');
    expect(preamble.length).toBeGreaterThanOrEqual(3);
    expect(preamble.some((p) => p.includes('Considérant'))).toBe(true);
  });

  it('convention sponsoring : 15 articles juridiques', () => {
    const data = buildPartnershipConventionData(sponsoringItem, settings, 'Team');
    const articles = buildConventionArticles(data, IncomeCategory.SPONSORING);
    expect(articles).toHaveLength(15);
    expect(articles.some((a) => a.title.includes('RGPD'))).toBe(true);
    expect(articles.some((a) => a.title.includes('Propriété intellectuelle'))).toBe(true);
  });

  it('convention mécénat : articles fiscaux et reporting', () => {
    const data = buildPartnershipConventionData(mecenatItem, settings, 'Team');
    const articles = buildConventionArticles(data, IncomeCategory.MECENAT);
    expect(articles.length).toBeGreaterThanOrEqual(10);
    expect(articles.some((a) => a.title.includes('intérêt général'))).toBe(true);
    expect(articles.some((a) => a.paragraphs.join(' ').includes('238 bis'))).toBe(true);
  });

  it('CERFA 16216 : sections A à E complètes', () => {
    const cerfa = buildCerfaReceiptData(mecenatItem, settings, 'Team');
    const sections = buildCerfa16216Sections(cerfa);
    expect(sections.length).toBeGreaterThanOrEqual(5);
    expect(sections[0].fields.length).toBeGreaterThanOrEqual(5);
    expect(sections[3].paragraphs?.some((p) => p.includes('60 %'))).toBe(true);
  });

  it('CERFA 11580 : cases à cocher et mentions légales', () => {
    const donItem = { ...sponsoringItem, category: IncomeCategory.DONS };
    const cerfa = buildCerfaReceiptData(donItem, settings, 'Team');
    const sections = buildCerfa11580Sections(cerfa);
    expect(sections.some((s) => s.checkboxes && s.checkboxes.length > 0)).toBe(true);
    expect(sections.some((s) => s.title.includes('Mentions légales'))).toBe(true);
  });

  it('convention subvention : formulation Bénéficiaire correcte', () => {
    const subventionItem = {
      ...sponsoringItem,
      category: IncomeCategory.SUBVENTIONS,
      amount: 20000,
      description: 'Projet jeunesse',
    };
    const data = buildPartnershipConventionData(subventionItem, settings, 'Team');
    const articles = buildConventionArticles(data, IncomeCategory.SUBVENTIONS);
    const allText = articles.map((a) => a.paragraphs.join(' ')).join(' ');
    expect(allText).toContain('accorde au Bénéficiaire');
    expect(allText).not.toMatch(/l'Bénéficiaire|L'Bénéficiaire/);
    expect(allText).not.toMatch(/\d\s\d\s\d/);
  });

  it('annexes sponsoring', () => {
    const data = buildPartnershipConventionData(sponsoringItem, settings, 'Team');
    const annexes = buildConventionAnnexes(data, IncomeCategory.SPONSORING);
    expect(annexes.length).toBeGreaterThanOrEqual(2);
  });
});
