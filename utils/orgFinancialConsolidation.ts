import { EventBudgetItem, IncomeItem } from '../types';
import { isSponsorshipIncome } from './financialUtils';

export interface OrgTeamFinanceSummary {
  teamId: string;
  teamName: string;
  teamKind?: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  sponsorshipIncome: number;
  upcomingBudget: number;
}

export interface OrgFinancialConsolidation {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  totalSponsorship: number;
  byTeam: OrgTeamFinanceSummary[];
}

export function buildOrgFinancialConsolidation(params: {
  teamIds: string[];
  teamNames: Record<string, string>;
  teamKinds: Record<string, string | undefined>;
  incomeByTeam: Record<string, IncomeItem[]>;
  budgetByTeam: Record<string, EventBudgetItem[]>;
}): OrgFinancialConsolidation {
  const { teamIds, teamNames, teamKinds, incomeByTeam, budgetByTeam } = params;

  const byTeam: OrgTeamFinanceSummary[] = teamIds.map((teamId) => {
    const incomes = incomeByTeam[teamId] || [];
    const budgets = budgetByTeam[teamId] || [];
    const totalIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExpenses = budgets.reduce((s, b) => s + (b.estimatedCost || b.actualCost || 0), 0);
    const sponsorshipIncome = incomes
      .filter(isSponsorshipIncome)
      .reduce((s, i) => s + (i.amount || 0), 0);
    const upcomingBudget = budgets
      .filter((b) => !b.actualCost || b.actualCost === 0)
      .reduce((s, b) => s + (b.estimatedCost || 0), 0);

    return {
      teamId,
      teamName: teamNames[teamId] || teamId,
      teamKind: teamKinds[teamId],
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      sponsorshipIncome,
      upcomingBudget,
    };
  });

  return {
    totalIncome: byTeam.reduce((s, t) => s + t.totalIncome, 0),
    totalExpenses: byTeam.reduce((s, t) => s + t.totalExpenses, 0),
    balance: byTeam.reduce((s, t) => s + t.balance, 0),
    totalSponsorship: byTeam.reduce((s, t) => s + t.sponsorshipIncome, 0),
    byTeam,
  };
}
