import { AccountingEntry } from '../types';
import { buildAccountingEntries } from './accountingEntryUtils';
import type { EventBudgetItem, IncomeItem, SepaBatch, SupplierInvoice } from '../types';

/** Format FEC (Fichier des Écritures Comptables) — norme DGFiP. */
const FEC_COLUMNS = [
  'JournalCode',
  'JournalLib',
  'EcritureNum',
  'EcritureDate',
  'CompteNum',
  'CompteLib',
  'CompAuxNum',
  'CompAuxLib',
  'PieceRef',
  'PieceDate',
  'EcritureLib',
  'Debit',
  'Credit',
  'EcritureLet',
  'DateLet',
  'ValidDate',
  'Montantdevise',
  'Idevise',
] as const;

const JOURNAL_LABELS: Record<string, string> = {
  VE: 'Journal des ventes',
  AC: 'Journal des achats',
  BQ: 'Journal de banque',
  OD: 'Journal des opérations diverses',
};

function formatFecDate(isoDate: string): string {
  const d = isoDate.slice(0, 10);
  return d.replace(/-/g, '');
}

function escapeFecField(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes('|') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function entryToFecRow(entry: AccountingEntry, lineNum: number): string {
  const fields = [
    entry.journal,
    JOURNAL_LABELS[entry.journal] || entry.journal,
    String(lineNum),
    formatFecDate(entry.date),
    entry.accountCode,
    entry.accountLabel,
    '',
    '',
    entry.pieceRef,
    formatFecDate(entry.date),
    entry.label,
    entry.debit > 0 ? entry.debit.toFixed(2) : '0.00',
    entry.credit > 0 ? entry.credit.toFixed(2) : '0.00',
    '',
    '',
    formatFecDate(entry.date),
    '',
    '',
  ];
  return fields.map(escapeFecField).join('|');
}

export function buildFecContent(
  entries: AccountingEntry[],
  siren: string,
  fiscalYearEnd: string
): string {
  const header = FEC_COLUMNS.join('|');
  const rows = entries.map((e, i) => entryToFecRow(e, i + 1));
  const fileName = `${siren}FEC${formatFecDate(fiscalYearEnd)}`;
  return [header, ...rows].join('\n') + `\n#${fileName}`;
}

export function exportFecCsv(params: {
  incomeItems: IncomeItem[];
  budgetItems: EventBudgetItem[];
  supplierInvoices: SupplierInvoice[];
  sepaBatches: SepaBatch[];
  siren: string;
  fiscalYearEnd: string;
  language?: 'fr' | 'en';
}): void {
  const entries = buildAccountingEntries({
    incomeItems: params.incomeItems,
    budgetItems: params.budgetItems,
    supplierInvoices: params.supplierInvoices,
    sepaBatches: params.sepaBatches,
    language: params.language,
  });

  const content = buildFecContent(entries, params.siren, params.fiscalYearEnd);
  const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${params.siren}FEC${formatFecDate(params.fiscalYearEnd)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
