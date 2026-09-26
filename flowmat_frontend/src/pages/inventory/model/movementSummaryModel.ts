import type { StockMovementSummaryLineDto } from '../../../shared/types/api'
import { csvCell } from './ledgerModel'

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** The first day of this month and today, as local dates for the date inputs. */
export function defaultPeriod(today: Date = new Date()): { fromDate: string; toDate: string } {
  return { fromDate: localDate(new Date(today.getFullYear(), today.getMonth(), 1)), toDate: localDate(today) }
}

/**
 * The period from the start of {@code fromDate} to the end of {@code toDate}, both local days included: the opening
 * balance is the stock at the first moment, the closing balance the stock at the last. Null when the days are missing
 * or in the wrong order. It depends only on the dates, so the query key stays put between renders.
 */
export function periodBounds(fromDate: string, toDate: string): { from: string; to: string } | null {
  if (!fromDate || !toDate || fromDate > toDate) return null
  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  return {
    from: new Date(fy, fm - 1, fd).toISOString(),
    to: new Date(ty, tm - 1, td, 23, 59, 59, 999).toISOString(),
  }
}

/** The lines as CSV with a byte order mark, like the other stock exports. */
export function movementSummaryCsv(lines: StockMovementSummaryLineDto[]): string {
  const header = ['item_code', 'item_name', 'unit', 'opening', 'received', 'produced', 'issued', 'consumed', 'transferred', 'corrected', 'closing']
  const rows = lines.map((line) =>
    [line.itemCode, line.itemName, line.unit, line.opening, line.received, line.produced, line.issued, line.consumed, line.transferred,
      line.corrected, line.closing]
      .map(csvCell)
      .join(','),
  )
  return '\ufeff' + [header.join(','), ...rows].join('\r\n') + '\r\n'
}
