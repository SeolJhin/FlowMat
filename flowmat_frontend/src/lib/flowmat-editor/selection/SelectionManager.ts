import { getElementBounds } from '../geometry/Bounds'
import { normalizeBox, unionBoxes, type Box2 } from '../geometry/Box2'
import type { EditorElement } from '../model/EditorElement'
import type { EditorDocument } from '../model/EditorDocument'
import type { ElementId } from '../model/ElementId'

export function getSelectedElementIds(doc: EditorDocument): ElementId[] {
  const existingIds = new Set(doc.elements.map((element) => element.id))
  return doc.selectedIds.filter((id) => existingIds.has(id))
}

export function getSelectedElementBounds(doc: EditorDocument): Box2 | null {
  const selectedIds = new Set(getSelectedElementIds(doc))
  const boxes = doc.elements.filter((element) => selectedIds.has(element.id)).map(getElementBounds)
  return boxes.length === 0 ? null : unionBoxes(boxes)
}

export function findElementsInBox(elements: readonly EditorElement[], box: Box2): ElementId[] {
  const normalizedBox = normalizeBox(box)
  return elements
    .filter((element) => !element.hidden && intersectsBox(normalizeBox(getElementBounds(element)), normalizedBox))
    .map((element) => element.id)
}

export function setSelection(doc: EditorDocument, ids: readonly ElementId[]): EditorDocument {
  const existingIds = new Set(doc.elements.map((element) => element.id))
  const nextIds: ElementId[] = []
  for (const id of ids) {
    if (existingIds.has(id) && !nextIds.includes(id)) {
      nextIds.push(id)
    }
  }
  return { ...doc, selectedIds: nextIds }
}

export function toggleSelection(doc: EditorDocument, id: ElementId): EditorDocument {
  return doc.selectedIds.includes(id)
    ? { ...doc, selectedIds: doc.selectedIds.filter((selectedId) => selectedId !== id) }
    : setSelection(doc, [...doc.selectedIds, id])
}

function intersectsBox(a: Box2, b: Box2): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
}
