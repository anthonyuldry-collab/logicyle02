import { describe, expect, it } from 'vitest';
import {
  CounterpartDeliverableStatus,
} from '../../types';
import {
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
});
