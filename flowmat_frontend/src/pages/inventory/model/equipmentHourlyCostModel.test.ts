import { describe, expect, it } from 'vitest'
import { hourlyCostInput } from './equipmentHourlyCostModel'

describe('hourly planning cost input', () => {
  it('distinguishes clearing from known zero and preserves four decimals', () => {
    expect(hourlyCostInput('  ')).toEqual({ hourlyCost: null, error: null })
    expect(hourlyCostInput('0')).toEqual({ hourlyCost: 0, error: null })
    expect(hourlyCostInput(' 12.3456 ')).toEqual({ hourlyCost: 12.3456, error: null })
    expect(hourlyCostInput('.0001')).toEqual({ hourlyCost: 0.0001, error: null })
    expect(hourlyCostInput('9999999999.9999').error).toBeNull()
  })
  it.each(['-1', '1.00001', '10000000000', '1e3', 'not a number', 'Infinity'])('refuses an invalid rate %s', (value) => {
    expect(hourlyCostInput(value).error).toContain('Hourly equipment cost')
  })
})
