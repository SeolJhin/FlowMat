import { describe, expect, it } from 'vitest'
import { validBomPeriod } from './bomEffectivity'

describe('BOM calendar periods', () => {
  it('accepts open boundaries and inclusive single days without converting a time zone', () => {
    for (const [from, to] of [['', ''], ['', '2030-01-31'], ['2030-01-01', ''], ['2030-01-31', '2030-01-31']])
      expect(validBomPeriod(from, to)).toBeNull()
  })
  it('rejects nonexistent dates including century leap years and year zero', () => {
    for (const date of ['0000-01-01', '1900-02-29', '2030-02-29', '2030-04-31', '2030-00-01', '2030-01-00', '2030-13-01', '30-01-01']) {
      expect(validBomPeriod(date, '')).not.toBeNull(); expect(validBomPeriod('', date)).not.toBeNull()
    }
    expect(validBomPeriod('2000-02-29', '2000-02-29')).toBeNull()
  })
  it('rejects reversed periods', () => expect(validBomPeriod('2030-02-01', '2030-01-31')).not.toBeNull())
})
