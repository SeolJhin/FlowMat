import { describe, expect, it } from 'vitest'
import type { InventoryDto } from '../../../shared/types/api'
import { summariseItemStock } from './itemDetailModel'

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
