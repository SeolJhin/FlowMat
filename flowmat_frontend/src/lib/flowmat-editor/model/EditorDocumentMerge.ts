import { createEmptyEditorDocument, type EditorDocument } from './EditorDocument'

export function mergeEditorDocumentsById(
  baseDocument: EditorDocument,
  overlayDocument?: EditorDocument,
): EditorDocument {
  if (!overlayDocument || overlayDocument.elements.length === 0) return baseDocument

  const overlayIds = new Set(overlayDocument.elements.map((element) => element.id))
  const baseOnlyElements = baseDocument.elements.filter((element) => !overlayIds.has(element.id))

  return {
    ...createEmptyEditorDocument({
      camera: overlayDocument.camera,
      nextElementSeq: Math.max(baseDocument.nextElementSeq, overlayDocument.nextElementSeq),
    }),
    elements: [...baseOnlyElements, ...overlayDocument.elements].sort((a, b) => a.order - b.order),
  }
}
