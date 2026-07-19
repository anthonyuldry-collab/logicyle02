import { ClientRecord, IncomeItem } from '../types';

export function buildClientFromIncome(income: IncomeItem): Omit<ClientRecord, 'id' | 'createdAt'> {
  return {
    companyName: income.sponsorCompanyName || income.clientName || income.sponsorshipContactName || 'Client',
    contactName: income.sponsorshipContactName,
    email: income.sponsorshipContactEmail,
    phone: income.sponsorshipContactPhone,
    address: income.clientAddress,
    siret: income.sponsorSiret,
    vatNumber: income.clientVatNumber,
    paymentTermsDays: 30,
    notes: income.notes,
  };
}

export function linkIncomeToClient(income: IncomeItem, client: ClientRecord): IncomeItem {
  return {
    ...income,
    clientId: client.id,
    clientName: client.companyName,
    clientAddress: client.address,
    clientVatNumber: client.vatNumber,
    sponsorshipContactName: income.sponsorshipContactName || client.contactName,
    sponsorshipContactEmail: income.sponsorshipContactEmail || client.email,
    sponsorshipContactPhone: income.sponsorshipContactPhone || client.phone,
  };
}

export function searchClients(clients: ClientRecord[], query: string): ClientRecord[] {
  const q = query.toLowerCase().trim();
  if (!q) return clients;
  return clients.filter(
    (c) =>
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.siret || '').includes(q)
  );
}

export function getClientOutstanding(incomes: IncomeItem[], clientId: string): number {
  return incomes
    .filter(
      (i) =>
        i.clientId === clientId &&
        i.invoiceStatus === 'Émise'
    )
    .reduce((s, i) => s + i.amount, 0);
}
