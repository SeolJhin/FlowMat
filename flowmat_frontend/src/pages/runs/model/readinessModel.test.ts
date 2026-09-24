import { describe, expect, it } from 'vitest'
import type { WorkOrderReadinessDto } from '../../../shared/types/api'
import { orderedChecks, readinessHeadline } from './readinessModel'

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
