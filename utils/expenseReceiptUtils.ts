import { resolveAccountingCode } from '../constants/accountingCodes';
import {
  BudgetItemCategory,
  EventBudgetItem,
  EventTransportLeg,
  ExpenseReceipt,
  ExpenseReceiptStatus,
  ExpenseOcrStatus,
  StaffMember,
  StaffRole,
  User,
  UserRole,
} from '../types';
import { getStaffMemberForUser } from './staffMemberUtils';

const RECEIPT_SCAN_ROLES = new Set<string>([
  StaffRole.DS,
  StaffRole.ASSISTANT,
  StaffRole.MANAGER,
  'DS',
  'Directeur Sportif',
  'ASSISTANT',
  'Assistant(e)',
  'MANAGER',
  'Manager',
]);

export function findStaffMemberForUser(user: User, staff: StaffMember[]): StaffMember | undefined {
  return getStaffMemberForUser(user, staff);
}

export function canScanExpenseReceipts(user: User, staff: StaffMember[]): boolean {
  if (user.userRole === UserRole.MANAGER) return true;
  const member = findStaffMemberForUser(user, staff);
  if (!member) return false;
  return RECEIPT_SCAN_ROLES.has(String(member.role));
}

export function canManageExpenseReceipts(
  user: User,
  staff: StaffMember[],
  hasFinancialView: boolean
): boolean {
  return hasFinancialView || user.userRole === UserRole.MANAGER || canScanExpenseReceipts(user, staff);
}

export function buildExpenseReceiptDraft(params: {
  user: User;
  staff: StaffMember[];
  imageUrl: string;
  imageMimeType?: string;
  eventId?: string;
  transportLegId?: string;
  budgetCategory: BudgetItemCategory;
  amount: number;
  receiptDate: string;
  merchant?: string;
  description?: string;
  ocrStatus?: ExpenseOcrStatus | string;
  ocrRawText?: string;
  ocrConfidence?: number;
  language?: 'fr' | 'en';
}): ExpenseReceipt {
  const member = findStaffMemberForUser(params.user, params.staff);
  const accounting = resolveAccountingCode(params.budgetCategory, params.language ?? 'fr');
  const name = member
    ? `${member.firstName} ${member.lastName}`.trim()
    : `${params.user.firstName} ${params.user.lastName}`.trim();

  return {
    id: crypto.randomUUID(),
    eventId: params.eventId,
    transportLegId: params.transportLegId,
    submittedByUserId: params.user.id,
    submittedByName: name,
    staffRole: member?.role ? String(member.role) : undefined,
    imageUrl: params.imageUrl,
    imageMimeType: params.imageMimeType,
    status: ExpenseReceiptStatus.SUBMITTED,
    budgetCategory: params.budgetCategory,
    accountingCode: accounting.code,
    accountingLabel: accounting.label,
    amount: params.amount,
    receiptDate: params.receiptDate,
    merchant: params.merchant,
    description: params.description,
    ocrStatus: params.ocrStatus ?? ExpenseOcrStatus.MANUAL,
    ocrRawText: params.ocrRawText,
    ocrConfidence: params.ocrConfidence,
    createdAt: new Date().toISOString(),
  };
}

export function buildBudgetItemFromReceipt(receipt: ExpenseReceipt): EventBudgetItem {
  const label = receipt.merchant || receipt.description || 'Justificatif de frais';
  return {
    id: crypto.randomUUID(),
    eventId: receipt.eventId || '',
    category: receipt.budgetCategory,
    description: `${label} — ${receipt.submittedByName || 'Staff'}`,
    estimatedCost: 0,
    actualCost: receipt.amount,
    notes: `Compte ${receipt.accountingCode} — ${receipt.accountingLabel}`,
    accountingCode: receipt.accountingCode,
    accountingLabel: receipt.accountingLabel,
    expenseReceiptId: receipt.id,
    receiptDate: receipt.receiptDate,
    proofDocumentId: undefined,
  };
}

export function syncReceiptToBudgetItem(
  receipt: ExpenseReceipt,
  existingBudgetItemId?: string
): { receipt: ExpenseReceipt; budgetItem: EventBudgetItem } {
  const budgetItem = buildBudgetItemFromReceipt(receipt);
  if (existingBudgetItemId) {
    budgetItem.id = existingBudgetItemId;
  }
  return {
    receipt: {
      ...receipt,
      status: ExpenseReceiptStatus.SYNCED,
      budgetItemId: budgetItem.id,
      validatedAt: receipt.validatedAt || new Date().toISOString(),
    },
    budgetItem,
  };
}

export function getTransportLegLabel(leg: EventTransportLeg): string {
  return `${leg.direction} — ${leg.mode} (${leg.departureLocation || '?'} → ${leg.arrivalLocation || '?'})`;
}

export function filterReceiptsByEvent(receipts: ExpenseReceipt[], eventId?: string): ExpenseReceipt[] {
  if (!eventId) return receipts;
  return receipts.filter((r) => r.eventId === eventId);
}

export function sortReceiptsByDate(receipts: ExpenseReceipt[]): ExpenseReceipt[] {
  return [...receipts].sort(
    (a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
  );
}
