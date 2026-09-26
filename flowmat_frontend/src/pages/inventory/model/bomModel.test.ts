import { describe, expect, it } from 'vitest'
import type { BomDto } from '../../../shared/types/api'
import { approvedRevision, bomActions, bomLinesFromCsv, compareBoms, costChange, groupByTarget, isEditable } from './bomModel'

function bom(overrides: Partial<BomDto>): BomDto {
  return {
    bomId: 'b1',
    projectId: 'p',
    targetItemId: 'item-a',
    bomName: 'A',
    bomVersion: 1,
    baseQuantity: 1,
    baseUnit: 'ea',
    bomStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    note: null,
    lines: [],
    ...overrides,
  }
}

describe('bomActions', () => {
  it('follows draft → pending → approved → retired', () => {
    expect(bomActions('draft')).toEqual(['submit'])
    expect(bomActions('pending_approval')).toEqual(['approve', 'reject'])
    expect(bomActions('approved')).toEqual(['revisions', 'retire'])
    expect(bomActions('retired')).toEqual(['revisions'])
  })

  it('only lets drafts change', () => {
    expect(isEditable(bom({ bomStatus: 'draft' }))).toBe(true)
    expect(isEditable(bom({ bomStatus: 'approved' }))).toBe(false)
  })
})

describe('groupByTarget', () => {
  it('groups revisions per item, newest first', () => {
    const groups = groupByTarget([
      bom({ bomId: 'a1', bomVersion: 1 }),
      bom({ bomId: 'b1', targetItemId: 'item-b' }),
      bom({ bomId: 'a2', bomVersion: 2 }),
    ])
    expect(groups.get('item-a')?.map((b) => b.bomId)).toEqual(['a2', 'a1'])
    expect(groups.get('item-b')?.map((b) => b.bomId)).toEqual(['b1'])
  })
})

describe('approvedRevision', () => {
  it('finds the approved revision of an item', () => {
    const boms = [bom({ bomId: 'a1', bomStatus: 'retired' }), bom({ bomId: 'a2', bomVersion: 2, bomStatus: 'approved' })]
    expect(approvedRevision(boms, 'item-a')?.bomId).toBe('a2')
    expect(approvedRevision(boms, 'item-x')).toBeUndefined()
  })
})

describe('compareBoms', () => {
  const line = (childItemId: string, quantity: number, unit = 'kg') => ({
    bomLineId: `${childItemId}-${quantity}`,
    childItemId,
    quantity,
    unit,
    scrapRate: null,
    optionalYn: null,
    substituteGroup: null,
    sortOrder: null,
    note: null,
  })
  const revision = (bomVersion: number, baseQuantity: number, lines: ReturnType<typeof line>[], baseUnit = 'ea'): BomDto => ({
    bomId: `bom-${bomVersion}`,
    projectId: 'p',
    targetItemId: 'bread',
    bomName: 'Bread',
    bomVersion,
    baseQuantity,
    baseUnit,
    bomStatus: 'approved',
    approvedBy: null,
    approvedAt: null,
    note: null,
    lines,
  })

  it('marks added, removed, changed and unchanged materials', () => {
    const v1 = revision(1, 10, [line('flour', 5), line('salt', 0.2), line('yeast', 0.1)])
    const v2 = revision(2, 10, [line('flour', 6), line('salt', 200, 'g'), line('sugar', 0.5), line('yeast', 0.1)])
    const { baseChanged, lines } = compareBoms(v1, v2)
    expect(baseChanged).toBe(false)
    expect(lines.map((l) => [l.childItemId, l.change])).toEqual([
      ['flour', 'changed'],
      ['salt', 'changed'],
      ['sugar', 'added'],
      ['yeast', 'same'],
    ])
    expect(compareBoms(v2, v1).lines.find((l) => l.childItemId === 'sugar')?.change).toBe('removed')
  })

  it('compares per unit of product, and as written when the base unit changed', () => {
    const v1 = revision(1, 10, [line('flour', 5)])
    expect(compareBoms(v1, revision(2, 20, [line('flour', 10)]))).toEqual({
      baseChanged: true,
      lines: [{ childItemId: 'flour', before: { quantity: 5, unit: 'kg' }, after: { quantity: 10, unit: 'kg' }, change: 'same' }],
    })
    expect(compareBoms(v1, revision(2, 20, [line('flour', 10)], 'kg')).lines[0].change).toBe('changed')
  })

  it('adds up lines of one material in one unit', () => {
    const v1 = revision(1, 10, [line('flour', 3), line('flour', 2)])
    expect(compareBoms(v1, revision(2, 10, [line('flour', 5)])).lines[0].change).toBe('same')
  })
})

describe('bomLinesFromCsv', () => {
  it('reads material lines by column name', () => {
    expect(bomLinesFromCsv('Unit,Qty,Item Code,colour\ng,5000,FLR-1,white\nkg,0.2,SALT,\n')).toEqual({
      ok: true,
      rows: [
        { itemCode: 'FLR-1', quantity: '5000', unit: 'g' },
        { itemCode: 'SALT', quantity: '0.2', unit: 'kg' },
      ],
    })
  })

  it('needs item code, quantity and unit columns and at least one line', () => {
    expect(bomLinesFromCsv('item_code,quantity\nFLR-1,5')).toEqual({
      ok: false,
      error: 'The first line must name the columns, with a unit column.',
    })
    expect(bomLinesFromCsv('item_code,quantity,unit\n')).toEqual({ ok: false, error: 'The file has no materials under its header.' })
  })
})

describe('costChange', () => {
  it('gives the difference and the percentage, none from nothing', () => {
    expect(costChange(100, 112)).toEqual({ delta: 12, percent: 12 })
    expect(costChange(3, 2)).toEqual({ delta: -1, percent: -33.3 })
    expect(costChange(0, 5)).toEqual({ delta: 5, percent: null })
  })
})
