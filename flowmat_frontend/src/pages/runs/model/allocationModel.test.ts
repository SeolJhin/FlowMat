import { describe, expect, it } from 'vitest'
import type { StockAllocationDto } from '../../../entities/production/api/useStockAllocations'
import { allocationPlace, canAllocateFromBom, hasOpen, planSummary } from './allocationModel'

function allocation(patch: Partial<StockAllocationDto>): StockAllocationDto {
  return {
    allocationId: 'a', inventoryId: 'i', itemId: 'flour', itemCode: 'FLOUR', lotId: null, lotNo: null, location: 'SHELF-2', quantity: 6,
    consumedQuantity: 0, releasedQuantity: 0, remaining: 6, status: 'open', createdBy: 'u', createdAt: '2026-09-27T00:00:00Z', ...patch,
  }
}

describe('allocation display', () => {
  it('sums up an allocate call', () => {
    expect(planSummary([
      { itemId: 'f', itemCode: 'FLOUR', needed: 10, allocatedBefore: 0, allocatedNow: 8, shortage: 2 },
      { itemId: 's', itemCode: 'SALT', needed: 1, allocatedBefore: 1, allocatedNow: 0, shortage: 0 },
    ])).toBe('Allocated FLOUR 8. Short: FLOUR 2.')
    expect(planSummary([{ itemId: 's', itemCode: 'SALT', needed: 1, allocatedBefore: 1, allocatedNow: 0, shortage: 0 }]))
      .toBe('Nothing more to allocate.')
  })

  it('names the place and tells what can be done', () => {
    expect(allocationPlace(allocation({ lotNo: 'L-1' }))).toBe('LOT L-1 · SHELF-2')
    expect(allocationPlace(allocation({ location: null }))).toBe('no place')
    expect(hasOpen([allocation({ status: 'closed' })])).toBe(false)
    expect(hasOpen([allocation({ status: 'closed' }), allocation({})])).toBe(true)
    expect(canAllocateFromBom({ workOrderStatus: 'approved', bomId: 'b' })).toBe(true)
    expect(canAllocateFromBom({ workOrderStatus: 'draft', bomId: 'b' })).toBe(false)
    expect(canAllocateFromBom({ workOrderStatus: 'in_progress', bomId: null })).toBe(false)
  })
})
