/**
 * Smoke ERP lean — parcours Continental : devis → facture → SEPA (pain.001 / pain.008).
 * Doc : docs/ERP_LEAN_SMOKE.md
 */
import { describe, expect, it } from 'vitest';
import { hasSepaExportAccess } from '../contractUtils';
import { issueInvoice, markInvoicePaid } from '../invoiceUtils';
import { convertQuoteToInvoice, enrichQuote, formatQuoteNumber } from '../quoteUtils';
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

const invoiceSettings: TeamInvoiceSettings = {
  issuerName: 'Team Continental Démo',
  invoicePrefix: 'FAC',
  nextInvoiceNumber: 1,
  nextQuoteNumber: 1,
  defaultVatRate: 20,
};

const sepaSettings: TeamSepaSettings = {
  debtorName: 'Team Continental Démo',
  debtorIban: 'FR7630006000011234567890189',
  debtorBic: 'BNPAFRPP',
  creditorIdentifier: 'FR12ZZZ123456',
};

const client: ClientRecord = {
  id: 'cli-sponsor',
  companyName: 'Sponsor Horizon SA',
  iban: 'FR76 3000 6000 0112 3456 7890 189',
  bic: 'AGRIFRPP',
  mandateReference: 'UMR-HORIZON-2026-001',
  mandateSignedAt: '2026-01-15',
  mandateSequence: 'OOFF',
  paymentTermsDays: 30,
  createdAt: '2026-01-01',
};

describe('ERP lean smoke · devis → facture → SEPA', () => {
  it('plan Continental (Élite) a accès export SEPA', () => {
    expect(hasSepaExportAccess(SubscriptionPlanId.CLUB)).toBe(false);
    expect(hasSepaExportAccess(SubscriptionPlanId.COMPETITION)).toBe(true);
    expect(hasSepaExportAccess(SubscriptionPlanId.CONTINENTAL)).toBe(true);
    expect(isSepaCollectionSettingsComplete(sepaSettings)).toBe(true);
    expect(isSepaCollectionSettingsComplete({ ...sepaSettings, creditorIdentifier: '' })).toBe(false);
  });

  it('masque les IBAN hors export', () => {
    const masked = maskIbanDisplay('FR7630006000011234567890189');
    expect(masked).toContain('FR76');
    expect(masked).toContain('0189');
    expect(masked).not.toContain('300060000112345678');
  });

  it('enchaîne devis → brouillon sans n° → émission → pain.008 avec batch anti-doublon', () => {
    const quote: Quote = enrichQuote({
      id: 'q-smoke-1',
      quoteNumber: formatQuoteNumber(invoiceSettings, 1, 2026),
      clientId: client.id,
      clientName: client.companyName,
      description: 'Partenariat maillot saison 2026',
      amount: 12000,
      vatRate: 20,
      amountHT: 0,
      category: IncomeCategory.SPONSORING,
      status: 'accepted',
      validUntil: '2026-12-31',
      createdAt: '2026-08-01',
    });

    expect(quote.quoteNumber).toBe('DEV-2026-0001');
    expect(quote.amountHT).toBe(10000);

    const { quote: converted, income: draft, settings: afterConvert } = convertQuoteToInvoice(
      quote,
      invoiceSettings,
      'fr'
    );
    expect(converted.status).toBe('converted');
    expect(draft.invoiceStatus).toBe(InvoiceStatus.DRAFT);
    expect(draft.invoiceNumber).toBeUndefined();
    expect(draft.clientId).toBe(client.id);
    expect(draft.category).toBe(IncomeCategory.SPONSORING);
    expect(afterConvert.nextInvoiceNumber).toBe(1);

    const { item: issued, settings: afterIssue } = issueInvoice(draft, afterConvert, 'fr');
    expect(issued.invoiceStatus).toBe(InvoiceStatus.ISSUED);
    expect(issued.invoiceNumber).toBe('FAC-2026-0001');
    expect(afterIssue.nextInvoiceNumber).toBe(2);
    expect(issued.dueDate).toBeTruthy();

    const orders = buildClientCollectionOrders([issued], [client]);
    const summary = summarizeCollectionOrders(orders);
    expect(summary.readyOrders).toHaveLength(1);
    expect(summary.totalAmount).toBe(12000);
    expect(summary.invalidCount).toBe(0);

    const xml008 = generateSepaPain008XmlContent(
      'Team Continental Démo',
      sepaSettings,
      summary.readyOrders,
      '2026-08-15'
    );
    expect(xml008).toBeTruthy();
    expect(xml008!).toContain('pain.008.001.02');
    expect(xml008!).toContain('<PmtMtd>DD</PmtMtd>');
    expect(xml008!).toContain('<CtrlSum>12000.00</CtrlSum>');
    expect(xml008!).toContain('FR7630006000011234567890189');
    expect(xml008!).toContain('FR12ZZZ123456');
    expect(xml008!).toContain('UMR-HORIZON-2026-001');
    expect(xml008!).toContain('<DtOfSgntr>2026-01-15</DtOfSgntr>');
    expect(xml008!).toContain('<BIC>AGRIFRPP</BIC>');
    expect(xml008!).toContain('FAC-2026-0001');
    expect(xml008!).not.toContain('FAC FAC-');

    const batch = buildSepaCollectionBatch({
      orders: summary.readyOrders,
      executionDate: '2026-08-15',
    });
    expect(batch.kind).toBe('collection');
    expect(batch.incomeItemIds).toEqual([issued.id]);

    const marked: IncomeItem = {
      ...issued,
      sepaCollectionBatchId: batch.id,
      sepaCollectionExportedAt: batch.exportedAt,
    };
    const afterExport = summarizeCollectionOrders(
      buildClientCollectionOrders([marked], [client], getAlreadyCollectedIncomeIds([batch]))
    );
    expect(afterExport.readyOrders).toHaveLength(0);
    expect(afterExport.alreadyExportedCount).toBe(1);

    const paid = markInvoicePaid(issued);
    expect(paid.invoiceStatus).toBe(InvoiceStatus.PAID);
  });

  it('génère pain.001 virement salaires (parcours Continental démo)', () => {
    const riders = [
      {
        id: 'r1',
        firstName: 'Léa',
        lastName: 'Martin',
        salary: 2800,
        isActive: true,
        bankDetails: {
          iban: 'FR7630006000011234567890189',
          bic: 'AGRIFRPP',
        },
      } as Rider,
    ];
    const receipts = [
      {
        id: 'rec1',
        submittedByUserId: 'u1',
        submittedByName: 'Léa Martin',
        imageUrl: 'https://example.com/r.jpg',
        status: ExpenseReceiptStatus.VALIDATED,
        budgetCategory: BudgetItemCategory.TRANSPORT,
        accountingCode: '6251',
        accountingLabel: 'Transport',
        amount: 42,
        receiptDate: '2026-08-01',
        createdAt: '2026-08-01T10:00:00Z',
      },
    ];

    const payOrders = buildSepaPaymentOrders({ riders, staff: [], receipts });
    const paySummary = summarizeSepaOrders(payOrders);
    expect(paySummary.readyCount).toBe(2);

    const xml001 = generateSepaPain001XmlContent(
      'Team Continental Démo',
      sepaSettings,
      payOrders,
      '2026-08-31'
    );
    expect(xml001).toBeTruthy();
    expect(xml001!).toContain('pain.001.001.09');
    expect(xml001!).toContain('<PmtMtd>TRF</PmtMtd>');
    expect(xml001!).toContain('<NbOfTxs>2</NbOfTxs>');
  });

  it('refuse l’émission sans clientId et exclut les prélèvements incomplets', () => {
    expect(() =>
      issueInvoice(
        {
          id: 'i1',
          description: 'Sans client',
          amount: 100,
          date: '2026-08-01',
          category: IncomeCategory.SPONSORING,
          clientName: 'X',
        },
        invoiceSettings
      )
    ).toThrow(/clientId/);

    const issuedNoMandate: IncomeItem = {
      id: 'i-nomandate',
      description: 'Émise',
      amount: 500,
      date: '2026-08-01',
      category: IncomeCategory.SPONSORING,
      invoiceStatus: InvoiceStatus.ISSUED,
      invoiceNumber: 'FAC-2026-0099',
      clientName: client.companyName,
      clientId: client.id,
    };
    const clientNoMandate = { ...client, mandateReference: undefined, mandateSignedAt: undefined };
    const summary = summarizeCollectionOrders(
      buildClientCollectionOrders([issuedNoMandate], [clientNoMandate])
    );
    expect(summary.readyOrders).toHaveLength(0);
    expect(summary.invalidCount).toBe(1);
    expect(generateSepaPain008XmlContent('T', sepaSettings, summary.orders)).toBeNull();
  });
});
