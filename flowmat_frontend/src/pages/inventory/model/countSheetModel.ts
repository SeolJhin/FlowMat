import type { InventoryDto } from '../../../shared/types/api'
import { parseCsv } from './itemCsvModel'
import { csvCell } from './ledgerModel'

/**
 * A count sheet for counting on paper or in a spreadsheet (docs/domain/stock-count.md "실사표"): one line per record
 * with an empty counted column. A blind sheet leaves out what is on hand so the count is not steered by it.
 */
export function countSheetCsv(rows: InventoryDto[], itemLabel: (itemId: string) => string, blind: boolean): string {
  const header = ['inventory_id', 'item', 'lot', 'location', ...(blind ? [] : ['on_hand']), 'counted']
  const lines = rows.map((row) =>
    [row.inventoryId, itemLabel(row.itemId), row.lotNo, row.location, ...(blind ? [] : [row.quantity]), null].map(csvCell).join(','),
  )
  return '\ufeff' + [header.join(','), ...lines].join('\r\n') + '\r\n'
}

export type SheetResult =
  | { ok: true; entries: Record<string, string>; filled: number; unknown: number }
  | { ok: false; error: string }

/**
 * What a filled count sheet says was counted, by record. Lines with an empty counted cell are left out (not counted);
 * records that are not in the list any more are skipped and counted in {@code unknown}. The values are checked when the
 * count is applied, like typed ones.
 */
export function entriesFromSheet(text: string, known: Set<string>): SheetResult {
  const [header, ...data] = parseCsv(text)
  if (!header) return { ok: false, error: 'The file is empty.' }
  const names = header.map((name) => name.trim().toLowerCase())
  const idColumn = names.indexOf('inventory_id')
  const countedColumn = names.indexOf('counted')
  if (idColumn < 0 || countedColumn < 0) return { ok: false, error: 'The sheet needs inventory_id and counted columns.' }
  const entries: Record<string, string> = {}
  let unknown = 0
  for (const cells of data) {
    const id = (cells[idColumn] ?? '').trim()
    const counted = (cells[countedColumn] ?? '').trim()
    if (!id || !counted) continue
    if (!known.has(id)) {
      unknown += 1
      continue
    }
    entries[id] = counted
  }
  const filled = Object.keys(entries).length
  if (filled === 0) return { ok: false, error: unknown ? 'None of the counted records are in the list.' : 'No counted quantities in the sheet.' }
  return { ok: true, entries, filled, unknown }
}
