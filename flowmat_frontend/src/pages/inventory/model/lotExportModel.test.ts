import { describe, expect, it } from 'vitest'
import type { LotDto } from '../../../shared/types/api'
import { lotsCsv } from './lotExportModel'

describe('lotsCsv', () => {
  it('writes one line per LOT with the item label and whether it has expired', () => {
    const lot = {
      lotId: 'l1', projectId: 'p', itemId: 'flour', lotNo: 'L-1', serialNo: null, lotStatus: 'quarantined', receivedAt: null,
      producedAt: null, expiryDate: '2026-09-01', productionRunId: null, quantityOnHand: 4, quantityReserved: 1, expired: true,
    } as LotDto
    expect(lotsCsv([lot], () => 'FLR · Flour, fine')).toBe(
      '\ufefflot,item,status,on_hand,reserved,expiry_date,expired,received_at\r\nL-1,"FLR · Flour, fine",quarantined,4,1,2026-09-01,Y,\r\n',
    )
  })
})
