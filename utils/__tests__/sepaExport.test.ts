import { describe, it, expect } from 'vitest';
import { generateSepaPain001XmlContent, generateSepaPain008XmlContent } from '../sepaExport';

describe('sepaExport', () => {
  const settings = {
    debtorName: 'Team Test',
    debtorIban: 'FR7630006000011234567890189',
    debtorBic: 'BNPAFRPP',
    creditorIdentifier: 'FR12ZZZ123456',
  };

  const order = {
    id: 'salary-rider-r1',
    type: 'salary' as const,
    beneficiaryName: 'Jean Dupont',
    beneficiaryIban: 'FR7630006000011234567890189',
    beneficiaryBic: 'AGRIFRPP',
    amount: 5000,
    reference: 'Salaire Jean Dupont',
    sourceId: 'r1',
    sourceLabel: 'Jean Dupont',
    hasValidIban: true,
  };

  const collectionOrder = {
    id: 'coll-i1',
    incomeItemId: 'i1',
    clientName: 'Sponsor SA',
    beneficiaryIban: 'FR7630006000011234567890189',
    beneficiaryBic: 'AGRIFRPP',
    amount: 1200,
    reference: 'FAC-2026-0001',
    hasValidIban: true,
    hasValidBic: true,
    hasValidMandate: true,
    isExportReady: true,
    mandateReference: 'MAND-c1',
    mandateSignedAt: '2026-01-10',
    mandateSequence: 'OOFF' as const,
  };

  it('generateSepaPain001XmlContent includes pain.001.001.09 namespace', () => {
    const xml = generateSepaPain001XmlContent('Team', settings, [order], '2026-03-15');
    expect(xml).toContain('pain.001.001.09');
    expect(xml).toContain('<NbOfTxs>1</NbOfTxs>');
    expect(xml).toContain('<CtrlSum>5000.00</CtrlSum>');
  });

  it('uses beneficiary BIC in CdtrAgt when provided', () => {
    const xml = generateSepaPain001XmlContent('Team', settings, [order])!;
    expect(xml).toContain('<BIC>AGRIFRPP</BIC>');
    expect(xml).not.toContain('BNPAFRPP</BIC></FinInstnId></CdtrAgt>');
  });

  it('omits CdtrAgt when beneficiary BIC is missing', () => {
    const xml = generateSepaPain001XmlContent('Team', settings, [
      { ...order, beneficiaryBic: undefined },
    ])!;
    expect(xml).not.toContain('<CdtrAgt>');
  });

  it('generateSepaPain008XmlContent uses client BIC, mandate date and ICS', () => {
    const xml = generateSepaPain008XmlContent('Team', settings, [collectionOrder], '2026-03-15');
    expect(xml).toContain('pain.008.001.02');
    expect(xml).toContain('<PmtMtd>DD</PmtMtd>');
    expect(xml).toContain('<CtrlSum>1200.00</CtrlSum>');
    expect(xml).toContain('FR12ZZZ123456');
    expect(xml).toContain('MAND-c1');
    expect(xml).toContain('<DtOfSgntr>2026-01-10</DtOfSgntr>');
    expect(xml).toContain('<BIC>AGRIFRPP</BIC>');
    expect(xml).not.toContain('BNPAFRPP</BIC></FinInstnId>\n        </DbtrAgt>');
  });

  it('returns null for pain.008 when ICS missing or order not ready', () => {
    expect(
      generateSepaPain008XmlContent('Team', { ...settings, creditorIdentifier: '' }, [
        collectionOrder,
      ])
    ).toBeNull();
    expect(
      generateSepaPain008XmlContent('Team', settings, [
        { ...collectionOrder, isExportReady: false, hasValidIban: false },
      ])
    ).toBeNull();
  });
});
