import type { StockSnapshotRowDto } from '../../../shared/types/api'
import { csvCell } from './ledgerModel'

/**
 * The end of a local day as an instant: stock "on" a date is what was there when the day closed. For today that is
 * still ahead, which the server reads as "everything so far". It depends only on the date, so the query key stays put
 * between renders.
 */
export function endOfDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString()
}

export interface SnapshotItemTotal {
  itemId: string
  itemCode: string | null
  itemName: string | null
  unit: string | null
  records: number
  quantity: number
  reservedQuantity: number
  /** Null when the item has no unit cost. */
  value: number | null
}

/** The records added up per item, in item code order. */
export function totalsByItem(rows: StockSnapshotRowDto[]): SnapshotItemTotal[] {
  const totals = new Map<string, SnapshotItemTotal>()
  for (const row of rows) {
    const total = totals.get(row.itemId) ?? {
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      unit: row.unit,
      records: 0,
      quantity: 0,
      reservedQuantity: 0,
      value: row.value === null ? null : 0,
    }
    total.records += 1
    total.quantity += row.quantity
    total.reservedQuantity += row.reservedQuantity
    total.value = total.value === null || row.value === null ? null : total.value + row.value
    totals.set(row.itemId, total)
  }
  return [...totals.values()].sort((a, b) => (a.itemCode ?? '').localeCompare(b.itemCode ?? ''))
}

/** The records as CSV, with a byte order mark like the ledger export. */
export function snapshotCsv(rows: StockSnapshotRowDto[]): string {
  const header = ['item_code', 'item_name', 'location', 'lot', 'quantity', 'reserved', 'unit', 'value']
  const lines = rows.map((row) =>
    [row.itemCode, row.itemName, row.location, row.lotNo, row.quantity, row.reservedQuantity, row.unit, row.value]
      .map(csvCell)
      .join(','),
  )
  return '\ufeff' + [header.join(','), ...lines].join('\r\n') + '\r\n'
}
