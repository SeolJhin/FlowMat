import { formatQty } from '../../../shared/lib/formatQty'
import type { BomLineDto, BomLineType, BomOutputDto, ProductionRunItemDto } from '../../../shared/types/api'

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

/** The output a finish is for: what is typed, else what the run recorded of its product, else the plan. */
export function finishOutput(
  typed: string,
  targetItemId: string | null,
  runItems: ProductionRunItemDto[],
  plannedOutputQty: number,
): number {
  if (typed.trim() !== '' && Number.isFinite(Number(typed)) && Number(typed) >= 0) return Number(typed)
  const made = targetItemId ? recordedOutput(targetItemId, runItems) : 0
  return made > 0 ? made : plannedOutputQty
}

/**
 * By-products and waste recorded short of what the run's BOM expects (docs/domain/bom-by-products.md): the planned batch's
 * amounts scaled to the {@code output} being finished. Null when nothing is short; more than expected is not flagged.
 */
export function finishByProductNote(
  outputs: BomOutputDto[],
  runItems: ProductionRunItemDto[],
  label: (itemId: string) => string,
  plannedOutputQty: number,
  output: number,
): string | null {
  const scale = plannedOutputQty > 0 ? output / plannedOutputQty : 1
  const round = (value: number) => Math.round(value * 10_000) / 10_000
  const short = outputs
    .map((one) => ({ one, expected: round(one.itemQuantity * scale), recorded: round(recordedOutput(one.itemId, runItems)) }))
    .filter(({ expected, recorded }) => recorded < expected)
  if (short.length === 0) return null
  return `Not all that comes out is recorded: ${short
    .map(({ one, expected, recorded }) => `${label(one.itemId)} ${formatQty(recorded)} of ${formatQty(expected)} ${one.itemUnit}`)
    .join(', ')}.`
}

/**
 * A finished run's by-product or waste against its BOM (docs/domain/bom-by-products.md "끝난 실행"): the planned batch's
 * amount scaled to what the run made, and what was recorded less that (negative: short).
 */
export function finishedByProduct(
  itemQuantity: number,
  plannedOutputQty: number,
  made: number,
  recorded: number,
): { expected: number; difference: number } {
  const round = (value: number) => Math.round(value * 10_000) / 10_000
  const expected = round(itemQuantity * (plannedOutputQty > 0 ? made / plannedOutputQty : 1))
  return { expected, difference: round(recorded - expected) }
}

/** "1.1 kg short", "0.2 kg over", or "as expected". */
export function differenceText(difference: number, unit: string): string {
  if (difference === 0) return 'as expected'
  return difference < 0 ? `${formatQty(-difference)} ${unit} short` : `${formatQty(difference)} ${unit} over`
}
