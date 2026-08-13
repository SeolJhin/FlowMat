import { describe, expect, it } from 'vitest'
import { Editor } from '../core/Editor'
import { createEllipseElement } from '../elements/EllipseElement'
import { createLineElement } from '../elements/LineElement'
import { createRectangleElement } from '../elements/RectangleElement'
import { createTriangleElement } from '../elements/PolygonElement'
import { getElementBounds } from '../geometry/Bounds'
import { createEmptyEditorDocument, deleteElements, insertElement, selectElements, updateElement } from './EditorDocument'
import { mergeEditorDocumentsById } from './EditorDocumentMerge'
import { deserializeEditorDocument, serializeEditorDocument } from './EditorDocumentSerializer'
import { createElementId, toElementId } from './ElementId'
import { cloneEditorElement } from './EditorElementClone'
import {
  cleanupEmptyEditorGroups,
  expandGroupSelection,
  groupEditorElements,
  ungroupEditorElements,
} from './EditorGroupOperations'

describe('EditorDocument', () => {
  it('creates an empty document with the current schema version', () => {
    const doc = createEmptyEditorDocument()

    expect(doc.schemaVersion).toBe(1)
    expect(doc.elements).toEqual([])
    expect(doc.selectedIds).toEqual([])
    expect(doc.camera).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('inserts elements in z-order', () => {
    const lower = createRectangleElement({
      id: toElementId('rect-lower'),
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      order: 1,
    })
    const upper = createRectangleElement({
      id: toElementId('rect-upper'),
      x: 10,
      y: 20,
      width: 60,
      height: 40,
      order: 10,
    })

    const doc = insertElement(insertElement(createEmptyEditorDocument(), upper), lower)

    expect(doc.elements.map((element) => element.id)).toEqual([lower.id, upper.id])
  })

  it('rejects duplicate element ids', () => {
    const element = createRectangleElement({
      id: toElementId('rect-1'),
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    })
    const doc = insertElement(createEmptyEditorDocument(), element)

    expect(() => insertElement(doc, element)).toThrow('Element already exists')
  })

  it('updates an element immutably', () => {
    const id = toElementId('rect-1')
    const element = createRectangleElement({ id, x: 0, y: 0, width: 100, height: 80 })
    const doc = insertElement(createEmptyEditorDocument(), element)

    const nextDoc = updateElement(doc, id, (current) => ({ ...current, x: 20, y: 30 }))

    expect(doc.elements[0].x).toBe(0)
    expect(nextDoc.elements[0].x).toBe(20)
    expect(nextDoc.elements[0].y).toBe(30)
  })

  it('drops deleted ids from selection', () => {
    const first = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 10, height: 10 })
    const second = createRectangleElement({ id: toElementId('rect-2'), x: 20, y: 20, width: 10, height: 10 })
    const doc = selectElements(
      insertElement(insertElement(createEmptyEditorDocument(), first), second),
      [first.id, second.id],
    )

    const nextDoc = deleteElements(doc, [first.id])

    expect(nextDoc.elements.map((element) => element.id)).toEqual([second.id])
    expect(nextDoc.selectedIds).toEqual([second.id])
  })

  it('detaches connector bindings to a deleted element instead of deleting the line', () => {
    const anchorA = createRectangleElement({ id: toElementId('rect-a'), x: 0, y: 0, width: 40, height: 40 })
    const anchorB = createRectangleElement({ id: toElementId('rect-b'), x: 100, y: 0, width: 40, height: 40 })
    const connector = createLineElement({
      id: toElementId('line-1'),
      start: { x: 40, y: 20 },
      end: { x: 100, y: 20 },
      startBinding: { elementId: anchorA.id, anchor: 'right' },
      endBinding: { elementId: anchorB.id, anchor: 'left' },
    })
    const doc = insertElement(insertElement(insertElement(createEmptyEditorDocument(), anchorA), anchorB), connector)

    const nextDoc = deleteElements(doc, [anchorA.id])
    const remainingLine = nextDoc.elements.find((element) => element.id === connector.id)

    expect(remainingLine).toBeDefined()
    expect(remainingLine).toMatchObject({ startBinding: null, endBinding: { elementId: anchorB.id, anchor: 'left' } })
  })

  it('clones elements with a new id and detached parent', () => {
    const rectangle = createRectangleElement({
      id: toElementId('rect-1'),
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      parentId: toElementId('group-1'),
    })

    expect(cloneEditorElement(rectangle, toElementId('rect-2'), 9)).toMatchObject({
      id: toElementId('rect-2'),
      x: 34,
      y: 44,
      order: 9,
      parentId: null,
    })
  })

  it('groups selected elements as a hidden metadata element and expands group selection to children', () => {
    const first = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 10, height: 10 })
    const second = createRectangleElement({ id: toElementId('rect-2'), x: 20, y: 0, width: 10, height: 10 })
    const doc = {
      ...createEmptyEditorDocument({ nextElementSeq: 7 }),
      elements: [first, second],
    }

    const result = groupEditorElements(doc, [first.id, second.id])
    const group = result.document.elements.find((element) => element.type === 'group')

    expect(group).toMatchObject({ id: createElementId(7, 'group'), hidden: true })
    expect(result.document.elements.filter((element) => element.parentId === group?.id)).toHaveLength(2)
    expect(result.document.nextElementSeq).toBe(8)
    expect(result.selectedIds).toEqual([first.id, second.id])
    expect(expandGroupSelection(result.document, [group!.id])).toEqual([first.id, second.id])
  })

  it('ungroups selected children and removes the group metadata element', () => {
    const first = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 10, height: 10 })
    const second = createRectangleElement({ id: toElementId('rect-2'), x: 20, y: 0, width: 10, height: 10 })
    const grouped = groupEditorElements({
      ...createEmptyEditorDocument({ nextElementSeq: 2 }),
      elements: [first, second],
    }, [first.id, second.id])

    const ungrouped = ungroupEditorElements(grouped.document, [first.id])

    expect(ungrouped.document.elements.some((element) => element.type === 'group')).toBe(false)
    expect(ungrouped.document.elements.every((element) => element.parentId == null)).toBe(true)
    expect(ungrouped.selectedIds).toEqual([first.id, second.id])
  })

  it('cleans up groups with fewer than two remaining children', () => {
    const first = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 10, height: 10 })
    const second = createRectangleElement({ id: toElementId('rect-2'), x: 20, y: 0, width: 10, height: 10 })
    const grouped = groupEditorElements({
      ...createEmptyEditorDocument({ nextElementSeq: 2 }),
      elements: [first, second],
    }, [first.id, second.id])

    const next = cleanupEmptyEditorGroups(deleteElements(grouped.document, [first.id]))

    expect(next.elements.some((element) => element.type === 'group')).toBe(false)
    expect(next.elements[0].parentId).toBeNull()
  })

  it('represents triangles as closed polygon elements', () => {
    const triangle = createTriangleElement({
      id: createElementId(1, 'shape'),
      x: 10,
      y: 20,
      width: 120,
      height: 80,
    })

    expect(triangle.type).toBe('polygon')
    expect(triangle.closed).toBe(true)
    expect(triangle.points).toHaveLength(3)
    expect(getElementBounds(triangle)).toEqual({ x: 10, y: 20, width: 120, height: 80 })
  })

  it('exposes a small editor facade over document mutations', () => {
    const editor = new Editor()
    const id = toElementId('rect-1')
    const element = createRectangleElement({ id, x: 0, y: 0, width: 10, height: 10 })
    const snapshots: number[] = []

    editor.subscribe((doc) => {
      snapshots.push(doc.elements.length)
    })

    editor.insertElement(element)
    editor.selectElements([id])

    expect(editor.getElementById(id)).toEqual(element)
    expect(editor.document.selectedIds).toEqual([id])
    expect(snapshots).toEqual([1, 1])
  })

  it('round-trips supported element types through JSON', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 80, height: 50 })
    const ellipse = createEllipseElement({ id: toElementId('ellipse-1'), x: 100, y: 0, width: 80, height: 50 })
    const triangle = createTriangleElement({ id: toElementId('triangle-1'), x: 200, y: 0, width: 80, height: 70 })
    const line = createLineElement({ id: toElementId('line-1'), start: { x: 300, y: 20 }, end: { x: 380, y: 80 } })
    const doc = selectElements(
      {
        ...createEmptyEditorDocument({ nextElementSeq: 5 }),
        elements: [rectangle, ellipse, triangle, line],
      },
      [triangle.id],
    )

    const roundTripped = deserializeEditorDocument(serializeEditorDocument(doc))

    expect(roundTripped).toEqual(doc)
  })

  it('rejects duplicate ids during deserialization', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 80, height: 50 })
    const doc = {
      ...createEmptyEditorDocument(),
      elements: [rectangle, { ...rectangle }],
    }

    expect(() => deserializeEditorDocument(serializeEditorDocument(doc))).toThrow('Duplicate element id')
  })

  it('rejects selection ids that are not in the document', () => {
    const doc = {
      ...createEmptyEditorDocument(),
      selectedIds: [toElementId('missing')],
    }

    expect(() => serializeEditorDocument(doc)).toThrow('Selected element does not exist')
  })

  it('merges editor documents with overlay elements taking id precedence', () => {
    const baseOnly = createRectangleElement({ id: toElementId('base-only'), x: 0, y: 0, width: 80, height: 50, order: 1 })
    const stale = createRectangleElement({ id: toElementId('same-id'), x: 10, y: 10, width: 80, height: 50, order: 2 })
    const overlay = createEllipseElement({ id: toElementId('same-id'), x: 100, y: 100, width: 80, height: 50, order: 3 })

    const merged = mergeEditorDocumentsById(
      { ...createEmptyEditorDocument({ nextElementSeq: 3 }), elements: [baseOnly, stale] },
      { ...createEmptyEditorDocument({ nextElementSeq: 5 }), elements: [overlay] },
    )

    expect(merged.elements.map((element) => [element.id, element.type])).toEqual([
      ['base-only', 'rectangle'],
      ['same-id', 'ellipse'],
    ])
    expect(merged.nextElementSeq).toBe(5)
  })
})
