import { describe, expect, it } from 'vitest'
import type { BomDto } from '../../../shared/types/api'
import {
  approvedRevision, bomActions, bomLinesFromCsv, compareBoms, costChange, groupByTarget, isEditable, overlappingApproved,
  localDay, periodLabel, replacementEndDay, zoneDay,
} from './bomModel'

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

describe('replacementEndDay', () => {
  it('is the day before the start when every overlap began earlier and ends within', () => {
    const v1 = bom({ bomId: 'v1', bomStatus: 'approved', bomVersion: 1 })
    expect(replacementEndDay({ effectiveFrom: '2030-03-01', effectiveTo: null }, [v1])).toBe('2030-02-28')
    expect(replacementEndDay({ effectiveFrom: '2032-03-01', effectiveTo: null }, [v1])).toBe('2032-02-29')
    expect(replacementEndDay({ effectiveFrom: null, effectiveTo: null }, [v1])).toBeNull()
    expect(replacementEndDay({ effectiveFrom: '2030-03-01', effectiveTo: null }, [])).toBeNull()
    expect(replacementEndDay({ effectiveFrom: '2030-03-01', effectiveTo: null },
      [{ ...v1, effectiveFrom: '2030-03-01' }])).toBeNull()
    expect(replacementEndDay({ effectiveFrom: '2030-03-01', effectiveTo: '2030-06-30' }, [v1])).toBeNull()
    expect(replacementEndDay({ effectiveFrom: '2030-03-01', effectiveTo: '2030-06-30' },
      [{ ...v1, effectiveTo: '2030-05-31' }])).toBe('2030-02-28')
  })
})

describe('zoneDay', () => {
  it("is the project's day in its time zone, else this browser's", () => {
    const late = new Date('2030-01-31T16:00:00Z')
    expect(zoneDay('Asia/Seoul', late)).toBe('2030-02-01')
    expect(zoneDay('America/New_York', late)).toBe('2030-01-31')
    expect(zoneDay(undefined, late)).toBe(localDay(late))
    expect(zoneDay('Not/AZone', late)).toBe(localDay(late))
  })

  it('picks the revision effective on that day', () => {
    const v1 = bom({ bomId: 'v1', bomStatus: 'approved', bomVersion: 1, effectiveTo: '2030-01-31' })
    const v2 = bom({ bomId: 'v2', bomStatus: 'approved', bomVersion: 2, effectiveFrom: '2030-02-01' })
    const late = new Date('2030-01-31T16:00:00Z')
    expect(approvedRevision([v1, v2], 'item-a', zoneDay('Asia/Seoul', late))?.bomId).toBe('v2')
    expect(approvedRevision([v1, v2], 'item-a', zoneDay('America/New_York', late))?.bomId).toBe('v1')
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

  it('reads an optional type column for by-products and waste', () => {
    expect(bomLinesFromCsv('item_code,quantity,unit,Type\nORANGE,2,kg,\nPEEL,0.5,kg,by_product\n')).toEqual({
      ok: true,
      rows: [
        { itemCode: 'ORANGE', quantity: '2', unit: 'kg', lineType: '' },
        { itemCode: 'PEEL', quantity: '0.5', unit: 'kg', lineType: 'by_product' },
      ],
    })
  })

  it('reads an optional phantom column', () => {
    expect(bomLinesFromCsv('item_code,quantity,unit,Is Phantom\nDOUGH,2,kg,Y\nSALT,0.1,kg,\n')).toEqual({
      ok: true,
      rows: [
        { itemCode: 'DOUGH', quantity: '2', unit: 'kg', phantom: 'Y' },
        { itemCode: 'SALT', quantity: '0.1', unit: 'kg', phantom: '' },
      ],
    })
    expect(bomLinesFromCsv('item_code,quantity,unit,phantom,is_phantom\nDOUGH,2,kg,Y,N\n'))
      .toEqual({ ok: false, error: 'Use only one phantom column, including aliases.' })
  })

  it.each([
    ['item_code,quantity,qty,unit', 'FLR-1,50,5,kg', 'quantity'],
    ['item_code,quantity,unit,unit_code', 'FLR-1,5,kg,g', 'unit'],
    ['item_code,quantity,unit,type,kind', 'FLR-1,5,kg,material,waste', 'type'],
  ])('refuses ambiguous material columns %s instead of overriding a value', (header, row, column) => {
    expect(bomLinesFromCsv(`${header}\n${row}\n`)).toEqual({
      ok: false, error: `Use only one ${column} column, including aliases.`,
    })
  })

  it('needs item code, quantity and unit columns and at least one line', () => {
    expect(bomLinesFromCsv('item_code,quantity\nFLR-1,5')).toEqual({
      ok: false,
      error: 'The first line must name the columns, with a unit column.',
    })
    expect(bomLinesFromCsv('item_code,quantity,unit\n')).toEqual({ ok: false, error: 'The file has no materials under its header.' })
  })

  it('reports malformed quoted cells as a file error', () => {
    expect(bomLinesFromCsv('item_code,quantity,unit\nFLR-1,5,"kg')).toEqual({
      ok: false,
      error: 'A quoted CSV cell is not closed.',
    })
  })
})

describe('costChange', () => {
  it('gives the difference and the percentage, none from nothing', () => {
    expect(costChange(100, 112)).toEqual({ delta: 12, percent: 12 })
    expect(costChange(3, 2)).toEqual({ delta: -1, percent: -33.3 })
    expect(costChange(0, 5)).toEqual({ delta: 5, percent: null })
  })
})

describe('approved revisions for separate periods', () => {
  const january = bom({ bomId: 'jan', bomStatus: 'approved', effectiveFrom: null, effectiveTo: '2030-01-31' })
  const february = bom({ bomId: 'feb', bomVersion: 2, bomStatus: 'approved', effectiveFrom: '2030-02-01', effectiveTo: null })

  it('picks the one effective on the day, ends included', () => {
    expect(approvedRevision([january, february], 'item-a', '2030-01-31')?.bomId).toBe('jan')
    expect(approvedRevision([january, february], 'item-a', '2030-02-01')?.bomId).toBe('feb')
    expect(approvedRevision([february], 'item-a', '2030-01-15')).toBeUndefined()
  })

  it('finds the approved revisions an approval would overlap', () => {
    const draft = bom({ bomId: 'd', bomVersion: 3, effectiveFrom: '2030-01-15', effectiveTo: null })
    expect(overlappingApproved(draft, [january, february, draft]).map((one) => one.bomId)).toEqual(['jan', 'feb'])
    const later = bom({ bomId: 'l', bomVersion: 3, effectiveFrom: '2030-03-01', effectiveTo: null })
    const ended = { ...february, effectiveTo: '2030-02-28' }
    expect(overlappingApproved(later, [january, ended])).toEqual([])
    expect(periodLabel(january)).toBe('open → 2030-01-31')
  })
})
