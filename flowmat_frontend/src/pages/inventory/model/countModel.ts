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

/** Days after which a record is due to be counted again. */
export const COUNT_DUE_DAYS = 30

/**
 * Days between counts by the item's ABC class (docs/domain/stock-count.md "순환 실사"): the items that carry the most value
 * are counted most often. Items without a class (no unit cost or no use) keep {@link COUNT_DUE_DAYS}.
 */
export const ABC_COUNT_DAYS: Record<'A' | 'B' | 'C', number> = { A: 30, B: 90, C: 180 }

export function countIntervalDays(abcClass: 'A' | 'B' | 'C' | null | undefined): number {
  return abcClass ? ABC_COUNT_DAYS[abcClass] : COUNT_DUE_DAYS
}

/** Whether a record is due a count: never counted, or last counted more than {@code days} days before {@code now}. */
export function countDue(row: InventoryDto, now: Date = new Date(), days = COUNT_DUE_DAYS): boolean {
  if (!row.lastCheckedAt) return true
  return now.getTime() - new Date(row.lastCheckedAt).getTime() > days * 24 * 60 * 60 * 1000
}

/** The local date a record was last counted, or "never". */
export function lastCountedLabel(lastCheckedAt: string | null | undefined): string {
  if (!lastCheckedAt) return 'never'
  const at = new Date(lastCheckedAt)
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
}

/** Rows whose item, LOT or location contains the filter text, ignoring case. */
export function filterCountRows(rows: InventoryDto[], filter: string, itemLabel: (itemId: string) => string): InventoryDto[] {
  const needle = filter.trim().toLowerCase()
  if (!needle) return rows
  return rows.filter((row) =>
    [itemLabel(row.itemId), row.lotNo ?? '', row.location ?? ''].some((value) => value.toLowerCase().includes(needle)),
  )
}
