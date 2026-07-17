import { StockItem, StockMovement, StockMovementReason, Warehouse, WarehouseType } from '../types';

export const DEFAULT_WAREHOUSES: Omit<Warehouse, 'id'>[] = [
  { name: 'Base équipe', type: 'base', isDefault: true },
  { name: 'Camion logistique', type: 'camion' },
  { name: 'Atelier', type: 'atelier' },
];

export function createDefaultWarehouses(): Warehouse[] {
  return DEFAULT_WAREHOUSES.map((w, i) => ({
    ...w,
    id: `wh-default-${i}`,
  }));
}

export function getDefaultWarehouse(warehouses: Warehouse[]): Warehouse | undefined {
  return warehouses.find((w) => w.isDefault) || warehouses[0];
}

export function getStockQuantityAtWarehouse(item: StockItem, warehouseId: string): number {
  if (item.quantities && warehouseId in item.quantities) {
    return item.quantities[warehouseId] ?? 0;
  }
  const defaultWh = Object.keys(item.quantities || {})[0];
  if (!defaultWh && item.quantity != null) return item.quantity;
  return 0;
}

export function getTotalStockQuantity(item: StockItem): number {
  if (item.quantities && Object.keys(item.quantities).length > 0) {
    return Object.values(item.quantities).reduce((s, q) => s + q, 0);
  }
  return item.quantity ?? 0;
}

export function syncStockTotal(item: StockItem): StockItem {
  const total = getTotalStockQuantity(item);
  return { ...item, quantity: total };
}

export function applyStockDelta(
  item: StockItem,
  warehouseId: string,
  delta: number
): StockItem {
  const quantities = { ...(item.quantities || {}) };
  const current = getStockQuantityAtWarehouse(item, warehouseId);
  quantities[warehouseId] = Math.max(0, current + delta);
  return syncStockTotal({ ...item, quantities });
}

export function transferStock(
  item: StockItem,
  fromWarehouseId: string,
  toWarehouseId: string,
  amount: number
): StockItem | null {
  const fromQty = getStockQuantityAtWarehouse(item, fromWarehouseId);
  if (amount <= 0 || fromQty < amount) return null;
  let updated = applyStockDelta(item, fromWarehouseId, -amount);
  updated = applyStockDelta(updated, toWarehouseId, amount);
  return updated;
}

export function buildStockMovement(params: {
  item: StockItem;
  warehouse: Warehouse;
  delta: number;
  reason: StockMovementReason;
  userId?: string;
  userName?: string;
  eventId?: string;
  scannedBarcode?: string;
  transferToWarehouseId?: string;
  notes?: string;
}): StockMovement {
  const qtyAfter = getStockQuantityAtWarehouse(params.item, params.warehouse.id) + params.delta;
  return {
    id: `sm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    itemId: params.item.id,
    itemName: params.item.name,
    warehouseId: params.warehouse.id,
    warehouseName: params.warehouse.name,
    delta: params.delta,
    quantityAfter: Math.max(0, qtyAfter),
    reason: params.reason,
    userId: params.userId,
    userName: params.userName,
    eventId: params.eventId,
    scannedBarcode: params.scannedBarcode,
    transferToWarehouseId: params.transferToWarehouseId,
    notes: params.notes,
    createdAt: new Date().toISOString(),
  };
}

export function getWarehouseTypeLabel(type: WarehouseType, language: 'fr' | 'en' = 'fr'): string {
  const labels: Record<WarehouseType, { fr: string; en: string }> = {
    base: { fr: 'Base', en: 'Base' },
    camion: { fr: 'Camion', en: 'Truck' },
    hotel: { fr: 'Hôtel', en: 'Hotel' },
    course: { fr: 'Course', en: 'Race' },
    atelier: { fr: 'Atelier', en: 'Workshop' },
  };
  return labels[type][language];
}

export function summarizeWarehouses(
  items: StockItem[],
  warehouses: Warehouse[]
) {
  return warehouses.map((wh) => {
    const whItems = items.filter((i) => getStockQuantityAtWarehouse(i, wh.id) > 0);
    const totalUnits = whItems.reduce(
      (s, i) => s + getStockQuantityAtWarehouse(i, wh.id),
      0
    );
    const lowStock = whItems.filter(
      (i) => getStockQuantityAtWarehouse(i, wh.id) <= i.lowStockThreshold
    );
    return {
      warehouse: wh,
      itemCount: whItems.length,
      totalUnits,
      lowStockCount: lowStock.length,
    };
  });
}

const MOVEMENT_REASON_LABELS: Record<string, { fr: string; en: string }> = {
  scan_in: { fr: 'Entrée scan', en: 'Scan in' },
  scan_out: { fr: 'Sortie scan', en: 'Scan out' },
  inventory: { fr: 'Inventaire', en: 'Inventory' },
  transfer: { fr: 'Transfert', en: 'Transfer' },
  manual: { fr: 'Manuel', en: 'Manual' },
  event_consumption: { fr: 'Consommation course', en: 'Race consumption' },
};

export function exportStockMovementsCsv(
  movements: import('../types').StockMovement[],
  teamName: string,
  language: 'fr' | 'en' = 'fr'
): void {
  if (movements.length === 0) return;

  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = language === 'fr'
    ? 'Date,Article,Entrepôt,Variation,Motif,Code-barres,Notes'
    : 'Date,Item,Warehouse,Delta,Reason,Barcode,Notes';

  const lines = [
    header,
    ...movements.map((m) =>
      [
        new Date(m.createdAt).toISOString(),
        m.itemName,
        m.warehouseName,
        m.delta,
        MOVEMENT_REASON_LABELS[m.reason]?.[language] || m.reason,
        m.scannedBarcode || '',
        m.notes || '',
      ]
        .map(escape)
        .join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LogiCycle_Stocks_${teamName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
