import type { BuildableQuantityDto } from '../../../shared/types/api'

/** Usable stock per material, from what the BOM could make now, in each material's own unit. */
export function usableByMaterial(buildable: BuildableQuantityDto | undefined): Map<string, number> {
  return new Map((buildable?.lines ?? []).map((line) => [line.childItemId, Number(line.usable)]))
}

/**
 * How much more of a material a quantity needs than is usable, to 4 decimals like the backend (so 15 − 12.4 is 2.6, not
 * 2.5999…); 0 when covered, null when the stock is not known.
 */
export function shortBy(required: number, usable: number | undefined): number | null {
  if (usable === undefined) return null
  return Math.max(0, Math.round((Number(required) - usable) * 10_000) / 10_000)
}
