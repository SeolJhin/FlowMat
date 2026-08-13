import type { Box2 } from './Box2'
import { getElementBounds } from './Bounds'
import { distanceBetween } from './Vec2'
import type { Vec2 } from './Vec2'
import type { AnchorSide, EditorElement } from '../model/EditorElement'
import type { ElementId } from '../model/ElementId'

const ANCHOR_SIDES: readonly AnchorSide[] = ['top', 'right', 'bottom', 'left']

export interface AnchorHit {
  side: AnchorSide
  point: Vec2
}

/** World-space position of one of an element's 4 connection points (rotation-aware). */
export function getAnchorPoint(element: EditorElement, side: AnchorSide): Vec2 {
  const bounds = getElementBounds(element)
  const local = anchorLocalPoint(bounds, side)
  if (element.rotation === 0) return local

  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  const radians = (element.rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = local.x - center.x
  const dy = local.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

/** All 4 connection points of an element, in world space. */
export function getAnchorPoints(element: EditorElement): AnchorHit[] {
  return ANCHOR_SIDES.map((side) => ({ side, point: getAnchorPoint(element, side) }))
}

/** Closest connection point to `point` within `threshold` px, or null if none is close enough. */
export function getNearestAnchor(
  element: EditorElement,
  point: Vec2,
  threshold = 14,
): AnchorHit | null {
  let nearest: (AnchorHit & { distance: number }) | null = null
  for (const anchor of getAnchorPoints(element)) {
    const distance = distanceBetween(anchor.point, point)
    if (!nearest || distance < nearest.distance) {
      nearest = { ...anchor, distance }
    }
  }
  if (!nearest || nearest.distance > threshold) return null
  return { side: nearest.side, point: nearest.point }
}

export interface AnchorMatch extends AnchorHit {
  elementId: ElementId
}

/** Nearest connection point across a whole element list — the drag-to-connect magnet target. */
export function findNearestAnchor(
  elements: readonly EditorElement[],
  point: Vec2,
  threshold = 14,
  excludeElementId?: ElementId | null,
): AnchorMatch | null {
  let nearest: (AnchorMatch & { distance: number }) | null = null
  for (const element of elements) {
    if (element.hidden || element.id === excludeElementId) continue
    const hit = getNearestAnchor(element, point, threshold)
    if (!hit) continue
    const distance = distanceBetween(hit.point, point)
    if (!nearest || distance < nearest.distance) {
      nearest = { elementId: element.id, side: hit.side, point: hit.point, distance }
    }
  }
  if (!nearest) return null
  return { elementId: nearest.elementId, side: nearest.side, point: nearest.point }
}

function anchorLocalPoint(bounds: Box2, side: AnchorSide): Vec2 {
  switch (side) {
    case 'top':
      return { x: bounds.x + bounds.width / 2, y: bounds.y }
    case 'right':
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }
    case 'bottom':
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }
    case 'left':
      return { x: bounds.x, y: bounds.y + bounds.height / 2 }
  }
}
