import type { InventoryDto, LotDto } from '../../../shared/types/api'

/** A stock record with its LOT. */
export interface LotRecord {
  inventory: InventoryDto
  lot: LotDto
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * The item's stock that can be issued now, first to expire first (FEFO, docs/domain/lot-expiry.md "먼저 만료되는 LOT
 * 먼저"): records with available stock of a LOT that is not closed, quarantined or expired, and not quarantined themselves.
 * By expiry date (LOTs without one last), then receipt date, then LOT number.
 */
export function fefoRecords(inventories: InventoryDto[], lots: LotDto[], itemId: string, today: Date = new Date()): LotRecord[] {
  const now = localDate(today)
  const lotById = new Map(lots.map((lot) => [lot.lotId, lot]))
  const records: LotRecord[] = []
  for (const inventory of inventories) {
    if (inventory.itemId !== itemId || inventory.availableQuantity <= 0 || inventory.inventoryStatus === 'quarantined' || !inventory.lotId) continue
    const lot = lotById.get(inventory.lotId)
    if (!lot || lot.lotStatus === 'closed' || lot.lotStatus === 'quarantined') continue
    if (lot.expiryDate !== null && lot.expiryDate < now) continue
    records.push({ inventory, lot })
  }
  const last = '9999-12-31'
  return records.sort(
    (a, b) =>
      (a.lot.expiryDate ?? last).localeCompare(b.lot.expiryDate ?? last)
      || (a.lot.receivedAt ?? last).localeCompare(b.lot.receivedAt ?? last)
      || a.lot.lotNo.localeCompare(b.lot.lotNo),
  )
}

/**
 * The record FEFO would issue before this one: the first usable record of the same item whose LOT expires strictly
 * earlier (any dated LOT counts as earlier than an undated one). Null when this record is already first, has no LOT, or
 * its own LOT has expired (then it is being written off, not used).
 */
export function earlierToIssue(record: InventoryDto, inventories: InventoryDto[], lots: LotDto[], today: Date = new Date()): LotRecord | null {
  if (!record.lotId) return null
  const own = lots.find((lot) => lot.lotId === record.lotId)
  if (!own || (own.expiryDate !== null && own.expiryDate < localDate(today))) return null
  const first = fefoRecords(inventories, lots, record.itemId, today).find((candidate) => candidate.inventory.inventoryId !== record.inventoryId)
  if (!first || first.lot.expiryDate === null) return null
  return own.expiryDate === null || first.lot.expiryDate < own.expiryDate ? first : null
}
