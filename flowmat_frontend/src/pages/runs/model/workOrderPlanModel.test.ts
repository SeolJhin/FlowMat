import { describe, expect, it } from 'vitest'
import type { WorkOrderPlanSuggestionDto } from '../../../entities/production/api/useWorkOrderPlan'
import type { WorkOrderDto } from '../../../shared/types/api'
import { defaultPlanFrom, localInput, planInput, planStamp, planSummary } from './workOrderPlanModel'

function local(year: number, month: number, day: number, hour: number, minute: number): string {
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

function plan(overrides: Partial<WorkOrderPlanSuggestionDto> = {}): WorkOrderPlanSuggestionDto {
  return {
    workOrderId: 'wo-1', equipmentId: 'eq-1', from: local(2030, 1, 7, 0, 0),
    plannedStartAt: local(2030, 1, 7, 9, 0), plannedEndAt: local(2030, 1, 8, 11, 0),
    remainingQuantity: 100, capacityPerHour: 10, productionHours: 10, changeoverHours: 0, neededHours: 10,
    changeoverFrom: null, movedPast: [], ...overrides,
  }
}

function order(overrides: Partial<WorkOrderDto> = {}): WorkOrderDto {
  return {
    workOrderId: 'wo-1', projectId: 'p-1', workflowId: 'wf-1', workOrderNumber: 'WO-1', workOrderTitle: 'Bake',
    workOrderStatus: 'draft', priority: 'high', targetItemId: 'bread', targetQuantity: 100,
    plannedStartAt: null, plannedEndAt: null, actualStartAt: null, actualEndAt: null, instruction: 'Preheat',
    assignedTo: 'kim', approvedBy: null, approvedAt: null, producedQuantity: 0, runCount: 0, bomId: 'bom-1',
    instructionUrl: 'https://example.com/sop', equipmentId: 'eq-1', ...overrides,
  }
}

describe('dates', () => {
  it('writes local times for the field and the summary', () => {
    expect(localInput(new Date(2030, 0, 7, 9, 5))).toBe('2030-01-07T09:05')
    expect(planStamp(local(2030, 1, 7, 9, 0))).toBe('Mon 2030-01-07 09:00')
    expect(planStamp(local(2030, 1, 13, 23, 30))).toBe('Sun 2030-01-13 23:30')
  })

  it('starts from the planned start while it is ahead, otherwise from the next minute', () => {
    const now = new Date(2026, 9, 3, 6, 59, 30)
    expect(defaultPlanFrom({ plannedStartAt: local(2030, 1, 7, 9, 0) }, now)).toBe('2030-01-07T09:00')
    expect(defaultPlanFrom({ plannedStartAt: local(2026, 10, 1, 9, 0) }, now)).toBe('2026-10-03T07:00')
    expect(defaultPlanFrom({ plannedStartAt: null }, new Date(2026, 9, 3, 23, 59, 0))).toBe('2026-10-04T00:00')
  })
})

describe('planSummary', () => {
  it('names the start, the end and the hours, then any changeover and orders it was moved after', () => {
    expect(planSummary(plan())).toBe('Mon 2030-01-07 09:00 → Tue 2030-01-08 11:00 · needs 10 h')
    expect(planSummary(plan({ changeoverHours: 1.5, neededHours: 11.5, changeoverFrom: 'WO-7', movedPast: ['WO-7', 'WO-9'] })))
      .toBe('Mon 2030-01-07 09:00 → Tue 2030-01-08 11:00 · needs 11.5 h (with 1.5 h changeover after WO-7) · after WO-7, WO-9')
  })
})

describe('planInput', () => {
  it('sends every editable field as it is with the suggested dates', () => {
    const suggestion = plan()
    expect(planInput(order(), suggestion)).toEqual({
      workOrderTitle: 'Bake', workflowId: 'wf-1', targetItemId: 'bread', bomId: 'bom-1', targetQuantity: 100,
      priority: 'high', plannedStartAt: suggestion.plannedStartAt, plannedEndAt: suggestion.plannedEndAt,
      instruction: 'Preheat', assignedTo: 'kim', instructionUrl: 'https://example.com/sop',
    })
    const bare = planInput(order({ workflowId: null, targetItemId: null, bomId: null, targetQuantity: null, instruction: null,
      assignedTo: null, instructionUrl: null }), suggestion)
    expect(bare.workflowId).toBeUndefined()
    expect(bare.targetQuantity).toBeUndefined()
    expect(bare.instructionUrl).toBeUndefined()
  })
})
