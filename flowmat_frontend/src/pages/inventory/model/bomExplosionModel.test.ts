import { describe, expect, it } from 'vitest'
import type { BomExplosionDto } from '../../../entities/bom/api/useBomExplosion'
import type { BomDto } from '../../../shared/types/api'
import { costGapPercent, explosionSummary, hasSubAssemblies, subAssemblyIds } from './bomExplosionModel'

function bom(bomId: string, targetItemId: string, bomStatus: string, children: string[] = []): BomDto {
  return {
    bomId, targetItemId, bomStatus, lines: children.map((childItemId, index) => ({ bomLineId: `${bomId}-${index}`, childItemId })),
  } as unknown as BomDto
}

describe('sub-assemblies', () => {
  it('are the items with an approved BOM', () => {
    const boms = [bom('b1', 'sponge', 'approved'), bom('b2', 'cream', 'draft'), bom('b3', 'cake', 'approved', ['sponge', 'sugar'])]
    const ids = subAssemblyIds(boms)
    expect([...ids].sort()).toEqual(['cake', 'sponge'])
    expect(hasSubAssemblies(boms[2], ids)).toBe(true)
    expect(hasSubAssemblies(bom('b4', 'tart', 'approved', ['sugar', 'cream']), ids)).toBe(false)
  })
})

describe('explosionSummary', () => {
  it('counts levels and bought materials and says when the cost is incomplete', () => {
    const explosion = { levels: 2, materials: [{}, {}, {}, {}], materialCost: 38, costComplete: true } as unknown as BomExplosionDto
    expect(explosionSummary(explosion)).toBe('2 levels · 4 bought materials · cost 38')
    expect(explosionSummary({ ...explosion, levels: 1, materials: [{}] as BomExplosionDto['materials'], costComplete: false }))
      .toBe('1 level · 1 bought material · cost 38 (some have no unit cost)')
  })
})

describe('costGapPercent', () => {
  it('is the unit cost above or below the roll-up, in percent', () => {
    expect(costGapPercent(3.8, 5)).toBe(31.6)
    expect(costGapPercent(4, 3)).toBe(-25)
    expect(costGapPercent(1.4, 1.4)).toBe(0)
  })

  it('is null without a unit cost or a roll-up', () => {
    expect(costGapPercent(3.8, null)).toBeNull()
    expect(costGapPercent(0, 2)).toBeNull()
  })
})
