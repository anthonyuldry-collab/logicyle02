import { EquipmentStockItem, StockItem } from '../types';

/** Normalise un code-barres (EAN/GTIN) scanné ou saisi */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isValidBarcode(code: string): boolean {
  return normalizeBarcode(code).length >= 8;
}

export function findStockItemByBarcode(items: StockItem[], barcode: string): StockItem | undefined {
  const code = normalizeBarcode(barcode);
  if (!code) return undefined;
  return items.find(item => item.barcode && normalizeBarcode(item.barcode) === code);
}

export function findEquipmentStockByBarcode(
  items: EquipmentStockItem[],
  barcode: string,
): EquipmentStockItem | undefined {
  const code = normalizeBarcode(barcode);
  if (!code) return undefined;
  return items.find(item => item.barcode && normalizeBarcode(item.barcode) === code);
}
