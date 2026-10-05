import { describe, expect, it } from 'vitest'
import type { WorkOrderDto, WorkOrderReadinessDto } from '../../../shared/types/api'
import { orderedChecks, plannedSupply, readinessHeadline, subAssemblyToMake } from './readinessModel'

function readiness(statuses: ('ok' | 'warn' | 'fail')[]): WorkOrderReadinessDto {
  return {
    workOrderId: 'wo',
    ready: !statuses.includes('fail'),
    remainingQuantity: 10,
    checks: statuses.map((status, index) => ({ code: `c${index}`, status, message: `m${index}` })),
    materials: [],
  }
}

describe('work order readiness', () => {
  it('puts problems first, then warnings, keeping the server order within each', () => {
    expect(orderedChecks(readiness(['ok', 'warn', 'fail', 'ok', 'fail'])).map((check) => check.code)).toEqual([
      'c2',
      'c4',
      'c1',
      'c0',
      'c3',
    ])
  })

  it('sums it up in one line', () => {
    expect(readinessHeadline(readiness(['ok', 'fail', 'fail', 'warn']))).toBe('Not ready: 2 problems')
    expect(readinessHeadline(readiness(['ok', 'warn']))).toBe('Ready, with 1 warning')
    expect(readinessHeadline(readiness(['ok', 'ok']))).toBe('Ready to run')
  })
})

describe('sub-assemblies to make', () => {
  it('counts what other open orders will still make and leaves the rest to a new order', () => {
    const order = (workOrderId: string, workOrderStatus: WorkOrderDto['workOrderStatus'], targetItemId: string | null,
      targetQuantity: number | null, producedQuantity = 0) => ({ workOrderId, workOrderStatus, targetItemId, targetQuantity, producedQuantity })
    const supply = plannedSupply([
      order('cake', 'approved', 'cake', 10),
      order('s1', 'approved', 'sponge', 5),
      order('s2', 'in_progress', 'sponge', 8, 6),
      order('s3', 'draft', 'sponge', 100),
      order('s4', 'completed', 'sponge', 100),
      order('s5', 'approved', 'sponge', 3, 4),
      order('none', 'approved', null, 7),
      order('open', 'approved', 'flour', null),
    ], 'cake')
    // 5 + (8 - 6) + nothing past its target.
    expect(supply.get('sponge')).toBe(7)
    expect(supply.has('cake')).toBe(false)
    expect(supply.has('flour')).toBe(false)
    expect(subAssemblyToMake(17, 7)).toBe(10)
    expect(subAssemblyToMake(5, 7)).toBe(0)
    expect(subAssemblyToMake(0.30000000000000004, 0.1)).toBe(0.2)
  })
})
