import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportAccountingCsv } from '../accountingExport';
import { BudgetItemCategory, IncomeCategory, EventBudgetItem, IncomeItem, RaceEvent } from '../../types';

describe('exportAccountingCsv', () => {
  beforeEach(() => {
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = { href: '', download: '', click, remove };
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exports CSV with headers and sorted rows', () => {
    const anchor = document.createElement('a') as HTMLAnchorElement & { remove: () => void };
    const click = vi.spyOn(anchor, 'click');
    const remove = vi.spyOn(anchor, 'remove');
    vi.mocked(document.createElement).mockReturnValue(anchor as unknown as HTMLElement);

    const budgetItems: EventBudgetItem[] = [
      {
        id: 'b1',
        category: BudgetItemCategory.HEBERGEMENT,
        description: 'Hotel',
        estimatedCost: 500,
        eventId: 'ev1',
      },
    ];

    const incomeItems: IncomeItem[] = [
      {
        id: 'i1',
        description: 'Sponsor',
        amount: 1000,
        date: '2026-03-01',
        category: IncomeCategory.SPONSORING,
        sponsorshipContactName: 'Jean Dupont',
        sponsorshipContractStart: '2026-01-01',
      },
    ];

    const raceEvents: RaceEvent[] = [
      { id: 'ev1', name: 'Tour de France', date: '2026-07-01' } as RaceEvent,
    ];

    exportAccountingCsv('Team Test', budgetItems, incomeItems, { raceEvents });

    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(anchor.download).toContain('LogiCycle_Compta_Team_Test');
  });
});
