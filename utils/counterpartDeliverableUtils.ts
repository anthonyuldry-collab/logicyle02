import { CounterpartDeliverableStatus, PartnerCounterpartDeliverable } from '../types';

export const COUNTERPART_DELIVERABLE_STATUSES = Object.values(CounterpartDeliverableStatus);

export const COMPLETED_COUNTERPART_DELIVERABLE_STATUSES = new Set<CounterpartDeliverableStatus>([
  CounterpartDeliverableStatus.DELIVERED,
  CounterpartDeliverableStatus.VALIDATED,
]);

export function normalizeCounterpartDeliverableStatus(
  value: unknown,
): CounterpartDeliverableStatus {
  if (
    typeof value === 'string'
    && COUNTERPART_DELIVERABLE_STATUSES.includes(value as CounterpartDeliverableStatus)
  ) {
    return value as CounterpartDeliverableStatus;
  }
  return CounterpartDeliverableStatus.PLANNED;
}

export function normalizePartnerCounterpartDeliverable(
  item: PartnerCounterpartDeliverable,
): PartnerCounterpartDeliverable {
  return {
    ...item,
    status: normalizeCounterpartDeliverableStatus(item.status),
  };
}

export function isCounterpartDeliverableComplete(
  status: CounterpartDeliverableStatus | string,
): boolean {
  return COMPLETED_COUNTERPART_DELIVERABLE_STATUSES.has(
    normalizeCounterpartDeliverableStatus(status),
  );
}
