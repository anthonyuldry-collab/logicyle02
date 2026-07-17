import {
  ExpenseReceipt,
  ExpenseReceiptStatus,
  Rider,
  SepaBatch,
  SepaPaymentOrder,
  StaffMember,
  TeamSepaSettings,
} from '../types';
import { buildTeamContractSummaries, calculateVacataireCostForMonth, isVacataireStaff, PayrollContext } from './contractUtils';

const IBAN_LENGTHS: Record<string, number> = {
  FR: 27,
  BE: 16,
  DE: 22,
  ES: 24,
  IT: 27,
  NL: 18,
  LU: 20,
  CH: 21,
  GB: 22,
};

export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

export function formatIbanDisplay(iban: string): string {
  const normalized = normalizeIban(iban);
  return normalized.replace(/(.{4})/g, '$1 ').trim();
}

export function validateIban(iban: string): boolean {
  const normalized = normalizeIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized)) return false;

  const country = normalized.slice(0, 2);
  const expectedLength = IBAN_LENGTHS[country];
  if (expectedLength && normalized.length !== expectedLength) return false;

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const numeric = rearranged
    .split('')
    .map((ch) => (ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch))
    .join('');

  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    remainder = parseInt(String(remainder) + numeric.slice(i, i + 7), 10) % 97;
  }
  return remainder === 1;
}

export function validateBic(bic: string): boolean {
  const normalized = bic.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized);
}

export function isSepaSettingsComplete(settings?: TeamSepaSettings): boolean {
  if (!settings) return false;
  return Boolean(
    settings.debtorName?.trim() &&
      settings.debtorIban?.trim() &&
      validateIban(settings.debtorIban)
  );
}

function buildBeneficiaryName(firstName: string, lastName: string, override?: string): string {
  const full = `${firstName} ${lastName}`.trim();
  return override?.trim() || full;
}

export function buildSalaryPaymentOrders(
  riders: Rider[],
  staff: StaffMember[],
  context?: PayrollContext,
  paidSourceIds?: Set<string>
): SepaPaymentOrder[] {
  const contracts = buildTeamContractSummaries(riders, staff, context);
  const orders: SepaPaymentOrder[] = [];

  for (const contract of contracts) {
    if (contract.monthlySalary <= 0) continue;
    if (paidSourceIds?.has(contract.id)) continue;

    const person =
      contract.type === 'rider'
        ? riders.find((r) => r.id === contract.id)
        : staff.find((s) => s.id === contract.id);
    if (!person) continue;

    const iban = person.bankDetails?.iban?.trim() || '';
    const normalizedIban = iban ? normalizeIban(iban) : '';

    const isVacataireOrder =
      contract.type === 'staff' && isVacataireStaff(person as StaffMember);
    const today = new Date();
    today.setDate(1);
    const vacataireEventCost =
      isVacataireOrder && context
        ? calculateVacataireCostForMonth(person as StaffMember, today, context)
        : 0;
    const amount =
      vacataireEventCost > 0
        ? Math.round(vacataireEventCost * 100) / 100
        : Math.round(contract.monthlySalary * 100) / 100;

    if (amount <= 0) continue;

    orders.push({
      id: `salary-${contract.type}-${contract.id}`,
      type: 'salary',
      beneficiaryName: buildBeneficiaryName(
        person.firstName,
        person.lastName,
        person.bankDetails?.accountHolderName
      ),
      beneficiaryIban: normalizedIban,
      beneficiaryBic: person.bankDetails?.bic?.trim().toUpperCase(),
      amount,
      reference: (
        vacataireEventCost > 0
          ? `Vacataire ${today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} — ${contract.name}`
          : `Salaire ${contract.name}`
      ).slice(0, 140),
      sourceId: contract.id,
      sourceLabel: contract.name,
      hasValidIban: Boolean(normalizedIban && validateIban(normalizedIban)),
    });
  }

  return orders.sort((a, b) => a.beneficiaryName.localeCompare(b.beneficiaryName, 'fr'));
}

function findPersonForReceipt(
  receipt: ExpenseReceipt,
  riders: Rider[],
  staff: StaffMember[]
): Rider | StaffMember | undefined {
  if (receipt.submittedByName) {
    const normalized = receipt.submittedByName.toLowerCase().trim();
    const staffMember = staff.find(
      (s) => `${s.firstName} ${s.lastName}`.toLowerCase().trim() === normalized
    );
    if (staffMember) return staffMember;
    const rider = riders.find(
      (r) => `${r.firstName} ${r.lastName}`.toLowerCase().trim() === normalized
    );
    if (rider) return rider;
  }
  return undefined;
}

export function buildReimbursementPaymentOrders(
  receipts: ExpenseReceipt[],
  riders: Rider[],
  staff: StaffMember[],
  paidReceiptIds?: Set<string>
): SepaPaymentOrder[] {
  const orders: SepaPaymentOrder[] = [];

  for (const receipt of receipts) {
    if (receipt.status !== ExpenseReceiptStatus.VALIDATED || receipt.sepaPaidAt) continue;
    if (paidReceiptIds?.has(receipt.id)) continue;
    if (!receipt.amount || receipt.amount <= 0) continue;

    const person = findPersonForReceipt(receipt, riders, staff);

    const iban = person?.bankDetails?.iban?.trim() || '';
    const normalizedIban = iban ? normalizeIban(iban) : '';
    const beneficiaryName =
      person
        ? buildBeneficiaryName(person.firstName, person.lastName, person.bankDetails?.accountHolderName)
        : receipt.submittedByName || 'Bénéficiaire inconnu';

    orders.push({
      id: `reimbursement-${receipt.id}`,
      type: 'reimbursement',
      beneficiaryName,
      beneficiaryIban: normalizedIban,
      beneficiaryBic: person?.bankDetails?.bic?.trim().toUpperCase(),
      amount: Math.round(receipt.amount * 100) / 100,
      reference: `NF ${receipt.merchant || receipt.description || receipt.id}`.slice(0, 140),
      sourceId: receipt.id,
      sourceLabel: receipt.merchant || receipt.description || receipt.submittedByName,
      hasValidIban: Boolean(normalizedIban && validateIban(normalizedIban)),
    });
  }

  return orders.sort((a, b) => a.beneficiaryName.localeCompare(b.beneficiaryName, 'fr'));
}

export function buildSepaPaymentOrders(params: {
  riders: Rider[];
  staff: StaffMember[];
  receipts: ExpenseReceipt[];
  payrollContext?: PayrollContext;
  includeSalaries?: boolean;
  includeReimbursements?: boolean;
}): SepaPaymentOrder[] {
  const {
    riders,
    staff,
    receipts,
    payrollContext,
    includeSalaries = true,
    includeReimbursements = true,
  } = params;

  const orders: SepaPaymentOrder[] = [];
  if (includeSalaries) orders.push(...buildSalaryPaymentOrders(riders, staff, payrollContext));
  if (includeReimbursements) orders.push(...buildReimbursementPaymentOrders(receipts, riders, staff));
  return orders;
}

export function summarizeSepaOrders(orders: SepaPaymentOrder[]) {
  const ready = orders.filter((o) => o.hasValidIban);
  const missingIban = orders.filter((o) => !o.hasValidIban);
  const totalAmount = ready.reduce((sum, o) => sum + o.amount, 0);
  return {
    total: orders.length,
    readyCount: ready.length,
    missingIbanCount: missingIban.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    readyOrders: ready,
    missingIbanOrders: missingIban,
  };
}

export function buildSepaBatch(params: {
  orders: SepaPaymentOrder[];
  executionDate: string;
  exportedByUserId?: string;
  exportedByName?: string;
}): SepaBatch {
  const { orders, executionDate, exportedByUserId, exportedByName } = params;
  const totalAmount = orders.reduce((s, o) => s + o.amount, 0);
  const now = new Date();
  const ref = `SEPA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    id: `batch-${now.getTime()}`,
    batchReference: ref,
    executionDate,
    totalAmount: Math.round(totalAmount * 100) / 100,
    orderCount: orders.length,
    exportedAt: now.toISOString(),
    exportedByUserId,
    exportedByName,
    orderIds: orders.map((o) => o.id),
    salarySourceIds: orders.filter((o) => o.type === 'salary').map((o) => o.sourceId),
    reimbursementReceiptIds: orders.filter((o) => o.type === 'reimbursement').map((o) => o.sourceId),
    xmlFileName: `${ref}.xml`,
  };
}

export function getAlreadyPaidSalaryIds(
  riders: Rider[],
  staff: StaffMember[],
  batches: SepaBatch[],
  currentMonth?: string
): Set<string> {
  const month = currentMonth || new Date().toISOString().slice(0, 7);
  const paid = new Set<string>();

  for (const batch of batches) {
    if (!batch.executionDate.startsWith(month)) continue;
    for (const id of batch.salarySourceIds) paid.add(id);
  }

  for (const rider of riders) {
    if (rider.sepaLastPaidAt?.startsWith(month)) paid.add(rider.id);
  }
  for (const member of staff) {
    if (member.sepaLastPaidAt?.startsWith(month)) paid.add(member.id);
  }

  return paid;
}

export function getAlreadyPaidReceiptIds(batches: SepaBatch[]): Set<string> {
  const paid = new Set<string>();
  for (const batch of batches) {
    for (const id of batch.reimbursementReceiptIds) paid.add(id);
  }
  return paid;
}
