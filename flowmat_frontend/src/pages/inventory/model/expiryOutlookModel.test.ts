import { describe, expect, it } from 'vitest'
import type { LotDto } from '../../../shared/types/api'
import { expiryOutlook } from './expiryOutlookModel'

const lot = (lotNo: string, expiryDate: string | null, fields: Partial<LotDto> = {}) =>
  ({ lotId: lotNo, lotNo, itemId: 'i', lotStatus: 'available', expiryDate, quantityOnHand: 1, quantityReserved: 0, ...fields }) as LotDto

describe('expiryOutlook', () => {
  it('puts LOTs with stock into expired, the next weeks from today, or later', () => {
    const today = new Date(2026, 8, 26)
    const outlook = expiryOutlook(
      [
        lot('LATE', '2026-12-01'),
        lot('OLD', '2026-09-20'),
        lot('TODAY', '2026-09-26'),
        lot('WEEK1-END', '2026-10-02'),
        lot('WEEK2', '2026-10-03'),
        lot('EMPTY', '2026-09-27', { quantityOnHand: 0 }),
        lot('SHUT', '2026-09-27', { lotStatus: 'closed' }),
        lot('UNDATED', null),
      ],
      today,
      2,
    )
    expect(outlook.expired.map((l) => l.lotNo)).toEqual(['OLD'])
    expect(outlook.weeks).toEqual([
      { from: '2026-09-26', to: '2026-10-02', lots: [expect.objectContaining({ lotNo: 'TODAY' }), expect.objectContaining({ lotNo: 'WEEK1-END' })] },
      { from: '2026-10-03', to: '2026-10-09', lots: [expect.objectContaining({ lotNo: 'WEEK2' })] },
    ])
    expect(outlook.later).toBe(1)
  })
})
