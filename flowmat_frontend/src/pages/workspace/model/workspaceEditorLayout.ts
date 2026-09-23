import { recomputeBoundLines, type EditorDocument, type ElementId } from '../../../lib/flowmat-editor'
import {
  computeAlignedPosition,
  computeDistributedPositions,
  computeSelectionBounds,
  type AlignDirection,
  type DistributeAxis,
  type LayoutBox,
} from '../../../entities/canvas-annotation/model/annotationLayout'

export function alignWorkspaceEditorElements(
  document: EditorDocument,
  selectedIds: readonly ElementId[],
  direction: AlignDirection,
): EditorDocument {
  const boxes = selectedLayoutBoxes(document, selectedIds)
  if (boxes.length < 2) return document
  const bounds = computeSelectionBounds(boxes)
  return applyLayoutTargets(document, new Map(boxes.map((box) => [box.id, computeAlignedPosition(box, bounds, direction)])))
}

export function distributeWorkspaceEditorElements(
  document: EditorDocument,
  selectedIds: readonly ElementId[],
  axis: DistributeAxis,
): EditorDocument {
  const boxes = selectedLayoutBoxes(document, selectedIds)
  if (boxes.length < 3) return document
  return applyLayoutTargets(document, new Map(computeDistributedPositions(boxes, axis).map((position) => [position.id, position])))
}

function selectedLayoutBoxes(document: EditorDocument, selectedIds: readonly ElementId[]): LayoutBox[] {
  const selected = new Set(selectedIds)
  return document.elements.filter((element) => selected.has(element.id))
    .map(({ id, x, y, width, height }) => ({ id, x, y, width, height }))
}

function applyLayoutTargets(
  document: EditorDocument,
  targets: ReadonlyMap<string, { x: number; y: number }>,
): EditorDocument {
  const movedIds: ElementId[] = []
  const elements = document.elements.map((element) => {
    const target = targets.get(element.id)
    if (!target || (target.x === element.x && target.y === element.y)) return element
    movedIds.push(element.id)
    return { ...element, x: target.x, y: target.y }
  })
  if (movedIds.length === 0) return document
  return recomputeBoundLines({ ...document, elements }, movedIds)
}
