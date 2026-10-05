import { describe, expect, it } from 'vitest'
import { rescheduleDates, localDateInput } from './workOrderReschedule'
const order = { plannedStartAt: '2030-01-07T00:00:33.123456Z', plannedEndAt: '2030-01-07T08:00:44.654321Z' }
describe('schedule edits preserve untouched timestamps', () => {
  it('keeps the full original precision for an untouched or disabled start', () => {
    const result = rescheduleDates(order, localDateInput(order.plannedStartAt), localDateInput(order.plannedEndAt))
    expect(result.plannedStartAt).toBe(order.plannedStartAt)
    expect(result.plannedEndAt).toBe(order.plannedEndAt)
    expect(result.expectedPlannedStartAt).toBe(order.plannedStartAt)
  })
  it('converts changed local dates into UTC instants', () => {
    const result = rescheduleDates(order, '2030-01-08T09:00:00', '2030-01-08T17:00:00')
    expect(result.plannedStartAt).toBe(new Date('2030-01-08T09:00:00').toISOString())
  })
  it('uses null for a cleared or initially empty planned date', () => {
    expect(rescheduleDates(order, '', '').plannedStartAt).toBeNull()
    expect(localDateInput(null)).toBe('')
  })
  it('rejects invalid input and a reversed interval', () => {
    expect(() => rescheduleDates(order, 'invalid', '')).toThrow('plannedStartAt')
    expect(() => rescheduleDates(order, '2030-01-09T09:00', '2030-01-08T09:00')).toThrow('plannedEndAt')
  })
})
