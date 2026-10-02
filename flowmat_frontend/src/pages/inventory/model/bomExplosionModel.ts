import type { BomExplosionDto } from '../../../entities/bom/api/useBomExplosion'
import type { BomDto } from '../../../shared/types/api'

/** Items that have an approved BOM of their own: as a material they are sub-assemblies (docs/domain/multi-level-bom.md). */
export function subAssemblyIds(boms: BomDto[]): Set<string> {
  return new Set(boms.filter((bom) => bom.bomStatus === 'approved').map((bom) => bom.targetItemId))
}

/** Whether exploding adds anything: some material of the BOM is made by a BOM of its own. */
export function hasSubAssemblies(bom: BomDto, subAssemblies: Set<string>): boolean {
  return bom.lines.some((line) => subAssemblies.has(line.childItemId))
}

/** "2 levels · 4 bought materials · cost 38", with a note when some bought material has no unit cost. */
export function explosionSummary(explosion: BomExplosionDto): string {
  const levels = `${explosion.levels} level${explosion.levels === 1 ? '' : 's'}`
  const bought = `${explosion.materials.length} bought material${explosion.materials.length === 1 ? '' : 's'}`
  const cost = `cost ${Number(explosion.materialCost.toFixed(4))}${explosion.costComplete ? '' : ' (some have no unit cost)'}`
  return [levels, bought, cost].join(' · ')
}

/**
 * How far an item's unit cost is from its rolled-up material cost, in percent of the roll-up (1 decimal): positive when
 * the unit cost is higher. Null when either is missing or the roll-up is zero.
 */
export function costGapPercent(rolledUpCost: number, currentUnitCost: number | null): number | null {
  if (currentUnitCost == null || !rolledUpCost) return null
  return Math.round(((currentUnitCost - rolledUpCost) / rolledUpCost) * 1000) / 10
}
