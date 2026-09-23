import { describe, expect, it } from 'vitest'
import {
  createEmptyEditorDocument,
  createLineElement,
  createRectangleElement,
  getAnchorPoint,
  groupEditorElements,
  toElementId,
  ungroupEditorElements,
  type EditorDocument,
  type EditorElement,
} from '../../../lib/flowmat-editor'
import { alignWorkspaceEditorElements, distributeWorkspaceEditorElements } from './workspaceEditorLayout'

const rectangle = (id: string, x: number, y: number) => createRectangleElement({
  id: toElementId(id), x, y, width: 20, height: 20,
})
const document = (...elements: EditorElement[]): EditorDocument => ({ ...createEmptyEditorDocument(), elements })

describe('workspace editor layout', () => {
  it('aligns shapes immutably and moves both connector endpoints to their anchors', () => {
    const first = rectangle('first', 10, 30)
    const second = rectangle('second', 110, 80)
    const other = rectangle('other', 400, 400)
    const connector = createLineElement({
      id: toElementId('connector'),
      start: getAnchorPoint(first, 'right'), end: getAnchorPoint(second, 'left'),
      startBinding: { elementId: first.id, anchor: 'right' },
      endBinding: { elementId: second.id, anchor: 'left' },
    })
    const before = document(first, second, other, connector)
    const savedBefore = JSON.stringify(before)
    const after = alignWorkspaceEditorElements(before, [first.id, second.id], 'left')
    const moved = after.elements.find((element) => element.id === second.id)!
    const line = after.elements.find((element) => element.id === connector.id)!

    expect(moved).toMatchObject({ x: 10, y: 80 })
    expect(after.elements.find((element) => element.id === other.id)).toBe(other)
    expect(line.type).toBe('line')
    if (line.type !== 'line') throw new Error('Expected connector line')
    expect({ x: line.x + line.start.x, y: line.y + line.start.y }).toEqual(getAnchorPoint(first, 'right'))
    expect({ x: line.x + line.end.x, y: line.y + line.end.y }).toEqual(getAnchorPoint(moved, 'left'))
    expect(line.startBinding).toEqual(connector.startBinding)
    expect(line.endBinding).toEqual(connector.endBinding)
    expect(JSON.stringify(before)).toBe(savedBefore)
  })

  it.each(['horizontal', 'vertical'] as const)('distributes %s gaps and follows the moved middle anchor', (axis) => {
    const first = rectangle('first', 0, 0)
    const middle = rectangle('middle', 20, 20)
    const last = rectangle('last', 100, 100)
    const connector = createLineElement({
      id: toElementId('connector'),
      start: getAnchorPoint(middle, 'right'), end: { x: 300, y: 300 },
      startBinding: { elementId: middle.id, anchor: 'right' },
    })
    const before = document(first, middle, last, connector)
    const after = distributeWorkspaceEditorElements(before, [last.id, middle.id, first.id], axis)
    const moved = after.elements.find((element) => element.id === middle.id)!
    const line = after.elements.find((element) => element.id === connector.id)!

    expect(moved).toMatchObject(axis === 'horizontal' ? { x: 50, y: 20 } : { x: 20, y: 50 })
    expect(after.elements.find((element) => element.id === first.id)).toMatchObject({ x: 0, y: 0 })
    expect(after.elements.find((element) => element.id === last.id)).toMatchObject({ x: 100, y: 100 })
    if (line.type !== 'line') throw new Error('Expected connector line')
    expect({ x: line.x + line.start.x, y: line.y + line.start.y }).toEqual(getAnchorPoint(moved, 'right'))
    expect({ x: line.x + line.end.x, y: line.y + line.end.y }).toEqual({ x: 300, y: 300 })
    expect(middle).toMatchObject({ x: 20, y: 20 })
  })

  it('does not transform below the unique existing selection threshold', () => {
    const first = rectangle('first', 0, 0)
    const second = rectangle('second', 50, 80)
    const before = document(first, second)
    expect(alignWorkspaceEditorElements(before, [first.id, first.id, toElementId('missing')], 'left')).toBe(before)
    expect(distributeWorkspaceEditorElements(before, [first.id, second.id, second.id, toElementId('missing')], 'horizontal'))
      .toBe(before)
    expect(alignWorkspaceEditorElements(before, [], 'left')).toBe(before)
  })

  it('retains backend group membership and supports ungrouping after layout', () => {
    const first = rectangle('first', 0, 0)
    const second = rectangle('second', 50, 80)
    const grouped = groupEditorElements(document(first, second), [first.id, second.id])
    const group = grouped.document.elements.find((element) => element.type === 'group')!
    const aligned = alignWorkspaceEditorElements(grouped.document, grouped.selectedIds, 'left')

    expect(aligned.elements.filter((element) => element.parentId === group.id)).toHaveLength(2)
    expect(aligned.selectedIds).toEqual(grouped.selectedIds)
    const ungrouped = ungroupEditorElements(aligned, [first.id])
    expect(ungrouped.document.elements.every((element) => element.parentId == null)).toBe(true)
    expect(ungrouped.selectedIds).toEqual([first.id, second.id])
  })
})
