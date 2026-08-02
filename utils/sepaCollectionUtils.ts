import {
  ClientRecord,
  IncomeItem,
  InvoiceStatus,
  SepaBatch,
  SepaMandateSequence,
} from '../types';
import { normalizeIban, validateBic, validateIban } from './sepaUtils';

export interface SepaCollectionOrder {
  id: string;
  incomeItemId: string;
  clientId?: string;
  clientName: string;
  beneficiaryIban: string;
  /** BIC banque du débiteur (client) — requis pain.008 bancable. */
  beneficiaryBic?: string;
  amount: number;
  reference: string;
  hasValidIban: boolean;
  hasValidBic: boolean;
  hasValidMandate: boolean;
  /** Prêt à exporter (IBAN + BIC + mandat + non déjà présenté). */
  isExportReady: boolean;
  mandateReference?: string;
  mandateSignedAt?: string;
  mandateSequence: SepaMandateSequence;
  blockingReason?:
    | 'iban'
    | 'bic'
    | 'mandate'
    | 'already_exported'
    | 'no_client'
    | 'credited';
}

const SEQ_ORDER: SepaMandateSequence[] = ['FRST', 'RCUR', 'FNAL', 'OOFF'];

export function getAlreadyCollectedIncomeIds(batches: SepaBatch[]): Set<string> {
  const ids = new Set<string>();
  for (const batch of batches) {
    if (batch.kind === 'payment') continue;
    if (batch.kind === 'collection' || (batch.incomeItemIds && batch.incomeItemIds.length > 0)) {
      for (const id of batch.incomeItemIds || []) ids.add(id);
    }
  }
  return ids;
}

/** Factures ayant un avoir lié (creditNoteForInvoiceId pointe vers elles). */
export function getCreditedIncomeIds(incomeItems: IncomeItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of incomeItems) {
    if (item.creditNoteForInvoiceId) ids.add(item.creditNoteForInvoiceId);
  }
  return ids;
}

/** Matching strict par clientId — pas de fallback raison sociale. */
function resolveClient(item: IncomeItem, clients: ClientRecord[]): ClientRecord | undefined {
  if (!item.clientId?.trim()) return undefined;
  return clients.find((c) => c.id === item.clientId);
}

function buildCollectionReference(invoiceNumber?: string, fallbackId?: string): string {
  const invRef = (invoiceNumber || fallbackId || '').trim();
  if (!invRef) return 'FAC';
  return (/^FAC[\s-]/i.test(invRef) ? invRef : `FAC ${invRef}`).slice(0, 35);
}

function stubOrder(
  item: IncomeItem,
  blockingReason: NonNullable<SepaCollectionOrder['blockingReason']>
): SepaCollectionOrder {
  return {
    id: `coll-${item.id}`,
    incomeItemId: item.id,
    clientId: item.clientId,
    clientName: item.clientName || item.sponsorCompanyName || item.description,
    beneficiaryIban: '',
    amount: item.amount,
    reference: buildCollectionReference(item.invoiceNumber, item.id),
    hasValidIban: false,
    hasValidBic: false,
    hasValidMandate: false,
    isExportReady: false,
    mandateSequence: 'OOFF',
    blockingReason,
  };
}

export function buildClientCollectionOrders(
  incomeItems: IncomeItem[],
  clients: ClientRecord[],
  alreadyCollectedIds?: Set<string>
): SepaCollectionOrder[] {
  const collected = alreadyCollectedIds || new Set<string>();
  const credited = getCreditedIncomeIds(incomeItems);

  return incomeItems
    .filter(
      (i) =>
        i.invoiceStatus === InvoiceStatus.ISSUED &&
        i.amount > 0 &&
        !i.creditNoteForInvoiceId // l’avoir lui-même n’est pas prélevable
    )
    .map((item) => {
      if (collected.has(item.id) || item.sepaCollectionBatchId) {
        return stubOrder(item, 'already_exported');
      }
      if (credited.has(item.id)) {
        return stubOrder(item, 'credited');
      }

      const client = resolveClient(item, clients);
      if (!client) return stubOrder(item, 'no_client');

      const iban = normalizeIban(client.iban || '');
      const bic = client.bic?.replace(/\s+/g, '').toUpperCase() || '';
      const mandateReference = client.mandateReference?.trim() || '';
      const mandateSignedAt = client.mandateSignedAt?.trim() || '';
      const hasValidIban = validateIban(iban);
      const hasValidBic = Boolean(bic && validateBic(bic));
      const hasValidMandate = Boolean(mandateReference && /^\d{4}-\d{2}-\d{2}$/.test(mandateSignedAt));
      const mandateSequence: SepaMandateSequence = client.mandateSequence || 'OOFF';

      let blockingReason: SepaCollectionOrder['blockingReason'];
      if (!hasValidIban) blockingReason = 'iban';
      else if (!hasValidBic) blockingReason = 'bic';
      else if (!hasValidMandate) blockingReason = 'mandate';

      return {
        id: `coll-${item.id}`,
        incomeItemId: item.id,
        clientId: client.id,
        clientName: item.clientName || item.sponsorCompanyName || client.companyName,
        beneficiaryIban: iban,
        beneficiaryBic: bic || undefined,
        amount: item.amount,
        reference: buildCollectionReference(item.invoiceNumber, item.id),
        hasValidIban,
        hasValidBic,
        hasValidMandate,
        isExportReady: hasValidIban && hasValidBic && hasValidMandate,
        mandateReference: mandateReference || undefined,
        mandateSignedAt: mandateSignedAt || undefined,
        mandateSequence,
        blockingReason,
      };
    });
}

/**
 * Dans un même lot : au plus un FRST par UMR ; les suivants passent en RCUR.
 * Évite un rejet banque si plusieurs factures du même mandat partent ensemble.
 */
export function normalizeCollectionSequencesForBatch(
  orders: SepaCollectionOrder[]
): SepaCollectionOrder[] {
  const seenFrstByMandate = new Set<string>();
  return orders.map((order) => {
    if (!order.isExportReady || order.mandateSequence !== 'FRST') return order;
    const key = (order.mandateReference || order.clientId || order.id).toUpperCase();
    if (seenFrstByMandate.has(key)) {
      return { ...order, mandateSequence: 'RCUR' as SepaMandateSequence };
    }
    seenFrstByMandate.add(key);
    return order;
  });
}

/** Clients dont le mandat FRST doit passer en RCUR après export réussi. */
export function clientsToAdvanceMandateAfterCollection(
  clients: ClientRecord[],
  exportedOrders: SepaCollectionOrder[]
): ClientRecord[] {
  const clientIds = new Set(
    exportedOrders
      .filter((o) => o.isExportReady && o.mandateSequence === 'FRST' && o.clientId)
      .map((o) => o.clientId as string)
  );
  return clients
    .filter((c) => clientIds.has(c.id) && (c.mandateSequence || 'OOFF') === 'FRST')
    .map((c) => ({ ...c, mandateSequence: 'RCUR' as SepaMandateSequence }));
}

export function summarizeCollectionOrders(orders: SepaCollectionOrder[]) {
  const readyOrders = orders.filter((o) => o.isExportReady && o.amount > 0);
  const alreadyExportedCount = orders.filter((o) => o.blockingReason === 'already_exported').length;
  const creditedCount = orders.filter((o) => o.blockingReason === 'credited').length;
  return {
    orders,
    readyOrders,
    totalAmount: readyOrders.reduce((s, o) => s + o.amount, 0),
    invalidCount: orders.length - readyOrders.length - alreadyExportedCount - creditedCount,
    alreadyExportedCount,
    creditedCount,
  };
}

export function sortSeqTypes(seqs: Iterable<string>): string[] {
  return [...seqs].sort((a, b) => {
    const ia = SEQ_ORDER.indexOf(a as SepaMandateSequence);
    const ib = SEQ_ORDER.indexOf(b as SepaMandateSequence);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

export function buildSepaCollectionBatch(params: {
  orders: SepaCollectionOrder[];
  executionDate: string;
  exportedByUserId?: string;
  exportedByName?: string;
}): SepaBatch {
  const { orders, executionDate, exportedByUserId, exportedByName } = params;
  const ready = normalizeCollectionSequencesForBatch(
    orders.filter((o) => o.isExportReady && o.amount > 0)
  );
  const totalAmount = ready.reduce((s, o) => s + o.amount, 0);
  const now = new Date();
  const ref = `SEPA-COL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    id: `batch-col-${now.getTime()}`,
    batchReference: ref,
    executionDate,
    totalAmount: Math.round(totalAmount * 100) / 100,
    orderCount: ready.length,
    exportedAt: now.toISOString(),
    exportedByUserId,
    exportedByName,
    orderIds: ready.map((o) => o.id),
    salarySourceIds: [],
    reimbursementReceiptIds: [],
    kind: 'collection',
    incomeItemIds: ready.map((o) => o.incomeItemId),
    xmlFileName: `${ref}.xml`,
  };
}
