import type { Camera } from './Camera'
import { createCamera } from './Camera'
import type { EditorElement } from './EditorElement'
import type { ElementId } from './ElementId'

export const EDITOR_DOCUMENT_SCHEMA_VERSION = 1

export interface EditorDocument {
  schemaVersion: number
  elements: readonly EditorElement[]
  selectedIds: readonly ElementId[]
  camera: Camera
  nextElementSeq: number
}

export function createEmptyEditorDocument(input: Partial<Pick<EditorDocument, 'camera' | 'nextElementSeq'>> = {}): EditorDocument {
  return {
    schemaVersion: EDITOR_DOCUMENT_SCHEMA_VERSION,
    elements: [],
    selectedIds: [],
    camera: createCamera(input.camera),
    nextElementSeq: input.nextElementSeq ?? 1,
  }
}

export function getElementById(doc: EditorDocument, id: ElementId): EditorElement | undefined {
  return doc.elements.find((element) => element.id === id)
}

export function insertElement(doc: EditorDocument, element: EditorElement): EditorDocument {
  if (getElementById(doc, element.id)) {
    throw new Error(`Element already exists: ${element.id}`)
  }
  return {
    ...doc,
    elements: [...doc.elements, element].sort((a, b) => a.order - b.order),
  }
}

export function replaceElement(doc: EditorDocument, nextElement: EditorElement): EditorDocument {
  let replaced = false
  const elements = doc.elements.map((element) => {
    if (element.id !== nextElement.id) return element
    replaced = true
    return nextElement
  })

  if (!replaced) {
    throw new Error(`Element does not exist: ${nextElement.id}`)
  }

  return {
    ...doc,
    elements: elements.sort((a, b) => a.order - b.order),
  }
}

export function updateElement(
  doc: EditorDocument,
  id: ElementId,
  updater: (element: EditorElement) => EditorElement,
): EditorDocument {
  const element = getElementById(doc, id)
  if (!element) {
    throw new Error(`Element does not exist: ${id}`)
  }
  return replaceElement(doc, updater(element))
}

export function deleteElements(doc: EditorDocument, ids: readonly ElementId[]): EditorDocument {
  if (ids.length === 0) return doc

  const idSet = new Set(ids)
  return {
    ...doc,
    elements: doc.elements.filter((element) => !idSet.has(element.id)),
    selectedIds: doc.selectedIds.filter((id) => !idSet.has(id)),
  }
}

export function selectElements(doc: EditorDocument, ids: readonly ElementId[]): EditorDocument {
  const existingIds = new Set(doc.elements.map((element) => element.id))
  return {
    ...doc,
    selectedIds: ids.filter((id) => existingIds.has(id)),
  }
}

export function withCamera(doc: EditorDocument, camera: Camera): EditorDocument {
  return {
    ...doc,
    camera: createCamera(camera),
  }
}
