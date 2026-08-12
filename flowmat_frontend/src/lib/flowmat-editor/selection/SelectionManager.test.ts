import { describe, expect, it } from 'vitest'
import { createRectangleElement } from '../elements/RectangleElement'
import { createEmptyEditorDocument } from '../model/EditorDocument'
import { toElementId } from '../model/ElementId'
import { findElementsInBox, getSelectedElementBounds, setSelection, toggleSelection } from './SelectionManager'

describe('SelectionManager', () => {
  it('deduplicates and filters selected ids', () => {
    const element = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 10, height: 10 })
    const doc = { ...createEmptyEditorDocument(), elements: [element] }

    expect(setSelection(doc, [element.id, element.id, toElementId('missing')]).selectedIds).toEqual([element.id])
  })

  it('toggles selection membership', () => {
    const element = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 10, height: 10 })
    const doc = { ...createEmptyEditorDocument(), elements: [element] }

    expect(toggleSelection(doc, element.id).selectedIds).toEqual([element.id])
    expect(toggleSelection(setSelection(doc, [element.id]), element.id).selectedIds).toEqual([])
  })

  it('returns combined bounds for selected elements', () => {
    const first = createRectangleElement({ id: toElementId('first'), x: 0, y: 0, width: 10, height: 10 })
    const second = createRectangleElement({ id: toElementId('second'), x: 20, y: 30, width: 40, height: 50 })
    const doc = setSelection({ ...createEmptyEditorDocument(), elements: [first, second] }, [first.id, second.id])

    expect(getSelectedElementBounds(doc)).toEqual({ x: 0, y: 0, width: 60, height: 80 })
  })

  it('finds visible elements intersecting a marquee box', () => {
    const first = createRectangleElement({ id: toElementId('first'), x: 0, y: 0, width: 10, height: 10 })
    const second = createRectangleElement({ id: toElementId('second'), x: 40, y: 40, width: 10, height: 10 })
    const hidden = createRectangleElement({ id: toElementId('hidden'), x: 4, y: 4, width: 10, height: 10, hidden: true })

    expect(findElementsInBox([first, second, hidden], { x: -5, y: -5, width: 20, height: 20 })).toEqual([first.id])
  })
})
