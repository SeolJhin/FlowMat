import type { ItemDto, LotDto, LotStatus } from '../../../shared/types/api'

export interface ItemFilter {
  text: string
  /** '' for any status. */
  status: string
  lotTrackedOnly: boolean
}

export const EMPTY_ITEM_FILTER: ItemFilter = { text: '', status: '', lotTrackedOnly: false }

/**
 * Items whose code, name, type, group, barcode or SKU contains the text (ignoring case), with the status and LOT tracking
 * asked for.
 */
export function filterItems(items: ItemDto[], filter: ItemFilter): ItemDto[] {
  const text = filter.text.trim().toLowerCase()
  return items.filter(
    (item) =>
      (!text
        || [item.itemCode, item.itemName, item.itemType, item.details?.itemGroup, item.details?.barcode, item.details?.sku].some((value) =>
          (value ?? '').toLowerCase().includes(text),
        ))
      && (!filter.status || item.itemStatus === filter.status)
      && (!filter.lotTrackedOnly || item.lotManageYn === 'Y'),
  )
}

export type LotExpiryFilter = 'any' | 'expired' | 'soon' | 'none'

export interface LotFilter {
  text: string
  /** 'open' hides closed LOTs; 'all' shows every status. */
  status: LotStatus | 'open' | 'all'
  expiry: LotExpiryFilter
}

export const EMPTY_LOT_FILTER: LotFilter = { text: '', status: 'all', expiry: 'any' }

/** How far ahead "expires soon" looks, in days. */
export const EXPIRES_SOON_DAYS = 30

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * LOTs whose number or item label contains the text, in the status asked for, by expiry: already expired, expiring
 * within {@link EXPIRES_SOON_DAYS} days from today (not yet expired), or with no expiry date.
 */
export function filterLots(lots: LotDto[], filter: LotFilter, itemLabel: (itemId: string) => string, today: Date = new Date()): LotDto[] {
  const text = filter.text.trim().toLowerCase()
  const now = localDate(today)
  const soon = localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + EXPIRES_SOON_DAYS))
  return lots.filter((lot) => {
    if (text && !lot.lotNo.toLowerCase().includes(text) && !itemLabel(lot.itemId).toLowerCase().includes(text)) return false
    if (filter.status === 'open' && lot.lotStatus === 'closed') return false
    if (filter.status !== 'open' && filter.status !== 'all' && lot.lotStatus !== filter.status) return false
    if (filter.expiry === 'expired') return lot.expiryDate !== null && lot.expiryDate < now
    if (filter.expiry === 'soon') return lot.expiryDate !== null && lot.expiryDate >= now && lot.expiryDate <= soon
    if (filter.expiry === 'none') return lot.expiryDate === null
    return true
  })
}

/**
 * Codes that more than one item uses, with how many, in code order. New items cannot take a code in use, but items
 * made before that rule can share one, and imports cannot tell such items apart.
 */
export function duplicateCodes(items: ItemDto[]): { code: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.itemCode, (counts.get(item.itemCode) ?? 0) + 1)
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => a.code.localeCompare(b.code))
}
