import { describe, expect, it } from 'vitest'
import type { WorkerLoadRowDto } from '../../../entities/production/api/useWorkerLoad'
import { overlapText, workerLoadLabel, workerLoadTone, workerOrderLine } from './workerLoadModel'

function row(overrides: Partial<WorkerLoadRowDto> = {}): WorkerLoadRowDto {
  return { userId: 'kim', owner: false, calendarSet: true, shiftHours: 40, plannedHours: 32, draftHours: 8, loadPercent: 80,
    overloaded: false, unplannedOrders: 0, orders: [], overlaps: [], ...overrides }
}

describe('worker load', () => {
  it('labels and colours the load', () => {
    expect(workerLoadLabel(row())).toBe('80%')
    expect(workerLoadTone(row())).toBe('ok')
    expect(workerLoadTone(row({ loadPercent: 90 }))).toBe('high')
    expect(workerLoadTone(row({ loadPercent: 180, overloaded: true }))).toBe('over')
    expect(workerLoadTone(row({ plannedHours: 0, loadPercent: 0 }))).toBe('idle')
    expect(workerLoadLabel(row({ calendarSet: false, loadPercent: null }))).toBe('No shifts set')
    expect(workerLoadLabel(row({ shiftHours: 0, loadPercent: null }))).toBe('—')
  })

  it('reads orders and overlaps', () => {
    const order = { workOrderId: 'wo-1', workOrderNumber: 'WO-0001', workOrderTitle: 'Mixing', workOrderStatus: 'approved',
      plannedStartAt: '2041-04-01T00:00:00Z', plannedEndAt: '2041-04-02T08:00:00Z', hoursInWindow: 16 }
    expect(workerOrderLine(order, true)).toBe('WO-0001 · Mixing · 16 h')
    expect(workerOrderLine({ ...order, workOrderStatus: 'draft' }, false)).toBe('WO-0001 · Mixing · draft')
    expect(workerOrderLine({ ...order, sharePercent: 50, hoursInWindow: 8 }, true)).toBe('WO-0001 · Mixing · 50% · 8 h')
    const overlap = { firstWorkOrderNumber: 'WO-0001', secondWorkOrderNumber: 'WO-0002', from: '2041-04-02T00:00:00Z',
      to: '2041-04-02T08:00:00Z', hours: 8 }
    expect(overlapText(overlap, true)).toMatch(/^WO-0001 and WO-0002 at once: .+ → .+ · 8 h$/)
    expect(overlapText(overlap, false)).not.toContain(' h')
  })
})
