import { describe, it, expect } from 'vitest';
import {
  buildNewsletterFromTemplate,
  filterNewslettersForPartner,
  deliverableProgress,
} from '../partnerNewsletterUtils';
import { PartnerNewsletter, CounterpartDeliverableStatus } from '../../types';

describe('partnerNewsletterUtils', () => {
  it('buildNewsletterFromTemplate sponsor_spotlight', () => {
    const built = buildNewsletterFromTemplate('sponsor_spotlight', {
      teamName: 'Team Test',
      sponsorName: 'Sponsor SA',
      riders: [{ id: 'r1', firstName: 'Jean', lastName: 'Dupont' } as never],
      language: 'fr',
    });
    expect(built.blocks.some((b) => b.type === 'sponsorSpotlight')).toBe(true);
  });

  it('buildNewsletterFromTemplate rider_interview', () => {
    const built = buildNewsletterFromTemplate('rider_interview', {
      teamName: 'Team Test',
      sponsorName: 'Sponsor SA',
      riders: [{ id: 'r1', firstName: 'Jean', lastName: 'Dupont' } as never],
      language: 'fr',
    });
    expect(built.title).toContain('Jean');
    expect(built.blocks.some((b) => b.type === 'interview')).toBe(true);
  });

  it('buildNewsletterFromTemplate season_calendar', () => {
    const built = buildNewsletterFromTemplate('season_calendar', {
      teamName: 'Team Test',
      sponsorName: 'Sponsor SA',
      events: [{ id: 'e1', name: 'Paris-Roubaix', date: '2026-12-01' } as never],
      language: 'fr',
    });
    expect(built.title).toContain('Team Test');
    expect(built.blocks.length).toBeGreaterThan(1);
    expect(built.blocks.some((b) => b.type === 'eventList')).toBe(true);
  });

  it('filterNewslettersForPartner respects incomeItemId', () => {
    const newsletters: PartnerNewsletter[] = [
      {
        id: 'n1',
        teamId: 't1',
        incomeItemId: 'i1',
        title: 'A',
        subject: 'A',
        blocks: [],
        status: 'published',
        createdAt: '2026-01-01',
        publishedAt: '2026-01-01',
      },
      {
        id: 'n2',
        teamId: 't1',
        incomeItemId: 'i2',
        title: 'B',
        subject: 'B',
        blocks: [],
        status: 'published',
        createdAt: '2026-01-02',
        publishedAt: '2026-01-02',
      },
    ];
    const filtered = filterNewslettersForPartner(newsletters, 't1', 'i1');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('n1');
  });

  it('deliverableProgress computes percent', () => {
    const stats = deliverableProgress([
      { id: '1', label: 'A', status: CounterpartDeliverableStatus.VALIDATED },
      { id: '2', label: 'B', status: CounterpartDeliverableStatus.PLANNED },
    ]);
    expect(stats.percent).toBe(50);
  });
});
