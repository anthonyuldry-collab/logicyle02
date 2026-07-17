import { EventBudgetItem, IncomeCategory, IncomeItem, RaceEvent } from '../types';

/** Coût effectif d'une ligne budget (aligné dashboard + pilotage financier). */
export function getBudgetItemCost(item: EventBudgetItem): number {
  const estimated = typeof item.estimatedCost === 'number' && !isNaN(item.estimatedCost) ? item.estimatedCost : 0;
  const actual = typeof item.actualCost === 'number' && !isNaN(item.actualCost) ? item.actualCost : 0;
  return actual > 0 ? actual : estimated;
}

export function calculateTotalIncome(incomeItems: IncomeItem[]): number {
  return incomeItems.reduce((sum, item) => {
    if (typeof item.amount === 'number' && !isNaN(item.amount)) {
      return sum + item.amount;
    }
    return sum;
  }, 0);
}

export function calculateTotalExpenses(budgetItems: EventBudgetItem[]): number {
  return budgetItems.reduce((sum, item) => sum + getBudgetItemCost(item), 0);
}

export function calculateFinancialBalance(incomeItems: IncomeItem[], budgetItems: EventBudgetItem[]): number {
  return calculateTotalIncome(incomeItems) - calculateTotalExpenses(budgetItems);
}

export function groupIncomeByCategory(incomeItems: IncomeItem[]): Record<string, number> {
  const categories: Record<string, number> = {};
  incomeItems.forEach((item) => {
    if (item.category && typeof item.amount === 'number' && !isNaN(item.amount)) {
      categories[item.category] = (categories[item.category] || 0) + item.amount;
    }
  });
  return categories;
}

export function groupExpensesByCategory(budgetItems: EventBudgetItem[]): Record<string, number> {
  const categories: Record<string, number> = {};
  budgetItems.forEach((item) => {
    if (item.category) {
      const cost = getBudgetItemCost(item);
      if (cost > 0) {
        categories[item.category] = (categories[item.category] || 0) + cost;
      }
    }
  });
  return categories;
}

export const SPONSORSHIP_INCOME_CATEGORIES: IncomeCategory[] = [
  IncomeCategory.SPONSORING,
  IncomeCategory.SUBVENTIONS,
  IncomeCategory.MECENAT,
];

export function isSponsorshipIncome(item: IncomeItem): boolean {
  return SPONSORSHIP_INCOME_CATEGORIES.includes(item.category);
}

export function hasContractDates(item: IncomeItem): boolean {
  return Boolean(item.sponsorshipContractStart || item.sponsorshipContractEnd);
}

export function getEventNameById(raceEvents: RaceEvent[] | undefined, eventId: string | undefined): string {
  if (!eventId) return '';
  if (!raceEvents) return eventId;
  const event = raceEvents.find((e) => e.id === eventId);
  return event?.name ?? eventId;
}

export function buildEventNameMap(raceEvents: RaceEvent[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  raceEvents?.forEach((event) => map.set(event.id, event.name));
  return map;
}

export function formatFinancialAmount(value: number, locale = 'fr-FR'): string {
  return `${value.toLocaleString(locale)} €`;
}

export function formatFinancialDate(dateString: string, locale = 'fr-FR'): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(locale);
  } catch {
    return dateString;
  }
}
