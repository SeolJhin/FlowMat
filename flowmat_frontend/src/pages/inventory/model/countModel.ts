import type { InventoryDto } from '../../../shared/types/api'

/** One counted record as sent to POST /inventory-counts (docs/domain/stock-count.md). */
export interface CountLine {
  inventoryId: string
  countedQuantity: number
  /** What the counter saw on hand; the server refuses the count if the stock moved since. */
  expectedQuantity: number
}

export type CountResult = { ok: true; lines: CountLine[] } | { ok: false; error: string }

/**
 * Turns what was typed per record into count lines. Records left blank are not counted; a counted value must be a number
 * of 0 or more. The quantity shown when counting started goes along, so a record that moved meanwhile is not overwritten.
 */
export function buildCountLines(entries: Record<string, string>, rows: InventoryDto[]): CountResult {
  const lines: CountLine[] = []
  for (const row of rows) {
    const text = (entries[row.inventoryId] ?? '').trim()
    if (!text) continue
    const counted = Number(text)
    if (!Number.isFinite(counted) || counted < 0) {
      return { ok: false, error: `"${text}" is not a count; use a number of 0 or more.` }
    }
    lines.push({ inventoryId: row.inventoryId, countedQuantity: counted, expectedQuantity: row.quantity })
  }
  if (lines.length === 0) return { ok: false, error: 'Enter at least one counted quantity.' }
  return { ok: true, lines }
}

/** The difference a typed count would make, or null when nothing (valid) is typed. */
export function countDifference(entry: string | undefined, onHand: number): number | null {
  const text = (entry ?? '').trim()
  if (!text) return null
  const counted = Number(text)
  return Number.isFinite(counted) && counted >= 0 ? counted - onHand : null
}

/** Rows whose item, LOT or location contains the filter text, ignoring case. */
export function filterCountRows(rows: InventoryDto[], filter: string, itemLabel: (itemId: string) => string): InventoryDto[] {
  const needle = filter.trim().toLowerCase()
  if (!needle) return rows
  return rows.filter((row) =>
    [itemLabel(row.itemId), row.lotNo ?? '', row.location ?? ''].some((value) => value.toLowerCase().includes(needle)),
  )
}
