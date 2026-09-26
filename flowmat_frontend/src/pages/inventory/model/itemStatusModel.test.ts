import { describe, expect, it } from 'vitest'
import type { ItemDto } from '../../../shared/types/api'
import { isActiveItem, pickableItems } from './itemStatusModel'

function item(itemId: string, itemStatus: string | null): ItemDto {
  return { itemId, itemCode: itemId.toUpperCase(), itemName: itemId, itemStatus } as ItemDto
}

describe('isActiveItem', () => {
  it('is true for active and for an item without a status', () => {
    expect(isActiveItem(item('a', 'active'))).toBe(true)
    expect(isActiveItem(item('b', null))).toBe(true)
  })

  it('is false for inactive and discontinued', () => {
    expect(isActiveItem(item('c', 'inactive'))).toBe(false)
    expect(isActiveItem(item('d', 'discontinued'))).toBe(false)
  })
})

describe('pickableItems', () => {
  const items = [item('a', 'active'), item('c', 'inactive'), item('d', 'discontinued')]

  it('offers active items only', () => {
    expect(pickableItems(items).map((i) => i.itemId)).toEqual(['a'])
  })

  it('keeps the item already chosen', () => {
    expect(pickableItems(items, 'd').map((i) => i.itemId)).toEqual(['a', 'd'])
  })
})
