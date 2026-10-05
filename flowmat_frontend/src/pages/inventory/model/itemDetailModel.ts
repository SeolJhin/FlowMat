import type { InventoryDto } from '../../../shared/types/api'

export interface ItemStockSummary {
  records: number
  onHand: number
  reserved: number
  /** On hand in quarantined records, which cannot be used. */
  quarantined: number
  locations: number
}

/** One item's stock records added up. */
export function summariseItemStock(rows: InventoryDto[], itemId: string): ItemStockSummary {
  const mine = rows.filter((row) => row.itemId === itemId)
  return {
    records: mine.length,
    onHand: mine.reduce((sum, row) => sum + row.quantity, 0),
    reserved: mine.reduce((sum, row) => sum + row.reservedQuantity, 0),
    quarantined: mine.filter((row) => row.inventoryStatus === 'quarantined').reduce((sum, row) => sum + row.quantity, 0),
    locations: new Set(mine.map((row) => row.location ?? '')).size,
  }
}

/** "2 → 3.5", with "unknown" for no cost or 0 (docs/domain/material-cost.md "단가 이력"). */
export function costChangeText(
  change: { previousUnitCost: number | null; unitCost: number | null },
  format: (value: number) => string,
): string {
  const cost = (value: number | null) => (value === null || value === 0 ? 'unknown' : format(value))
  return `${cost(change.previousUnitCost)} → ${cost(change.unitCost)}`
}
