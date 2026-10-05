import { describe, expect, it } from 'vitest'
import { countPlanQuantity } from './countPlanModel'

describe('count plan measurement', () => {
  it('accepts zero and a decimal with four places', () => {
    expect(countPlanQuantity('0')).toBe(0)
    expect(countPlanQuantity(' 12.3456 ')).toBe(12.3456)
  })
  it('requires an actual measurement instead of treating a blank as zero', () => {
    expect(() => countPlanQuantity(' ')).toThrow('Enter')
  })
  it('rejects negatives, non-finite numbers and unsupported precision', () => {
    for (const value of ['-1', 'Infinity', 'NaN', '1e8', '1.12345', '10000000000']) {
      expect(() => countPlanQuantity(value)).toThrow()
    }
  })
})
