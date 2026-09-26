import type { ItemDto } from '../../../shared/types/api'

/** Takes new stock and new plans (docs/domain/item-status.md). An item without a status counts as active. */
export function isActiveItem(item: ItemDto): boolean {
  return !item.itemStatus || item.itemStatus.trim().toLowerCase() === 'active'
}

/**
 * The items a form that brings stock in or plans new use can offer: active ones, plus the one already chosen so an
 * existing record still shows its item.
 */
export function pickableItems(items: ItemDto[], keepId?: string | null): ItemDto[] {
  return items.filter((item) => isActiveItem(item) || item.itemId === keepId)
}
