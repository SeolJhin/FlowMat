import { describe, expect, it } from 'vitest'
import { projectDay } from './workOrderBomModel'

/** What a datetime-local input shows for this instant in the test runner's time zone. */
function typed(iso: string): string {
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

describe('projectDay', () => {
  it('is the project calendar day of the instant typed, whatever the browser zone', () => {
    expect(projectDay(typed('2030-01-31T14:59:00Z'), 'Asia/Seoul')).toBe('2030-01-31')
    expect(projectDay(typed('2030-01-31T15:00:00Z'), 'Asia/Seoul')).toBe('2030-02-01')
    expect(projectDay(typed('2030-01-31T15:00:00Z'), 'UTC')).toBe('2030-01-31')
  })

  it('is empty without a start, a zone, or with a zone the browser does not know', () => {
    expect(projectDay('', 'UTC')).toBe('')
    expect(projectDay('2030-02-01T09:00', undefined)).toBe('')
    expect(projectDay('2030-02-01T09:00', 'Not/AZone')).toBe('')
    expect(projectDay('not a date', 'UTC')).toBe('')
  })
})
