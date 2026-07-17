import { BudgetItemCategory, SupplierInvoice, SupplierInvoiceStatus } from '../types';
import { resolveAccountingCode } from '../constants/accountingCodes';

export function createSupplierInvoiceDraft(
  params: Partial<SupplierInvoice> & { supplierName: string; amountTTC: number }
): SupplierInvoice {
  const vatRate = params.vatRate ?? 20;
  const amountTTC = params.amountTTC;
  const amountHT = Math.round((amountTTC / (1 + vatRate / 100)) * 100) / 100;
  const accounting = resolveAccountingCode(
    params.budgetItemId ? BudgetItemCategory.FRAIS_DIVERS : BudgetItemCategory.MATERIEL
  );

  return {
    id: params.id || crypto.randomUUID(),
    supplierName: params.supplierName,
    supplierSiret: params.supplierSiret,
    invoiceNumber: params.invoiceNumber || `FA-${Date.now().toString(36)}`,
    invoiceDate: params.invoiceDate || new Date().toISOString().slice(0, 10),
    dueDate: params.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    amountHT,
    vatRate,
    amountTTC,
    accountingCode: params.accountingCode || accounting.code,
    accountingLabel: params.accountingLabel || accounting.label,
    budgetItemId: params.budgetItemId,
    expenseReceiptId: params.expenseReceiptId,
    status: params.status || 'received',
    notes: params.notes,
    attachmentUrl: params.attachmentUrl,
  };
}

export function validateSupplierInvoice(invoice: SupplierInvoice): SupplierInvoice {
  return { ...invoice, status: 'validated' };
}

export function markSupplierInvoicePaid(
  invoice: SupplierInvoice,
  sepaBatchId?: string
): SupplierInvoice {
  return {
    ...invoice,
    status: 'paid',
    paidAt: new Date().toISOString(),
    sepaBatchId,
  };
}

export function getOverdueSupplierInvoices(invoices: SupplierInvoice[]): SupplierInvoice[] {
  const today = new Date().toISOString().slice(0, 10);
  return invoices.filter(
    (i) => (i.status === 'received' || i.status === 'validated') && i.dueDate < today
  );
}

export function summarizeSupplierInvoices(invoices: SupplierInvoice[]) {
  const byStatus = invoices.reduce<Record<SupplierInvoiceStatus, number>>(
    (acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    },
    { received: 0, validated: 0, paid: 0, disputed: 0 }
  );
  const totalOutstanding = invoices
    .filter((i) => i.status === 'validated' || i.status === 'received')
    .reduce((s, i) => s + i.amountTTC, 0);
  return { byStatus, totalOutstanding, overdue: getOverdueSupplierInvoices(invoices).length };
}
