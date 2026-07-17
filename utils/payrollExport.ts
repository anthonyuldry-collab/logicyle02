import { ContractSummary } from './contractUtils';

function escapeCsv(value: string | number | undefined): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportPayrollCsv(teamName: string, contracts: ContractSummary[]): void {
  const lines = [
    'Type,Nom,Rôle,Statut staff,Type contrat,Début,Fin,Durée (mois),Salaire mensuel (EUR),Tarif journalier (EUR),Estimé,Prime signature (EUR),Coût annuel (EUR),Jours restants,Clauses,Primes performance',
  ];

  for (const c of contracts) {
    lines.push(
      [
        c.type === 'rider' ? 'Coureur' : 'Staff',
        c.name,
        c.role || '',
        c.staffStatus || '',
        c.contractType || '',
        c.contractStartDate || '',
        c.contractEndDate || '',
        c.durationMonths ?? '',
        c.monthlySalary,
        c.dailyRate ?? '',
        c.isEstimatedCost ? 'Oui' : '',
        c.signingBonus,
        c.annualCost,
        c.daysRemaining ?? '',
        c.contractClauses || '',
        c.performanceBonusNotes || '',
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LogiCycle_Masse_Salariale_${teamName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
