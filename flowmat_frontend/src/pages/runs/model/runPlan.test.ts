import { describe, expect, it } from 'vitest'
import type { ProductionRunItemDto } from '../../../shared/types/api'
import { recordedAgainstPlan, remainingOfPlan } from './runPlan'

function row(overrides: Partial<ProductionRunItemDto>): ProductionRunItemDto {
  return {
    productionRunItemId: 'r',
    productionRunId: 'run',
    processId: null,
    processIoId: null,
    inventoryId: null,
    itemId: 'flour',
    direction: 'input',
    plannedQty: 0,
    actualQty: null,
    unit: 'kg',
    quantitySource: 'manual',
    conversionRate: null,
    lotId: null,
    cancelled: false,
    cancelledBy: null,
    cancelledAt: null,
    cancelReason: null,
    ...overrides,
  }
}

describe('plan vs recorded', () => {
  const plan = row({ productionRunItemId: 'p', quantitySource: 'bom', plannedQty: 50 })

  it('sums manual inputs of the same item and unit', () => {
    const items = [
      plan,
      row({ productionRunItemId: 'a', plannedQty: 20, actualQty: 18 }),
      row({ productionRunItemId: 'b', plannedQty: 10 }),
      row({ productionRunItemId: 'c', unit: 'g', actualQty: 500 }),
      row({ productionRunItemId: 'd', itemId: 'salt', actualQty: 1 }),
      row({ productionRunItemId: 'e', direction: 'output', actualQty: 5 }),
    ]
    expect(recordedAgainstPlan(plan, items)).toBe(28)
    expect(remainingOfPlan(plan, items)).toBe(22)
  })

  it('ignores cancelled recordings', () => {
    const items = [plan, row({ productionRunItemId: 'a', actualQty: 20 }), row({ productionRunItemId: 'b', actualQty: 30, cancelled: true })]
    expect(recordedAgainstPlan(plan, items)).toBe(20)
  })

  it('never reports a negative remainder', () => {
    expect(remainingOfPlan(plan, [plan, row({ actualQty: 60 })])).toBe(0)
  })
})
