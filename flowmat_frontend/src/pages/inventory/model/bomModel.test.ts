import { describe, expect, it } from 'vitest'
import type { BomDto } from '../../../shared/types/api'
import { approvedRevision, bomActions, groupByTarget, isEditable } from './bomModel'

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
