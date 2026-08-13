import { getAnchorPoint } from '../geometry/AnchorPoints'
import type { Vec2 } from '../geometry/Vec2'
import { createLineElement } from '../elements/LineElement'
import type { EditorDocument } from './EditorDocument'
import { replaceElement } from './EditorDocument'
import type { ElementBinding, LineElement } from './EditorElement'
import type { ElementId } from './ElementId'

/**
 * Recomputes every connector line bound (via `startBinding`/`endBinding`) to one of
 * `movedIds`, so it keeps following its anchor shapes after they move/resize/rotate.
 * Mirrors rhwp's `update_connectors_in_section` — called after every drag frame.
 */
export function recomputeBoundLines(document: EditorDocument, movedIds: readonly ElementId[]): EditorDocument {
  if (movedIds.length === 0) return document
  const movedSet = new Set(movedIds)
  let nextDocument = document

  for (const element of document.elements) {
    if (element.type !== 'line' || !isBoundToAny(element, movedSet)) continue
    const updated = recomputeConnectorLine(element, nextDocument)
    if (updated) nextDocument = replaceElement(nextDocument, updated)
  }

  return nextDocument
}

function isBoundToAny(element: LineElement, movedIds: ReadonlySet<ElementId>): boolean {
  return (
    (element.startBinding != null && movedIds.has(element.startBinding.elementId)) ||
    (element.endBinding != null && movedIds.has(element.endBinding.elementId))
  )
}

function recomputeConnectorLine(element: LineElement, document: EditorDocument): LineElement | null {
  const start = resolveBindingPoint(element.startBinding, document) ?? worldPoint(element, element.start)
  const end = resolveBindingPoint(element.endBinding, document) ?? worldPoint(element, element.end)

  return createLineElement({
    id: element.id,
    start,
    end,
    // A bound connector's orientation is defined entirely by its two anchors now —
    // any earlier manual rotation would otherwise double up on top of it.
    rotation: 0,
    opacity: element.opacity,
    parentId: element.parentId,
    locked: element.locked,
    hidden: element.hidden,
    order: element.order,
    style: element.style,
    startBinding: element.startBinding,
    endBinding: element.endBinding,
  })
}

function resolveBindingPoint(binding: ElementBinding | null | undefined, document: EditorDocument): Vec2 | null {
  if (!binding) return null
  const target = document.elements.find((item) => item.id === binding.elementId)
  if (!target) return null
  return getAnchorPoint(target, binding.anchor)
}

function worldPoint(element: LineElement, local: Vec2): Vec2 {
  return { x: element.x + local.x, y: element.y + local.y }
}
