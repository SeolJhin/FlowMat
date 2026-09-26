import type { LotDto } from '../../../shared/types/api'
import { csvCell } from './ledgerModel'

/** The LOTs as listed (after the filters) as CSV, with a byte order mark like the other stock exports. */
export function lotsCsv(lots: LotDto[], itemLabel: (itemId: string) => string): string {
  const header = ['lot', 'item', 'status', 'on_hand', 'reserved', 'expiry_date', 'expired', 'received_at']
  const rows = lots.map((lot) =>
    [lot.lotNo, itemLabel(lot.itemId), lot.lotStatus, lot.quantityOnHand, lot.quantityReserved, lot.expiryDate, lot.expired ? 'Y' : 'N', lot.receivedAt]
      .map(csvCell)
      .join(','),
  )
  return '\ufeff' + [header.join(','), ...rows].join('\r\n') + '\r\n'
}
