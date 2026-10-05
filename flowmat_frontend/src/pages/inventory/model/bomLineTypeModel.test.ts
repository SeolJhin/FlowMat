import { describe, expect, it } from 'vitest'
import type { BomOutputDto, ProductionRunItemDto } from '../../../shared/types/api'
import {
  differenceText, finishByProductNote, finishedByProduct, finishOutput, lineSummary, lineTypeTag, recordedOutput,
} from './bomLineTypeModel'

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

  it('says at finish what comes out short of the BOM for the output made', () => {
    const outputs = [
      { bomLineId: 'b1', itemId: 'bran', lineType: 'by_product', lineQuantity: 2, lineUnit: 'kg', quantity: 2, itemUnit: 'kg', itemQuantity: 2 },
      { bomLineId: 'b2', itemId: 'dust', lineType: 'waste', lineQuantity: 0.5, lineUnit: 'kg', quantity: 0.5, itemUnit: 'kg', itemQuantity: 0.5 },
    ] as BomOutputDto[]
    const label = (itemId: string) => itemId.toUpperCase()
    // 20 planned, 16 made: 1.6 kg bran and 0.4 kg dust expected.
    expect(finishByProductNote(outputs, [runItem('bran', 'output', 0.5)], label, 20, 16))
      .toBe('Not all that comes out is recorded: BRAN 0.5 of 1.6 kg, DUST 0 of 0.4 kg.')
    expect(finishByProductNote(outputs, [runItem('bran', 'output', 1.7), runItem('dust', 'output', 0.1), runItem('dust', 'output', 0.3)],
      label, 20, 16)).toBeNull()
    expect(finishByProductNote([], [], label, 20, 16)).toBeNull()
    // Without a planned quantity the plan's amounts stand.
    expect(finishByProductNote(outputs.slice(0, 1), [], label, 0, 16)).toBe('Not all that comes out is recorded: BRAN 0 of 2 kg.')

    const recorded = [runItem('bread', 'output', 12), runItem('bran', 'output', 3)]
    expect(finishOutput('16', 'bread', recorded, 20)).toBe(16)
    expect(finishOutput('', 'bread', recorded, 20)).toBe(12)
    expect(finishOutput(' ', null, recorded, 20)).toBe(20)
    expect(finishOutput('', 'bread', [], 20)).toBe(20)
  })
})

describe('a finished run against its BOM', () => {
  it('scales the planned by-product to what the run made and says how far the recording is', () => {
    // 2 kg bran for 20 planned, 16 made: 1.6 kg expected.
    expect(finishedByProduct(2, 20, 16, 0.5)).toEqual({ expected: 1.6, difference: -1.1 })
    expect(finishedByProduct(2, 20, 16, 1.8)).toEqual({ expected: 1.6, difference: 0.2 })
    expect(finishedByProduct(0.5, 20, 20, 0.5)).toEqual({ expected: 0.5, difference: 0 })
    // Nothing made: nothing expected.
    expect(finishedByProduct(2, 20, 0, 0)).toEqual({ expected: 0, difference: 0 })
    expect(differenceText(-1.1, 'kg')).toBe('1.1 kg short')
    expect(differenceText(0.2, 'kg')).toBe('0.2 kg over')
    expect(differenceText(0, 'kg')).toBe('as expected')
  })
})
