import { describe, expect, it } from 'vitest'
import type { LotRecallLineDto } from '../../../shared/types/api'
import { recallCsv, recallTotals } from './recallModel'

const line = (lotNo: string, fields: Partial<LotRecallLineDto> = {}): LotRecallLineDto => ({
  lotId: lotNo, lotNo, itemId: 'i', itemCode: 'FLR', itemName: 'Flour', unit: 'kg', depth: 0, viaLotNo: null, lotStatus: 'available',
  onHand: 0, places: [], issued: 0, ...fields,
})

describe('recall', () => {
  it('counts what still holds stock, what left and what is held', () => {
    const lines = [
      line('L1', { onHand: 15, places: ['A 15'] }),
      line('L2', { depth: 1, viaLotNo: 'L1', onHand: 2, issued: 1, lotStatus: 'quarantined' }),
      line('L3', { depth: 2, viaLotNo: 'L2', issued: 3 }),
    ]
    expect(recallTotals(lines)).toEqual({ lots: 3, holding: 2, shipped: 2, quarantined: 1 })
  })

  it('writes one line per LOT with its places joined', () => {
    const csv = recallCsv([line('L1', { onHand: 15, places: ['A 10', 'B 5'] })])
    expect(csv).toBe('\ufeffdepth,lot,item_code,item_name,status,on_hand,unit,where,issued,made_from\r\n0,L1,FLR,Flour,available,15,kg,A 10; B 5,0,\r\n')
  })
})
