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

export interface SnapshotLocationTotal {
  /** Null for records without a location. */
  location: string | null
  records: number
  /** Different items held there. */
  items: number
  /** What the costed records are worth; quantities of different items do not add up, so there is no quantity. */
  value: number
  /** Records whose item has no unit cost, left out of the value. */
  uncosted: number
}

/** Records, items and value per key, in key order with the records without a key last. */
function totalsBy(rows: StockSnapshotRowDto[], keyOf: (row: StockSnapshotRowDto) => string | null) {
  const totals = new Map<string | null, { key: string | null; records: number; value: number; uncosted: number; itemIds: Set<string> }>()
  for (const row of rows) {
    const key = keyOf(row)
    const total = totals.get(key) ?? { key, records: 0, value: 0, uncosted: 0, itemIds: new Set<string>() }
    total.records += 1
    total.itemIds.add(row.itemId)
    if (row.value === null) total.uncosted += 1
    else total.value += row.value
    totals.set(key, total)
  }
  return [...totals.values()]
    .map(({ itemIds, ...total }) => ({ ...total, items: itemIds.size }))
    .sort((a, b) => (a.key === null ? 1 : b.key === null ? -1 : a.key.localeCompare(b.key)))
}

/** The records added up per location, in location order with the records without one last. */
export function totalsByLocation(rows: StockSnapshotRowDto[]): SnapshotLocationTotal[] {
  return totalsBy(rows, (row) => row.location).map(({ key, ...total }) => ({ location: key, ...total }))
}

export interface SnapshotGroupTotal extends Omit<SnapshotLocationTotal, 'location'> {
  /** The item group (docs/domain/item-details.md); null for items without one. */
  group: string | null
}

/** The records added up per item group, in group order with the items without a group last. */
export function totalsByItemGroup(rows: StockSnapshotRowDto[], groupOf: (itemId: string) => string | null): SnapshotGroupTotal[] {
  return totalsBy(rows, (row) => groupOf(row.itemId)).map(({ key, ...total }) => ({ group: key, ...total }))
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
