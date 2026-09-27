import type { BomLineDto, BomLineType, ProductionRunItemDto } from '../../../shared/types/api'

/** What a BOM line can be (docs/domain/bom-by-products.md): consumed, or given off by the batch. */
export const LINE_TYPE_OPTIONS: { value: BomLineType; label: string }[] = [
  { value: 'material', label: 'Material' },
  { value: 'by_product', label: 'By-product' },
  { value: 'waste', label: 'Waste' },
]

/** A short tag for lines that are not materials; null for a material (lines written before types count as materials). */
export function lineTypeTag(type: BomLineType | null | undefined): string | null {
  if (type === 'by_product') return 'by-product'
  if (type === 'waste') return 'waste'
  return null
}

/** "3 materials", or "2 materials · 1 by-product · 1 waste". */
export function lineSummary(lines: Pick<BomLineDto, 'lineType'>[]): string {
  const count = (type: BomLineType) => lines.filter((line) => (line.lineType ?? 'material') === type).length
  const materials = count('material')
  const parts = [`${materials} material${materials === 1 ? '' : 's'}`]
  const byProducts = count('by_product')
  if (byProducts > 0) parts.push(`${byProducts} by-product${byProducts === 1 ? '' : 's'}`)
  const waste = count('waste')
  if (waste > 0) parts.push(`${waste} waste`)
  return parts.join(' · ')
}

/** What the run has recorded coming out of an item so far, cancelled recordings left out. */
export function recordedOutput(itemId: string, runItems: ProductionRunItemDto[]): number {
  return runItems
    .filter((item) => item.itemId === itemId && item.direction === 'output' && !item.cancelled && item.quantitySource !== 'bom')
    .reduce((sum, item) => sum + Number(item.actualQty ?? item.plannedQty ?? 0), 0)
}
