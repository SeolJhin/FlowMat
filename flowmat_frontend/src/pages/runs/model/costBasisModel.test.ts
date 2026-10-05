import { describe, expect, it } from 'vitest'
import { costBasisLabel } from './costBasisModel'
describe('cost certainty shown to the operator', () => {
  it('labels an ongoing price as current', () => {
    expect(costBasisLabel({ costBasis: 'CURRENT' })).toBe('Current item prices.')
  })
  it('uses the original finish date for a known historical price', () => {
    expect(costBasisLabel({ costBasis: 'HISTORICAL', costBasisAt: '2030-01-01T00:00:00Z' })).toContain('Prices at original finish:')
  })
  it('never claims a historical price when the end time is unknown', () => {
    expect(costBasisLabel({ costBasis: 'ESTIMATED', costBasisAt: null })).toContain('original finish time is unknown')
  })
  it('marks missing price history separately from missing prices', () => {
    expect(costBasisLabel({ costBasis: 'ESTIMATED', costBasisAt: '2030-01-01T00:00:00Z' })).toContain('price history is missing')
  })
  it('does not invent a price basis for an older API response', () => {
    expect(costBasisLabel({})).toBe('Price basis unavailable.')
  })
})
