import { createGroupElement } from '../elements/GroupElement'
import { getSelectedElementBounds } from '../selection/SelectionManager'
import { insertElement, selectElements, type EditorDocument } from './EditorDocument'
import type { EditorElement, GroupElement } from './EditorElement'
import { createElementId, type ElementId } from './ElementId'

export function expandGroupSelection(document: EditorDocument, ids: readonly ElementId[]): ElementId[] {
  const byId = elementsById(document.elements)
  const nextIds: ElementId[] = []

  const addId = (id: ElementId) => {
    const element = byId.get(id)
    if (!element || element.type === 'group' || nextIds.includes(id)) return
    nextIds.push(id)
  }

  for (const id of ids) {
    const element = byId.get(id)
    if (!element) continue
    if (element.type === 'group') {
      for (const childId of getGroupChildIds(document, element)) addId(childId)
      continue
    }
    const group = element.parentId ? byId.get(element.parentId) : null
    if (group?.type === 'group') {
      for (const childId of getGroupChildIds(document, group)) addId(childId)
      continue
    }
    addId(id)
  }

  return nextIds
}

export function groupEditorElements(
  document: EditorDocument,
  selectedIds: readonly ElementId[],
): { document: EditorDocument; selectedIds: ElementId[] } {
  const childIds = expandGroupSelection(document, selectedIds)
  if (childIds.length < 2) {
    return { document: selectElements(document, childIds), selectedIds: childIds }
  }

  const selectedDocument = selectElements(document, childIds)
  const bounds = getSelectedElementBounds(selectedDocument)
  if (!bounds) {
    return { document: selectedDocument, selectedIds: childIds }
  }

  const existingIds = new Set(document.elements.map((element) => element.id))
  let nextSequence = Math.max(1, document.nextElementSeq)
  while (existingIds.has(createElementId(nextSequence, 'group'))) nextSequence += 1
  const groupId = createElementId(nextSequence, 'group')
  const childSet = new Set(childIds)
  const group = createGroupElement({
    id: groupId,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    order: Math.max(0, ...document.elements.map((element) => element.order)) + 1,
    hidden: true,
    childIds,
  })

  const nextDocument = cleanupEmptyEditorGroups(insertElement({
    ...document,
    elements: document.elements.map((element) =>
      childSet.has(element.id) ? { ...element, parentId: groupId } : element,
    ),
    nextElementSeq: nextSequence + 1,
  }, group))

  return {
    document: selectElements(nextDocument, childIds),
    selectedIds: childIds,
  }
}

export function ungroupEditorElements(
  document: EditorDocument,
  selectedIds: readonly ElementId[],
): { document: EditorDocument; selectedIds: ElementId[] } {
  const byId = elementsById(document.elements)
  const groupIds = new Set<ElementId>()

  for (const id of selectedIds) {
    const element = byId.get(id)
    if (!element) continue
    if (element.type === 'group') {
      groupIds.add(element.id)
      continue
    }
    if (element.parentId && byId.get(element.parentId)?.type === 'group') {
      groupIds.add(element.parentId)
    }
  }

  if (groupIds.size === 0) {
    return { document: selectElements(document, selectedIds), selectedIds: [...selectedIds] }
  }

  const releasedIds = document.elements
    .filter((element) => element.type !== 'group' && element.parentId && groupIds.has(element.parentId))
    .map((element) => element.id)

  const nextDocument = selectElements({
    ...document,
    elements: document.elements
      .filter((element) => !(element.type === 'group' && groupIds.has(element.id)))
      .map((element) => (
        element.parentId && groupIds.has(element.parentId) ? { ...element, parentId: null } : element
      )),
  }, releasedIds)

  return {
    document: nextDocument,
    selectedIds: releasedIds,
  }
}

export function cleanupEmptyEditorGroups(document: EditorDocument): EditorDocument {
  const childIdsByParent = new Map<ElementId, ElementId[]>()
  for (const element of document.elements) {
    if (element.type === 'group' || !element.parentId) continue
    const ids = childIdsByParent.get(element.parentId) ?? []
    ids.push(element.id)
    childIdsByParent.set(element.parentId, ids)
  }

  const activeGroupIds = new Set<ElementId>()
  for (const element of document.elements) {
    if (element.type !== 'group') continue
    const childIds = childIdsByParent.get(element.id) ?? []
    if (childIds.length >= 2) activeGroupIds.add(element.id)
  }

  return {
    ...document,
    elements: document.elements
      .filter((element) => element.type !== 'group' || activeGroupIds.has(element.id))
      .map((element) => {
        if (element.type === 'group') {
          return { ...element, childIds: childIdsByParent.get(element.id) ?? [] }
        }
        if (element.parentId && !activeGroupIds.has(element.parentId)) {
          return { ...element, parentId: null }
        }
        return element
      }),
    selectedIds: document.selectedIds.filter((id) =>
      document.elements.some((element) => element.id === id && element.type !== 'group'),
    ),
  }
}

function getGroupChildIds(document: EditorDocument, group: GroupElement): ElementId[] {
  const byId = elementsById(document.elements)
  const ids = new Set<ElementId>(group.childIds)
  for (const element of document.elements) {
    if (element.parentId === group.id) ids.add(element.id)
  }
  return [...ids].filter((id) => {
    const element = byId.get(id)
    return element != null && element.type !== 'group'
  })
}

function elementsById(elements: readonly EditorElement[]) {
  return new Map(elements.map((element) => [element.id, element]))
}
