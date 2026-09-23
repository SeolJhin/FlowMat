import type { EditorDocument, ElementId } from '../../../lib/flowmat-editor'

export interface WorkspaceEditorSelectionCapabilities {
  selectionKind: 'none' | 'backend' | 'annotation' | 'mixed'
  canAlign: boolean
  canDistribute: boolean
  canGroup: boolean
  canUngroup: boolean
}

export function splitWorkspaceEditorSelection(
  backendDocument: EditorDocument,
  annotationDocument: EditorDocument,
  selectedIds: readonly ElementId[],
): { backendIds: ElementId[]; annotationIds: ElementId[] } {
  const backendIds = new Set(backendDocument.elements.map((element) => element.id))
  const annotationIds = new Set(annotationDocument.elements.map((element) => element.id))
  const split = { backendIds: [] as ElementId[], annotationIds: [] as ElementId[] }

  for (const id of new Set(selectedIds)) {
    if (backendIds.has(id)) split.backendIds.push(id)
    else if (annotationIds.has(id)) split.annotationIds.push(id)
  }
  return split
}

export function getWorkspaceEditorSelectionCapabilities(
  editable: boolean,
  backendDocument: EditorDocument,
  annotationDocument: EditorDocument,
  selectedIds: readonly ElementId[],
): WorkspaceEditorSelectionCapabilities {
  const { backendIds, annotationIds } = splitWorkspaceEditorSelection(backendDocument, annotationDocument, selectedIds)
  const selectionKind = backendIds.length > 0
    ? annotationIds.length > 0 ? 'mixed' : 'backend'
    : annotationIds.length > 0 ? 'annotation' : 'none'
  const sameStorage = selectionKind === 'backend' || selectionKind === 'annotation'
  const count = backendIds.length + annotationIds.length
  const backendById = new Map(backendDocument.elements.map((element) => [element.id, element]))
  const annotationById = new Map(annotationDocument.elements.map((element) => [element.id, element]))
  const hasBackendGroup = backendIds.some((id) => {
    const element = backendById.get(id)!
    return element.type === 'group' || (element.parentId != null && backendById.get(element.parentId)?.type === 'group')
  })
  // Legacy groups have no metadata element: their members share a synthetic parent ID.
  const hasAnnotationGroup = annotationIds.some((id) => Boolean(annotationById.get(id)?.parentId))

  return {
    selectionKind,
    canAlign: editable && sameStorage && count >= 2,
    canDistribute: editable && sameStorage && count >= 3,
    canGroup: editable && (backendIds.length >= 2 || annotationIds.length >= 2),
    canUngroup: editable && (hasBackendGroup || hasAnnotationGroup),
  }
}
