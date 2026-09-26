import type { StockWasteDto } from '../../../shared/types/api'
import { csvCell } from './ledgerModel'

/** The waste lines as CSV, with a byte order mark like the other stock exports. */
export function wasteCsv(lines: StockWasteDto['lines']): string {
  const header = ['item_code', 'item_name', 'unit', 'expired', 'defects', 'count_losses', 'total', 'value']
  const rows = lines.map((line) =>
    [line.itemCode, line.itemName, line.unit, line.expired, line.defect, line.countLoss, line.total, line.value].map(csvCell).join(','),
  )
  return '\ufeff' + [header.join(','), ...rows].join('\r\n') + '\r\n'
}
