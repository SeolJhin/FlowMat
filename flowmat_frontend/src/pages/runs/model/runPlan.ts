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

/** What is still to record for a planned line; never negative. */
export function remainingOfPlan(planned: ProductionRunItemDto, items: ProductionRunItemDto[]): number {
  return Math.max(0, Number(planned.plannedQty) - recordedAgainstPlan(planned, items))
}
