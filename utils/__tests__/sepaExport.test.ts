import { describe, it, expect } from 'vitest';
import { generateSepaPain001XmlContent } from '../sepaExport';

describe('sepaExport', () => {
  const settings = {
    debtorName: 'Team Test',
    debtorIban: 'FR7630006000011234567890189',
    debtorBic: 'BNPAFRPP',
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
});
