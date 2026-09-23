import { describe, expect, it } from 'vitest'
import {
  createEmptyEditorDocument,
  createRectangleElement,
  groupEditorElements,
  toElementId,
  type EditorDocument,
  type EditorElement,
} from '../../../lib/flowmat-editor'
import { getWorkspaceEditorSelectionCapabilities, splitWorkspaceEditorSelection } from './workspaceEditorSelection'

const rectangle = (id: string, parentId: string | null = null) => createRectangleElement({
  id: toElementId(id), x: 0, y: 0, width: 20, height: 20,
  parentId: parentId ? toElementId(parentId) : null,
})
const document = (...elements: EditorElement[]): EditorDocument => ({ ...createEmptyEditorDocument(), elements })
const backend = document(rectangle('b1'), rectangle('b2'), rectangle('b3'))
const annotations = document(rectangle('a1'), rectangle('a2'), rectangle('a3'))
const capabilities = (ids: string[], editable = true) =>
  getWorkspaceEditorSelectionCapabilities(editable, backend, annotations, ids.map(toElementId))

describe('workspace selection capabilities', () => {
  it.each([
    [[], 'none', false, false, false],
    [['b1'], 'backend', false, false, false],
    [['b1', 'b2'], 'backend', true, false, true],
    [['b1', 'b2', 'b3'], 'backend', true, true, true],
    [['a1'], 'annotation', false, false, false],
    [['a1', 'a2'], 'annotation', true, false, true],
    [['a1', 'a2', 'a3'], 'annotation', true, true, true],
    [['b1', 'a1'], 'mixed', false, false, false],
    [['b1', 'b2', 'a1'], 'mixed', false, false, true],
    [['b1', 'b2', 'a1', 'a2'], 'mixed', false, false, true],
  ] as const)('handles selection %j', (ids, selectionKind, canAlign, canDistribute, canGroup) => {
    expect(capabilities([...ids])).toEqual({ selectionKind, canAlign, canDistribute, canGroup, canUngroup: false })
  })

  it('retains selection kind while disabling every editing command in read-only mode', () => {
    expect(capabilities(['a1', 'a2', 'a3'], false)).toEqual({
      selectionKind: 'annotation', canAlign: false, canDistribute: false, canGroup: false, canUngroup: false,
    })
  })

  it('ignores missing and repeated IDs when counting selected elements', () => {
    expect(capabilities(['b1', 'b1', 'missing'])).toEqual(capabilities(['b1']))
    expect(capabilities(['missing'])).toEqual(capabilities([]))
  })

  it('uses backend precedence for IDs existing in both storage models', () => {
    const overlapping = document(rectangle('b1'), rectangle('a1'))
    expect(splitWorkspaceEditorSelection(backend, overlapping, ['b1', 'a1', 'b1', 'missing'].map(toElementId)))
      .toEqual({ backendIds: ['b1'], annotationIds: ['a1'] })
    expect(getWorkspaceEditorSelectionCapabilities(true, backend, overlapping, ['b1', 'b2'].map(toElementId)))
      .toMatchObject({ selectionKind: 'backend', canAlign: true })
  })

  it('allows ungrouping a selected backend group or a member of an actual backend group', () => {
    const grouped = groupEditorElements(backend, ['b1', 'b2'].map(toElementId)).document
    const group = grouped.elements.find((element) => element.type === 'group')!
    for (const id of [group.id, toElementId('b1')]) {
      expect(getWorkspaceEditorSelectionCapabilities(true, grouped, annotations, [id]).canUngroup).toBe(true)
      expect(getWorkspaceEditorSelectionCapabilities(false, grouped, annotations, [id]).canUngroup).toBe(false)
    }
  })

  it('does not allow ungrouping a dangling backend parent or a non-group parent', () => {
    const invalid = document(rectangle('dangling', 'missing'), rectangle('child', 'parent'), rectangle('parent'))
    expect(getWorkspaceEditorSelectionCapabilities(true, invalid, annotations, ['dangling', 'child'].map(toElementId)).canUngroup)
      .toBe(false)
  })

  it('recognizes legacy annotation groups represented only by a synthetic parent ID', () => {
    const grouped = document(rectangle('a1', 'legacy-group'), rectangle('a2', 'legacy-group'))
    expect(getWorkspaceEditorSelectionCapabilities(true, backend, grouped, ['a1'].map(toElementId)).canUngroup).toBe(true)
    expect(getWorkspaceEditorSelectionCapabilities(true, backend, grouped, ['a1', 'b1'].map(toElementId)).canUngroup).toBe(true)
    expect(getWorkspaceEditorSelectionCapabilities(false, backend, grouped, ['a1'].map(toElementId)).canUngroup).toBe(false)
  })
})
