import { StockItem } from '../types';

export interface StockSummary {
  total: number;
  ok: number;
  low: number;
  out: number;
  lowItems: StockItem[];
}

export function summarizeStock(items: StockItem[]): StockSummary {
  const lowItems: StockItem[] = [];
  let ok = 0;
  let low = 0;
  let out = 0;

  for (const item of items) {
    if (item.quantity <= 0) {
      out++;
      lowItems.push(item);
    } else if (item.quantity <= item.lowStockThreshold) {
      low++;
      lowItems.push(item);
    } else {
      ok++;
    }
  }

  return { total: items.length, ok, low, out, lowItems };
}

export function isStockAlert(item: StockItem): boolean {
  return item.quantity <= item.lowStockThreshold;
}
