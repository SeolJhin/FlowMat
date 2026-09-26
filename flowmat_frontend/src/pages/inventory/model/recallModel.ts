import type { LotRecallLineDto } from '../../../shared/types/api'
import { csvCell } from './ledgerModel'

/** The recall list as CSV for passing on, with a byte order mark like the other stock exports. */
export function recallCsv(lines: LotRecallLineDto[]): string {
  const header = ['depth', 'lot', 'item_code', 'item_name', 'status', 'on_hand', 'unit', 'where', 'issued', 'made_from']
  const rows = lines.map((line) =>
    [line.depth, line.lotNo, line.itemCode, line.itemName, line.lotStatus, line.onHand, line.unit, line.places.join('; '), line.issued, line.viaLotNo]
      .map(csvCell)
      .join(','),
  )
  return '\ufeff' + [header.join(','), ...rows].join('\r\n') + '\r\n'
}

/** Headline numbers: LOTs affected, how many still hold stock, how many already sent some out, how many are held. */
export function recallTotals(lines: LotRecallLineDto[]) {
  return {
    lots: lines.length,
    holding: lines.filter((line) => line.onHand > 0).length,
    shipped: lines.filter((line) => line.issued > 0).length,
    quarantined: lines.filter((line) => line.lotStatus === 'quarantined').length,
  }
}
