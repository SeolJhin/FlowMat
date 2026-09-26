import type { ItemDto } from '../../../shared/types/api'

/**
 * The item a scanned or typed value names: its barcode first, then its SKU, then its code (codes ignore case). Null when
 * none matches, so a wrong scan never picks something close.
 */
export function findItemByScan(items: ItemDto[], scanned: string): ItemDto | null {
  const value = scanned.trim()
  if (!value) return null
  return (
    items.find((item) => item.details?.barcode === value)
    ?? items.find((item) => item.details?.sku === value)
    ?? items.find((item) => item.itemCode.toLowerCase() === value.toLowerCase())
    ?? null
  )
}

/** Whether a scan box is worth showing: some item carries a barcode or SKU. */
export function hasScanCodes(items: ItemDto[]): boolean {
  return items.some((item) => item.details?.barcode || item.details?.sku)
}
