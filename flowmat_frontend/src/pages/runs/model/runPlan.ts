import type { ProductionRunItemDto } from '../../../shared/types/api'

/**
 * How much of a BOM-planned input has been recorded by hand: the sum of manual input rows for the same item in the
 * same unit. Rows in another unit are not converted here (the server converts when it moves stock), so they do not
 * count towards this figure.
 */
export function recordedAgainstPlan(planned: ProductionRunItemDto, items: ProductionRunItemDto[]): number {
  return items
    .filter(
      (item) =>
        item.quantitySource !== 'bom'
        && !item.cancelled
        && item.direction === planned.direction
        && item.itemId === planned.itemId
        && item.unit === planned.unit,
    )
    .reduce((sum, item) => sum + Number(item.actualQty ?? item.plannedQty ?? 0), 0)
}

/** Who cancelled a recording, when and why, for its row on the run screen; null when it was not cancelled. */
export function cancelSummary(
  item: ProductionRunItemDto,
  formatTime: (iso: string) => string = (iso) => new Date(iso).toLocaleString(),
): string | null {
  if (!item.cancelled) return null
  const when = item.cancelledAt ? ` on ${formatTime(item.cancelledAt)}` : ''
  return `Cancelled by ${item.cancelledBy ?? '?'}${when}: ${item.cancelReason ?? ''}`
}

/** What is still to record for a planned line; never negative. */
export function remainingOfPlan(planned: ProductionRunItemDto, items: ProductionRunItemDto[]): number {
  return Math.max(0, Number(planned.plannedQty) - recordedAgainstPlan(planned, items))
}
