import type { InventoryTransactionDto } from '../../../shared/types/api'

/** What the Movements tab narrows the project's stock history by. Empty values mean "any". */
export interface LedgerFilter {
  type: string
  itemId: string
  /** Inclusive local dates, yyyy-mm-dd. */
  from: string
  to: string
  /** Matched by the server against the note, the reference and who recorded it. */
  text: string
}

export const EMPTY_LEDGER_FILTER: LedgerFilter = { type: '', itemId: '', from: '', to: '', text: '' }

/** Every movement type the stock commands write (docs/domain/inventory-bom-lot-contract.md §2). */
export const LEDGER_TYPES = [
  'receipt',
  'issue',
  'reserve',
  'release',
  'adjustment',
  'reversal',
  'quarantine',
  'unquarantine',
  'production_input',
  'production_output',
  'transfer_out',
  'transfer_in',
] as const

/** Local midnight of a yyyy-mm-dd day, plus whole days. */
function localMidnight(day: string, plusDays = 0): Date {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date + plusDays)
}

/**
 * The filter as GET /inventory-transactions/search parameters. Local days become instants: "from" is that day's
 * midnight and "to" the next day's midnight, which the server treats as exclusive, so both days are included whole.
 */
export function toSearchParams(filter: LedgerFilter): Record<string, string> {
  const params: Record<string, string> = {}
  if (filter.type) params.type = filter.type
  if (filter.itemId) params.itemId = filter.itemId
  if (filter.from) params.from = localMidnight(filter.from).toISOString()
  if (filter.to) params.to = localMidnight(filter.to, 1).toISOString()
  if (filter.text.trim()) params.text = filter.text.trim()
  return params
}

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * The rows as CSV (RFC 4180 quoting), newest first as shown. Starts with a byte order mark so spreadsheet programs read
 * non-ASCII names correctly.
 */
export function ledgerCsv(
  rows: InventoryTransactionDto[],
  itemLabel: (itemId: string) => string,
  place: (inventoryId: string) => string,
): string {
  const header = ['time', 'type', 'item', 'lot', 'place', 'quantity_change', 'reserved_change', 'quantity_after', 'reference_type',
    'reference_id', 'note', 'recorded_by']
  const lines = rows.map((row) =>
    [
      row.createdAt,
      row.transactionType,
      itemLabel(row.itemId),
      row.lotId,
      place(row.inventoryId),
      row.quantityDelta,
      row.reservedDelta,
      row.quantityAfter,
      row.referenceType,
      row.referenceId,
      row.note,
      row.createdBy,
    ]
      .map(csvCell)
      .join(','),
  )
  return '﻿' + [header.join(','), ...lines].join('\r\n') + '\r\n'
}
