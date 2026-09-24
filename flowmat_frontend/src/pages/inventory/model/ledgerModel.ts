import type { InventoryTransactionDto } from '../../../shared/types/api'

/** What the Movements tab narrows the project's stock history by. Empty values mean "any". */
export interface LedgerFilter {
  type: string
  itemId: string
  /** Inclusive local dates, yyyy-mm-dd. */
  from: string
  to: string
  /** Matched against the note, the reference and who recorded it. */
  text: string
}

export const EMPTY_LEDGER_FILTER: LedgerFilter = { type: '', itemId: '', from: '', to: '', text: '' }

function localDate(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function filterLedger(rows: InventoryTransactionDto[], filter: LedgerFilter): InventoryTransactionDto[] {
  const needle = filter.text.trim().toLowerCase()
  return rows.filter((row) => {
    if (filter.type && row.transactionType !== filter.type) return false
    if (filter.itemId && row.itemId !== filter.itemId) return false
    if (filter.from || filter.to) {
      // Rows written without a time cannot be placed in a date range.
      if (!row.createdAt) return false
      const day = localDate(row.createdAt)
      if (filter.from && day < filter.from) return false
      if (filter.to && day > filter.to) return false
    }
    if (needle) {
      const haystack = [row.note, row.referenceType, row.referenceId, row.createdBy].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

/** Movement types present in the history, for the filter list. */
export function ledgerTypes(rows: InventoryTransactionDto[]): string[] {
  return [...new Set(rows.map((row) => row.transactionType))].sort()
}

function csvCell(value: string | number | null | undefined): string {
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
