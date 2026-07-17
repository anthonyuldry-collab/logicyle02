import { ClientRecord, IncomeItem, InvoiceStatus, TeamSepaSettings } from '../types';
import { normalizeIban, validateIban } from './sepaUtils';

export interface SepaCollectionOrder {
  id: string;
  incomeItemId: string;
  clientName: string;
  beneficiaryIban: string;
  beneficiaryBic?: string;
  amount: number;
  reference: string;
  hasValidIban: boolean;
  mandateReference?: string;
}

export function buildClientCollectionOrders(
  incomeItems: IncomeItem[],
  clients: ClientRecord[]
): SepaCollectionOrder[] {
  return incomeItems
    .filter((i) => i.invoiceStatus === InvoiceStatus.ISSUED && i.amount > 0)
    .map((item) => {
      const client = clients.find(
        (c) =>
          c.companyName === item.clientName ||
          c.companyName === item.sponsorCompanyName ||
          item.clientId === c.id
      );
      const iban = normalizeIban(client?.iban || '');
      return {
        id: `coll-${item.id}`,
        incomeItemId: item.id,
        clientName: item.clientName || item.sponsorCompanyName || item.description,
        beneficiaryIban: iban,
        beneficiaryBic: undefined,
        amount: item.amount,
        reference: `FAC ${item.invoiceNumber || item.id}`.slice(0, 35),
        hasValidIban: validateIban(iban),
        mandateReference: client?.id ? `MAND-${client.id}` : undefined,
      };
    });
}

export function summarizeCollectionOrders(orders: SepaCollectionOrder[]) {
  const readyOrders = orders.filter((o) => o.hasValidIban && o.amount > 0);
  return {
    orders,
    readyOrders,
    totalAmount: readyOrders.reduce((s, o) => s + o.amount, 0),
    invalidCount: orders.length - readyOrders.length,
  };
}
