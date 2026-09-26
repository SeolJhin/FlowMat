import type { RunMaterialUsageDto, RunMaterialUsageLineDto } from '../../../shared/types/api'

export type VarianceTone = 'over' | 'under' | 'even' | 'unknown'

/** Over the standard is spent material the BOM did not allow for; under can mean the recordings are not complete. */
export function varianceTone(line: Pick<RunMaterialUsageLineDto, 'variance'>): VarianceTone {
  if (line.variance === null) return 'unknown'
  return line.variance > 0 ? 'over' : line.variance < 0 ? 'under' : 'even'
}

/** "+3 kg (+37.5%)", "−0.5 kg (−5%)", "+0.1 kg" for an item not in the BOM, "unit?" when it cannot be worked out. */
export function formatVariance(
  line: Pick<RunMaterialUsageLineDto, 'variance' | 'variancePercent' | 'unit' | 'actual'>,
  format: (value: number) => string = String,
): string {
  if (line.variance === null) return line.actual === null ? 'unit?' : '–'
  const sign = line.variance > 0 ? '+' : line.variance < 0 ? '−' : ''
  const quantity = `${sign}${format(Math.abs(line.variance))}${line.unit ? ` ${line.unit}` : ''}`
  if (line.variancePercent === null) return quantity
  return `${quantity} (${sign}${format(Math.abs(line.variancePercent))}%)`
}

/** What the standard column is worked out for. */
export function basisLabel(usage: Pick<RunMaterialUsageDto, 'basisQuantity' | 'basisIsActual'>, format: (value: number) => string = String) {
  if (usage.basisQuantity === null) return 'No output to work the standard out for.'
  return usage.basisIsActual
    ? `Standard for the ${format(usage.basisQuantity)} made.`
    : `Standard for the ${format(usage.basisQuantity)} planned; it follows the actual output once the run is finished.`
}

/** "Made 16 of 20 planned (80%)." once the run has an output; null before that or without a plan. */
export function yieldLabel(
  usage: Pick<RunMaterialUsageDto, 'basisQuantity' | 'basisIsActual' | 'plannedOutputQty'>,
  format: (value: number) => string = String,
): string | null {
  if (!usage.basisIsActual || usage.basisQuantity === null || !usage.plannedOutputQty) return null
  const percent = Math.round((usage.basisQuantity / usage.plannedOutputQty) * 1000) / 10
  return `Made ${format(usage.basisQuantity)} of ${format(usage.plannedOutputQty)} planned (${percent}%).`
}
