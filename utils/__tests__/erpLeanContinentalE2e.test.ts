/**
 * E2E logique Continental (P2) — parcours démo bout-en-bout sans UI browser.
 * Simule : client SEPA-ready → devis → conversion → émission → pain.008 (+ anti-doublon) → pain.001
 * + gates plan Club vs Continental.
 *
 * Doc : docs/ERP_LEAN_SMOKE.md · script : ./scripts/erp-lean-e2e-continental.sh
 */
import { describe, expect, it } from 'vitest';
import { hasSepaExportAccess } from '../contractUtils';
import { canIssueInvoice, issueInvoice, markInvoicePaid } from '../invoiceUtils';
import {
  canConvertQuote,
  convertQuoteToInvoice,
  enrichQuote,
  formatQuoteNumber,
} from '../quoteUtils';
import {
  buildClientCollectionOrders,
  buildSepaCollectionBatch,
  getAlreadyCollectedIncomeIds,
  summarizeCollectionOrders,
} from '../sepaCollectionUtils';
import {
  generateSepaPain001XmlContent,
  generateSepaPain008XmlContent,
} from '../sepaExport';
import {
  buildSepaBatch,
  buildSepaPaymentOrders,
  isSepaCollectionSettingsComplete,
  maskIbanDisplay,
  summarizeSepaOrders,
} from '../sepaUtils';
import {
  BudgetItemCategory,
  ExpenseReceiptStatus,
  IncomeCategory,
  InvoiceStatus,
  SubscriptionPlanId,
  type ClientRecord,
  type IncomeItem,
  type Quote,
  type Rider,
  type TeamInvoiceSettings,
  type TeamSepaSettings,
} from '../../types';

const settings: TeamInvoiceSettings = {
  issuerName: 'Team Continental E2E',
  invoicePrefix: 'FAC',
  nextInvoiceNumber: 1,
  nextQuoteNumber: 1,
  defaultVatRate: 20,
};

const sepa: TeamSepaSettings = {
  debtorName: 'Team Continental E2E',
  debtorIban: 'FR7630006000011234567890189',
  debtorBic: 'BNPAFRPP',
  creditorIdentifier: 'FR12ZZZ123456',
};

const client: ClientRecord = {
  id: 'cli-e2e',
  companyName: 'Sponsor E2E SA',
  iban: 'FR7630006000011234567890189',
  bic: 'AGRIFRPP',
  mandateReference: 'UMR-E2E-001',
  mandateSignedAt: '2026-02-01',
  mandateSequence: 'FRST',
  paymentTermsDays: 30,
  createdAt: '2026-01-01',
};

describe('E2E Continental · devis / facture / SEPA (P2)', () => {
  it('refuse devis / conversion / émission / SEPA sans clientId', () => {
    const orphan: Quote = {
      id: 'q-orphan',
      quoteNumber: 'DEV-2026-0099',
      clientName: 'Nom libre sans carnet',
      description: 'Sans lien',
      amount: 1000,
      vatRate: 20,
      amountHT: 833.33,
      status: 'accepted',
      validUntil: '2026-12-31',
      createdAt: '2026-08-01',
    };
    expect(canConvertQuote(orphan)).toBe(false);
    expect(() => convertQuoteToInvoice(orphan, settings)).toThrow(/clientId/);

    const draftNoClient: IncomeItem = {
      id: 'i-orphan',
      description: 'Orphan',
      amount: 1000,
      date: '2026-08-01',
      category: IncomeCategory.SPONSORING,
      clientName: 'Nom libre',
      invoiceStatus: InvoiceStatus.DRAFT,
    };
    expect(canIssueInvoice(draftNoClient)).toBe(false);
    expect(() => issueInvoice(draftNoClient, settings)).toThrow(/clientId/);

    const issuedNameOnly: IncomeItem = {
      ...draftNoClient,
      invoiceStatus: InvoiceStatus.ISSUED,
      invoiceNumber: 'FAC-2026-0099',
    };
    const summary = summarizeCollectionOrders(
      buildClientCollectionOrders([issuedNameOnly], [client])
    );
    expect(summary.readyOrders).toHaveLength(0);
    expect(summary.orders[0]?.blockingReason).toBe('no_client');
  });

  it('parcours Continental complet + anti-doublon + masquage', () => {
    expect(hasSepaExportAccess(SubscriptionPlanId.CONTINENTAL)).toBe(true);
    expect(hasSepaExportAccess(SubscriptionPlanId.CLUB)).toBe(false);
    expect(isSepaCollectionSettingsComplete(sepa)).toBe(true);

    const quote = enrichQuote({
      id: 'q-e2e',
      quoteNumber: formatQuoteNumber(settings, 1, 2026),
      clientId: client.id,
      clientName: client.companyName,
      description: 'Partenariat E2E Continental',
      amount: 6000,
      vatRate: 20,
      amountHT: 0,
      category: IncomeCategory.SPONSORING,
      status: 'accepted',
      validUntil: '2026-12-31',
      createdAt: '2026-08-02',
    });
    expect(canConvertQuote(quote)).toBe(true);

    const { income: draft, settings: afterConvert } = convertQuoteToInvoice(quote, settings, 'fr');
    expect(draft.invoiceNumber).toBeUndefined();
    expect(draft.clientId).toBe(client.id);

    const { item: issued, settings: afterIssue } = issueInvoice(draft, afterConvert, 'fr');
    expect(issued.invoiceNumber).toBe('FAC-2026-0001');
    expect(afterIssue.nextInvoiceNumber).toBe(2);

    const ready = summarizeCollectionOrders(
      buildClientCollectionOrders([issued], [client])
    ).readyOrders;
    expect(ready).toHaveLength(1);
    expect(ready[0].mandateSequence).toBe('FRST');

    const xml = generateSepaPain008XmlContent('Team', sepa, ready, '2026-08-20')!;
    expect(xml).toContain('<SeqTp>FRST</SeqTp>');
    expect(xml).toContain('UMR-E2E-001');
    expect(xml).toContain('<BIC>AGRIFRPP</BIC>');
    expect(maskIbanDisplay(ready[0].beneficiaryIban)).not.toContain('3000600001');

    const batch1 = buildSepaCollectionBatch({ orders: ready, executionDate: '2026-08-20' });
    const marked: IncomeItem = {
      ...issued,
      sepaCollectionBatchId: batch1.id,
      sepaCollectionExportedAt: batch1.exportedAt,
    };
    const second = summarizeCollectionOrders(
      buildClientCollectionOrders([marked], [client], getAlreadyCollectedIncomeIds([batch1]))
    );
    expect(second.readyOrders).toHaveLength(0);
    expect(second.alreadyExportedCount).toBe(1);
    expect(generateSepaPain008XmlContent('Team', sepa, second.orders)).toBeNull();

    const paid = markInvoicePaid(marked);
    expect(paid.invoiceStatus).toBe(InvoiceStatus.PAID);

    // pain.001 salaires
    const riders = [
      {
        id: 'r-e2e',
        firstName: 'Alex',
        lastName: 'Rider',
        salary: 2500,
        isActive: true,
        bankDetails: { iban: 'FR7630006000011234567890189', bic: 'AGRIFRPP' },
      } as Rider,
    ];
    const receipts = [
      {
        id: 'rec-e2e',
        submittedByUserId: 'u1',
        submittedByName: 'Alex Rider',
        imageUrl: 'https://example.com/r.jpg',
        status: ExpenseReceiptStatus.VALIDATED,
        budgetCategory: BudgetItemCategory.TRANSPORT,
        accountingCode: '6251',
        accountingLabel: 'Transport',
        amount: 55,
        receiptDate: '2026-08-01',
        createdAt: '2026-08-01T10:00:00Z',
      },
    ];
    const payOrders = buildSepaPaymentOrders({ riders, staff: [], receipts });
    expect(summarizeSepaOrders(payOrders).readyCount).toBe(2);
    const xml001 = generateSepaPain001XmlContent('Team', sepa, payOrders, '2026-08-31')!;
    expect(xml001).toContain('pain.001.001.09');
    const payBatch = buildSepaBatch({ orders: payOrders, executionDate: '2026-08-31' });
    expect(payBatch.kind).toBe('payment');
  });
});
