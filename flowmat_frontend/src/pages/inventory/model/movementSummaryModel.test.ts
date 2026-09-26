import { describe, expect, it } from 'vitest'
import type { StockMovementSummaryLineDto } from '../../../shared/types/api'
import { defaultPeriod, movementSummaryCsv, periodBounds } from './movementSummaryModel'

describe('periods', () => {
  it('defaults to this month so far', () => {
    expect(defaultPeriod(new Date(2026, 8, 25, 15))).toEqual({ fromDate: '2026-09-01', toDate: '2026-09-25' })
  })

  it('runs from the start of the first day to the end of the last, or not at all when backwards', () => {
    expect(periodBounds('2026-09-01', '2026-09-25')).toEqual({
      from: new Date(2026, 8, 1).toISOString(),
      to: new Date(2026, 8, 25, 23, 59, 59, 999).toISOString(),
    })
    expect(periodBounds('2026-09-25', '2026-09-25')).not.toBeNull()
    expect(periodBounds('2026-09-26', '2026-09-25')).toBeNull()
    expect(periodBounds('', '2026-09-25')).toBeNull()
  })
})

describe('movementSummaryCsv', () => {
  it('writes one line per item after the header', () => {
    const line: StockMovementSummaryLineDto = {
      itemId: 'f', itemCode: 'FLR', itemName: 'Flour, fine', unit: 'kg', opening: 10, received: 5, produced: 0, issued: 3, consumed: 0,
      transferred: 0, corrected: 3, closing: 15, unexplained: 0,
    }
    expect(movementSummaryCsv([line])).toBe(
      '\ufeffitem_code,item_name,unit,opening,received,produced,issued,consumed,transferred,corrected,closing\r\nFLR,"Flour, fine",kg,10,5,0,3,0,0,3,15\r\n',
    )
  })
})
