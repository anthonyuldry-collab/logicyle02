/**
 * Tests des correctifs audit ERP lean (P0/P1).
 */
import { describe, expect, it } from 'vitest';
import { buildAccountingEntries, summarizeAccountingEntries } from '../accountingEntryUtils';
import {
  buildClientCollectionOrders,
  clientsToAdvanceMandateAfterCollection,
  normalizeCollectionSequencesForBatch,
  summarizeCollectionOrders,
} from '../sepaCollectionUtils';
import { generateSepaPain008XmlContent } from '../sepaExport';
import { validateSepaCreditorIdentifier } from '../sepaUtils';
import {
  IncomeCategory,
  InvoiceStatus,
  type ClientRecord,
  type IncomeItem,
  type TeamSepaSettings,
} from '../../types';

const sepa: TeamSepaSettings = {
  debtorName: 'Team',
  debtorIban: 'FR7630006000011234567890189',
  debtorBic: 'BNPAFRPP',
  creditorIdentifier: 'FR12ZZZ123456',
};

const client: ClientRecord = {
  id: 'c1',
  companyName: 'Sponsor',
  iban: 'FR7630006000011234567890189',
  bic: 'AGRIFRPP',
  mandateReference: 'UMR-1',
  mandateSignedAt: '2026-01-01',
  mandateSequence: 'FRST',
  createdAt: '2026-01-01',
};

describe('audit ERP lean', () => {
  it('valide ICS FR strict (ZZZ)', () => {
    expect(validateSepaCreditorIdentifier('FR12ZZZ123456')).toBe(true);
    expect(validateSepaCreditorIdentifier('FR12345678')).toBe(false);
    expect(validateSepaCreditorIdentifier('')).toBe(false);
  });

  it('normalise FRST→RCUR dans un même lot (même UMR)', () => {
    const orders = [
      {
        id: 'a',
        incomeItemId: 'i1',
        clientId: 'c1',
        clientName: 'S',
        beneficiaryIban: 'FR7630006000011234567890189',
        beneficiaryBic: 'AGRIFRPP',
        amount: 100,
        reference: 'FAC-1',
        hasValidIban: true,
        hasValidBic: true,
        hasValidMandate: true,
        isExportReady: true,
        mandateReference: 'UMR-1',
        mandateSignedAt: '2026-01-01',
        mandateSequence: 'FRST' as const,
      },
      {
        id: 'b',
        incomeItemId: 'i2',
        clientId: 'c1',
        clientName: 'S',
        beneficiaryIban: 'FR7630006000011234567890189',
        beneficiaryBic: 'AGRIFRPP',
        amount: 200,
        reference: 'FAC-2',
        hasValidIban: true,
        hasValidBic: true,
        hasValidMandate: true,
        isExportReady: true,
        mandateReference: 'UMR-1',
        mandateSignedAt: '2026-01-01',
        mandateSequence: 'FRST' as const,
      },
    ];
    const normalized = normalizeCollectionSequencesForBatch(orders);
    expect(normalized[0].mandateSequence).toBe('FRST');
    expect(normalized[1].mandateSequence).toBe('RCUR');
    const xml = generateSepaPain008XmlContent('T', sepa, normalized)!;
    expect(xml.indexOf('<SeqTp>FRST</SeqTp>')).toBeLessThan(xml.indexOf('<SeqTp>RCUR</SeqTp>'));
  });

  it('avance le mandat client FRST→RCUR après export', () => {
    const advanced = clientsToAdvanceMandateAfterCollection([client], [
      {
        id: 'a',
        incomeItemId: 'i1',
        clientId: 'c1',
        clientName: 'S',
        beneficiaryIban: 'X',
        amount: 1,
        reference: 'R',
        hasValidIban: true,
        hasValidBic: true,
        hasValidMandate: true,
        isExportReady: true,
        mandateSequence: 'FRST',
      },
    ]);
    expect(advanced).toHaveLength(1);
    expect(advanced[0].mandateSequence).toBe('RCUR');
  });

  it('exclut les factures avoirisées du prélèvement', () => {
    const issued: IncomeItem = {
      id: 'orig',
      description: 'Facture',
      amount: 1000,
      date: '2026-08-01',
      category: IncomeCategory.SPONSORING,
      invoiceStatus: InvoiceStatus.ISSUED,
      invoiceNumber: 'FAC-2026-0001',
      clientId: 'c1',
      clientName: 'Sponsor',
    };
    const credit: IncomeItem = {
      id: 'av',
      description: 'Avoir',
      amount: -1000,
      date: '2026-08-02',
      category: IncomeCategory.SPONSORING,
      invoiceStatus: InvoiceStatus.ISSUED,
      invoiceNumber: 'FAC-AV-2026-0001',
      creditNoteForInvoiceId: 'orig',
      clientId: 'c1',
      clientName: 'Sponsor',
    };
    const summary = summarizeCollectionOrders(
      buildClientCollectionOrders([issued, credit], [client])
    );
    expect(summary.readyOrders).toHaveLength(0);
    expect(summary.creditedCount).toBe(1);
  });

  it('évite la double compta collection + PAID', () => {
    const entries = buildAccountingEntries({
      incomeItems: [
        {
          id: 'inc-1',
          description: 'Sponsoring',
          amount: 1200,
          date: '2026-01-15',
          category: IncomeCategory.SPONSORING,
          invoiceStatus: InvoiceStatus.PAID,
          issuedAt: '2026-01-15T10:00:00Z',
          paidAt: '2026-01-20T10:00:00Z',
          amountHT: 1000,
          vatRate: 20,
          sepaCollectionBatchId: 'batch-col-1',
          clientId: 'c1',
          clientName: 'Sponsor',
        },
      ],
      budgetItems: [],
      supplierInvoices: [],
      sepaBatches: [
        {
          id: 'batch-col-1',
          batchReference: 'SEPA-COL-1',
          executionDate: '2026-01-20',
          totalAmount: 1200,
          orderCount: 1,
          exportedAt: '2026-01-20T10:00:00Z',
          orderIds: ['coll-inc-1'],
          salarySourceIds: [],
          reimbursementReceiptIds: [],
          kind: 'collection',
          incomeItemIds: ['inc-1'],
        },
      ],
    });
    const bank411 = entries.filter((e) => e.accountCode === '411000' && e.sourceType === 'sepa');
    const paidEncaissement = entries.filter(
      (e) => e.journal === 'BQ' && e.sourceType === 'income' && e.accountCode === '411000'
    );
    expect(bank411.length).toBeGreaterThan(0);
    expect(paidEncaissement).toHaveLength(0);
    expect(summarizeAccountingEntries(entries).balanced).toBe(true);
  });

  it('comptabilise les remboursements NF en 467', () => {
    const entries = buildAccountingEntries({
      incomeItems: [],
      budgetItems: [],
      supplierInvoices: [],
      sepaBatches: [
        {
          id: 'b1',
          batchReference: 'SEPA-1',
          executionDate: '2026-01-20',
          totalAmount: 55,
          orderCount: 1,
          exportedAt: '2026-01-20T10:00:00Z',
          orderIds: ['r1'],
          salarySourceIds: [],
          reimbursementReceiptIds: ['rec1'],
          kind: 'payment',
        },
      ],
    });
    expect(entries.some((e) => e.accountCode === '467000')).toBe(true);
    expect(entries.some((e) => e.accountCode === '421000')).toBe(false);
  });
});
