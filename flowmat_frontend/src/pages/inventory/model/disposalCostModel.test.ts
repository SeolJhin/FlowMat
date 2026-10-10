import { describe, expect, it } from 'vitest'
import { disposalChangeText, disposalCostInput } from './disposalCostModel'

describe('disposalCostInput', () => {
  it('clears on blank and keeps zero as a known cost', () => {
    expect(disposalCostInput('  ')).toEqual({ disposalCost: null, error: null })
    expect(disposalCostInput('0')).toEqual({ disposalCost: 0, error: null })
    expect(disposalCostInput('12.3456')).toEqual({ disposalCost: 12.3456, error: null })
    expect(disposalCostInput('.5')).toEqual({ disposalCost: 0.5, error: null })
  })

  it('describes a change with unknown and free costs', () => {
    expect(disposalChangeText({ previousDisposalCost: null, disposalCost: 2.5 }, String)).toBe('not set → 2.5')
    expect(disposalChangeText({ previousDisposalCost: 2.5, disposalCost: 0 }, String)).toBe('2.5 → free')
  })

  it('refuses negative, too precise or too large numbers', () => {
    for (const text of ['-1', '1.23456', '12345678901', 'abc', '1e3']) {
      expect(disposalCostInput(text).error).toContain('Disposal cost needs')
    }
  })
})
