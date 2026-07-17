import { describe, it, expect } from 'vitest';
import {
  buildCerfaReceiptData,
  buildPartnershipConventionData,
  getCerfaFormId,
  getTaxReductionInfo,
  isCerfaEligible,
  isConventionEligible,
  issueCerfaReceipt,
  issueConvention,
} from '../partnershipDocumentUtils';
import { IncomeCategory } from '../../types';

describe('partnershipDocumentUtils', () => {
  const settings = {
    issuerName: 'Team Cycliste Pro',
    issuerAddress: '1 rue du Vélodrome, 75000 Paris',
    issuerSiret: '12345678900012',
    rnaNumber: 'W123456789',
    associationObject: 'Promotion du cyclisme',
    legalRepresentative: 'Jean Martin',
    legalRepresentativeTitle: 'Président',
    isGeneralInterest: true,
    conventionPrefix: 'CONV',
    nextConventionNumber: 3,
    cerfaReceiptPrefix: 'RF',
    nextCerfaNumber: 7,
  };

  const mecenatItem = {
    id: 'i1',
    description: 'Mécénat entreprise X',
    amount: 10000,
    date: '2026-04-01',
    category: IncomeCategory.MECENAT,
    sponsorCompanyName: 'Entreprise X SAS',
    sponsorSiret: '98765432100011',
    sponsorshipContractStart: '2026-01-01',
    sponsorshipContractEnd: '2026-12-31',
    partnershipCounterparts: 'Logo sur maillot',
  };

  it('detects eligible document types', () => {
    expect(isConventionEligible(IncomeCategory.SPONSORING)).toBe(true);
    expect(isConventionEligible(IncomeCategory.MECENAT)).toBe(true);
    expect(isCerfaEligible(IncomeCategory.MECENAT)).toBe(true);
    expect(isCerfaEligible(IncomeCategory.SPONSORING)).toBe(false);
    expect(getCerfaFormId(IncomeCategory.MECENAT)).toBe('16216-01');
  });

  it('builds convention data', () => {
    const data = buildPartnershipConventionData(mecenatItem, settings, 'Team');
    expect(data.conventionType).toBe('mecenat');
    expect(data.partner.companyName).toBe('Entreprise X SAS');
    expect(data.partnership.amount).toBe(10000);
  });

  it('builds CERFA data with tax reduction', () => {
    const tax = getTaxReductionInfo(IncomeCategory.MECENAT);
    expect(tax.rate).toBe(60);
    const data = buildCerfaReceiptData(mecenatItem, settings, 'Team');
    expect(data.formId).toBe('16216-01');
    expect(data.donation.taxReductionAmount).toBe(6000);
  });

  it('issues convention and cerfa with sequential numbers', () => {
    const { item: conv, settings: afterConv } = issueConvention(mecenatItem, settings);
    expect(conv.conventionNumber).toBe('CONV-2026-0003');
    expect(afterConv.nextConventionNumber).toBe(4);

    const { item: cerfa, settings: afterCerfa } = issueCerfaReceipt(conv, afterConv);
    expect(cerfa.cerfaReceiptNumber).toBe('RF-2026-0007');
    expect(afterCerfa.nextCerfaNumber).toBe(8);
  });
});
