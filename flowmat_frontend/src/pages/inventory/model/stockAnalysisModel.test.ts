import { describe, expect, it } from 'vitest'
import type { StockAnalysisLineDto } from '../../../shared/types/api'
import { analysisTotals, coverLabel, filterIdle, idleLabel, sortAnalysis } from './stockAnalysisModel'

function line(itemCode: string, fields: Partial<StockAnalysisLineDto> = {}): StockAnalysisLineDto {
  return {
    itemId: itemCode.toLowerCase(),
    itemCode,
    itemName: null,
    unit: 'kg',
    onHandQuantity: 10,
    usableQuantity: 10,
    stockValue: null,
    consumedQuantity: 0,
    averageDailyConsumption: 0,
    daysOfCover: null,
    leadTimeDays: null,
    coverBelowLeadTime: false,
    lastConsumedAt: null,
    lastReceivedAt: null,
    idleDays: null,
    consumedValue: null,
    abcClass: null,
    ...fields,
  }
}

const lines = [
  line('SALT', { idleDays: 50, stockValue: 25 }),
  line('FLOUR', { idleDays: 0, consumedQuantity: 20, daysOfCover: 105, coverBelowLeadTime: true, consumedValue: 40, abcClass: 'A' }),
  line('YEAST', { idleDays: 3, consumedQuantity: 2, daysOfCover: 12.5, consumedValue: 60, abcClass: 'A' }),
  line('SUGAR'),
]

describe('sortAnalysis', () => {
  it('puts the longest idle first and unknowns last', () => {
    expect(sortAnalysis(lines, 'idle').map((l) => l.itemCode)).toEqual(['SALT', 'YEAST', 'FLOUR', 'SUGAR'])
  })

  it('puts what runs out first on top and unused items last', () => {
    expect(sortAnalysis(lines, 'cover').map((l) => l.itemCode)).toEqual(['YEAST', 'FLOUR', 'SALT', 'SUGAR'])
  })

  it('sorts by use, ties by code, without changing the input', () => {
    expect(sortAnalysis(lines, 'consumed').map((l) => l.itemCode)).toEqual(['FLOUR', 'YEAST', 'SALT', 'SUGAR'])
    expect(lines[0].itemCode).toBe('SALT')
  })

  it('sorts by value used, items without a cost last', () => {
    expect(sortAnalysis(lines, 'value').map((l) => l.itemCode)).toEqual(['YEAST', 'FLOUR', 'SALT', 'SUGAR'])
  })
})

describe('filterIdle and totals', () => {
  it('keeps lines idle for at least the given days', () => {
    expect(filterIdle(lines, 0)).toHaveLength(4)
    expect(filterIdle(lines, 3).map((l) => l.itemCode)).toEqual(['SALT', 'YEAST'])
  })

  it('counts idle stock and its value, and items that run out within the lead time', () => {
    expect(analysisTotals(lines, 30)).toEqual({ idleItems: 1, idleValue: 25, idleUncosted: 0, shortCover: 1, classA: 2 })
    expect(analysisTotals(lines, 1)).toEqual({ idleItems: 2, idleValue: 25, idleUncosted: 1, shortCover: 1, classA: 2 })
  })
})

describe('labels', () => {
  it('says idle time and cover in words', () => {
    expect(idleLabel(null)).toBe('\u2013')
    expect(idleLabel(0)).toBe('today')
    expect(idleLabel(1)).toBe('1 day')
    expect(idleLabel(12)).toBe('12 days')
    expect(coverLabel({ daysOfCover: 105.4 })).toBe('105 days')
    expect(coverLabel({ daysOfCover: null })).toBe('not used')
  })
})
