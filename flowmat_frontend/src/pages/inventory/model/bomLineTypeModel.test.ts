import { describe, expect, it } from 'vitest'
import type { ProductionRunItemDto } from '../../../shared/types/api'
import { lineSummary, lineTypeTag, recordedOutput } from './bomLineTypeModel'

function runItem(itemId: string, direction: 'input' | 'output', actualQty: number, patch: Partial<ProductionRunItemDto> = {}) {
  return { itemId, direction, actualQty, plannedQty: actualQty, cancelled: false, quantitySource: 'manual', ...patch } as ProductionRunItemDto
}

describe('BOM line types', () => {
  it('tags only what is not a material and counts each kind', () => {
    expect(lineTypeTag('material')).toBeNull()
    expect(lineTypeTag(undefined)).toBeNull()
    expect(lineTypeTag('by_product')).toBe('by-product')
    expect(lineTypeTag('waste')).toBe('waste')
    expect(lineSummary([{ lineType: 'material' }, {}, { lineType: 'material' }])).toBe('3 materials')
    expect(lineSummary([{ lineType: 'material' }, { lineType: 'by_product' }, { lineType: 'waste' }, { lineType: 'waste' }]))
      .toBe('1 material · 1 by-product · 2 waste')
  })

  it('adds up what a run recorded coming out of an item', () => {
    const items = [
      runItem('peel', 'output', 2), runItem('peel', 'output', 1.5), runItem('peel', 'input', 9),
      runItem('peel', 'output', 4, { cancelled: true }), runItem('peel', 'output', 5, { quantitySource: 'bom' }), runItem('pulp', 'output', 7),
    ]
    expect(recordedOutput('peel', items)).toBe(3.5)
    expect(recordedOutput('rind', items)).toBe(0)
  })
})
