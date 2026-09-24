import { describe, expect, it } from 'vitest'
import type { WorkOrderDto } from '../../../shared/types/api'
import {
  availableWorkOrderActions,
  isWorkOrderEditable,
  runnableWorkOrders,
  workOrderProgress,
} from './workOrderActions'

function order(overrides: Partial<WorkOrderDto>): WorkOrderDto {
  return {
    workOrderId: 'wo-1',
    projectId: 'p-1',
    workflowId: null,
    workOrderNumber: 'WO-1',
    workOrderTitle: 'Batch',
    workOrderStatus: 'approved',
    priority: 'normal',
    targetItemId: null,
    targetQuantity: null,
    plannedStartAt: null,
    plannedEndAt: null,
    actualStartAt: null,
    actualEndAt: null,
    instruction: null,
    assignedTo: null,
    approvedBy: null,
    approvedAt: null,
    producedQuantity: 0,
    runCount: 0,
    bomId: null,
    ...overrides,
  }
}

describe('availableWorkOrderActions', () => {
  it('follows the backend state machine', () => {
    expect(availableWorkOrderActions('draft')).toEqual(['approve', 'cancel'])
    expect(availableWorkOrderActions('approved')).toEqual(['cancel'])
    expect(availableWorkOrderActions('in_progress')).toEqual(['complete'])
    expect(availableWorkOrderActions('completed')).toEqual([])
    expect(availableWorkOrderActions('cancelled')).toEqual([])
  })

  it('only lets drafts be edited', () => {
    expect(isWorkOrderEditable('draft')).toBe(true)
    expect(isWorkOrderEditable('approved')).toBe(false)
  })
})

describe('runnableWorkOrders', () => {
  it('keeps approved and in-progress orders for this workflow or for any workflow', () => {
    const orders = [
      order({ workOrderId: 'any', workflowId: null }),
      order({ workOrderId: 'mine', workflowId: 'wf-1', workOrderStatus: 'in_progress' }),
      order({ workOrderId: 'other', workflowId: 'wf-2' }),
      order({ workOrderId: 'draft', workOrderStatus: 'draft' }),
      order({ workOrderId: 'done', workOrderStatus: 'completed' }),
    ]

    expect(runnableWorkOrders(orders, 'wf-1').map((o) => o.workOrderId)).toEqual(['any', 'mine'])
  })
})

describe('workOrderProgress', () => {
  it('returns null without a target and caps at 100', () => {
    expect(workOrderProgress({ producedQuantity: 5, targetQuantity: null })).toBeNull()
    expect(workOrderProgress({ producedQuantity: 25, targetQuantity: 100 })).toBe(25)
    expect(workOrderProgress({ producedQuantity: 130, targetQuantity: 100 })).toBe(100)
  })
})
