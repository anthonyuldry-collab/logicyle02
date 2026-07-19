import { describe, expect, it } from 'vitest';
import {
  CounterpartDeliverableStatus,
  IncomeCategory,
} from '../../types';
import {
  buildSuggestedDeliverables,
  formatDeliverablesAsContractText,
  isCounterpartDeliverableComplete,
  normalizeCounterpartDeliverableStatus,
  normalizePartnerCounterpartDeliverable,
} from '../counterpartDeliverableUtils';

describe('counterpartDeliverableUtils', () => {
  it('normalise les statuts legacy invalides vers planned', () => {
    expect(normalizeCounterpartDeliverableStatus('unknown')).toBe(CounterpartDeliverableStatus.PLANNED);
    expect(normalizeCounterpartDeliverableStatus(CounterpartDeliverableStatus.DELIVERED))
      .toBe(CounterpartDeliverableStatus.DELIVERED);
  });

  it('normalise un livrable complet', () => {
    const normalized = normalizePartnerCounterpartDeliverable({
      id: 'd1',
      label: 'Logo',
      status: 'delivered' as CounterpartDeliverableStatus,
    });
    expect(normalized.status).toBe(CounterpartDeliverableStatus.DELIVERED);
  });

  it('détecte les livrables terminés', () => {
    expect(isCounterpartDeliverableComplete(CounterpartDeliverableStatus.VALIDATED)).toBe(true);
    expect(isCounterpartDeliverableComplete(CounterpartDeliverableStatus.IN_PROGRESS)).toBe(false);
  });

  it('formate un texte contractuel groupé par catégorie', () => {
    const text = formatDeliverablesAsContractText([
      {
        id: '1',
        label: 'Logo Partenaire sur maillot — emplacement poitrine',
        status: CounterpartDeliverableStatus.PLANNED,
        category: 'kit',
        quantity: 1,
        unit: 'emplacement',
        placement: 'Poitrine',
        channel: 'Maillot',
        frequency: 'par tenue',
      },
      {
        id: '2',
        label: 'Publications réseaux sociaux dédiées',
        status: CounterpartDeliverableStatus.PLANNED,
        category: 'digital',
        quantity: 2,
        unit: 'publications',
        frequency: 'par mois',
        channel: 'Instagram',
      },
    ]);
    expect(text).toContain('Tenues & équipements');
    expect(text).toContain('Digital & réseaux sociaux');
    expect(text).toContain('1 emplacement');
    expect(text).toContain('2 publications');
  });

  it('propose un pack type sponsoring', () => {
    const pack = buildSuggestedDeliverables(IncomeCategory.SPONSORING, 'fr');
    expect(pack.length).toBeGreaterThan(3);
    expect(pack.every((d) => d.label && d.category)).toBe(true);
  });
});
