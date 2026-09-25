import { describe, expect, it } from 'vitest'
import { formatRate, windowStart } from './qualityOverviewModel'

describe('windowStart', () => {
  it('starts at local midnight so today is one of the days', () => {
    const now = new Date(2026, 8, 25, 15, 42)
    expect(windowStart(7, now)).toBe(new Date(2026, 8, 19).toISOString())
    expect(windowStart(1, now)).toBe(new Date(2026, 8, 25).toISOString())
    // Crosses month ends like the calendar does.
    expect(windowStart(30, now)).toBe(new Date(2026, 7, 27).toISOString())
  })

  it('is the same all day and absent for all time', () => {
    expect(windowStart(7, new Date(2026, 8, 25, 0, 1))).toBe(windowStart(7, new Date(2026, 8, 25, 23, 59)))
    expect(windowStart(null)).toBeNull()
  })
})

describe('formatRate', () => {
  it('shows a percentage with one decimal, or a dash without inspections', () => {
    expect(formatRate(0.8333)).toBe('83.3%')
    expect(formatRate(1)).toBe('100.0%')
    expect(formatRate(0)).toBe('0.0%')
    expect(formatRate(null)).toBe('–')
  })
})
