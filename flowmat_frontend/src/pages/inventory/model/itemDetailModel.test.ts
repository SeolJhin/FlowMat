import { describe, expect, it } from 'vitest'
import type { InventoryDto } from '../../../shared/types/api'
import { costChangeText, summariseItemStock } from './itemDetailModel'

const row = (itemId: string, fields: Partial<InventoryDto>) =>
  ({ inventoryId: `${itemId}-${fields.location}`, itemId, quantity: 0, reservedQuantity: 0, inventoryStatus: 'available', location: null, ...fields }) as InventoryDto

describe('summariseItemStock', () => {
  it('adds up one item\'s records and counts its places', () => {
    const rows = [
      row('flour', { location: 'A', quantity: 10, reservedQuantity: 2 }),
      row('flour', { location: 'B', quantity: 4, inventoryStatus: 'quarantined' }),
      row('flour', { location: 'A', quantity: 1, lotId: 'l2' }),
      row('salt', { location: 'A', quantity: 99 }),
    ]
    expect(summariseItemStock(rows, 'flour')).toEqual({ records: 3, onHand: 15, reserved: 2, quarantined: 4, locations: 2 })
    expect(summariseItemStock(rows, 'sugar')).toEqual({ records: 0, onHand: 0, reserved: 0, quarantined: 0, locations: 0 })
  })
})

describe('costChangeText', () => {
  it('shows the cost before and after, with no cost or 0 as unknown', () => {
    expect(costChangeText({ previousUnitCost: null, unitCost: 2 }, String)).toBe('unknown → 2')
    expect(costChangeText({ previousUnitCost: 2, unitCost: 3.5 }, String)).toBe('2 → 3.5')
    expect(costChangeText({ previousUnitCost: 3.5, unitCost: 0 }, String)).toBe('3.5 → unknown')
  })
})
