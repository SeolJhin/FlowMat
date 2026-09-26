import { describe, expect, it } from 'vitest'
import { trendMoments, withChanges } from './valueTrendModel'

describe('trendMoments', () => {
  it('takes the last month ends, oldest first, then today, across a year end', () => {
    const moments = trendMoments(3, new Date(2027, 1, 10, 15))
    expect(moments.map((moment) => moment.label)).toEqual(['2026-11', '2026-12', '2027-01', 'today'])
    expect(moments[1].at).toBe(new Date(2026, 11, 31, 23, 59, 59, 999).toISOString())
    expect(moments[2].at).toBe(new Date(2027, 0, 31, 23, 59, 59, 999).toISOString())
    expect(moments[3].at).toBe(new Date(2027, 1, 10, 23, 59, 59, 999).toISOString())
  })

  it('is the same all day', () => {
    expect(trendMoments(2, new Date(2026, 8, 25, 0, 1))).toEqual(trendMoments(2, new Date(2026, 8, 25, 23, 59)))
  })
})

describe('withChanges', () => {
  it('gives each value its change from the one before', () => {
    expect(withChanges([100, 120, null, 90])).toEqual([
      { value: 100, change: null },
      { value: 120, change: 20 },
      { value: null, change: null },
      { value: 90, change: null },
    ])
  })
})
