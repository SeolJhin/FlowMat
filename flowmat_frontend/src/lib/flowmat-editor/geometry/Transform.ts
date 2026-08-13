import type { Vec2 } from './Vec2'
import { createLineElement } from '../elements/LineElement'
import type { EditorElement } from '../model/EditorElement'
import type { LineElement } from '../model/EditorElement'
import { getElementBounds } from './Bounds'
import { boxCenter, normalizeBox, type Box2 } from './Box2'

export function translateElement<T extends EditorElement>(element: T, delta: Vec2): T {
  return {
    ...element,
    x: element.x + delta.x,
    y: element.y + delta.y,
  }
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export function resizeBoxFromHandle(box: Box2, handle: ResizeHandle, point: Vec2, minSize = 8): Box2 {
  let left = box.x
  let top = box.y
  let right = box.x + box.width
  let bottom = box.y + box.height

  if (handle.includes('w')) left = point.x
  if (handle.includes('e')) right = point.x
  if (handle.includes('n')) top = point.y
  if (handle.includes('s')) bottom = point.y

  const next = normalizeBox({ x: left, y: top, width: right - left, height: bottom - top })
  return {
    x: next.x,
    y: next.y,
    width: Math.max(minSize, next.width),
    height: Math.max(minSize, next.height),
  }
}

export function resizeElementToBox<T extends EditorElement>(element: T, nextBox: Box2): T {
  const currentBox = getElementBounds(element)
  const widthScale = currentBox.width === 0 ? 1 : nextBox.width / currentBox.width
  const heightScale = currentBox.height === 0 ? 1 : nextBox.height / currentBox.height

  switch (element.type) {
    case 'rectangle':
    case 'ellipse':
    case 'text':
    case 'group':
      return { ...element, x: nextBox.x, y: nextBox.y, width: nextBox.width, height: nextBox.height } as T
    case 'polygon':
      return {
        ...element,
        x: nextBox.x,
        y: nextBox.y,
        width: nextBox.width,
        height: nextBox.height,
        points: element.points.map((point) => ({ x: point.x * widthScale, y: point.y * heightScale })),
      } as T
    case 'freehand':
      return {
        ...element,
        x: nextBox.x,
        y: nextBox.y,
        width: nextBox.width,
        height: nextBox.height,
        points: element.points.map((point) => ({ x: point.x * widthScale, y: point.y * heightScale })),
      } as T
    case 'line':
      return {
        ...element,
        x: nextBox.x,
        y: nextBox.y,
        width: nextBox.width,
        height: nextBox.height,
        start: { x: element.start.x * widthScale, y: element.start.y * heightScale },
        end: { x: element.end.x * widthScale, y: element.end.y * heightScale },
      } as T
  }
}

export function resizeElementWithinBox<T extends EditorElement>(element: T, baseBox: Box2, nextBox: Box2): T {
  const currentBox = getElementBounds(element)
  const widthScale = baseBox.width === 0 ? 1 : nextBox.width / baseBox.width
  const heightScale = baseBox.height === 0 ? 1 : nextBox.height / baseBox.height
  return resizeElementToBox(element, {
    x: nextBox.x + (currentBox.x - baseBox.x) * widthScale,
    y: nextBox.y + (currentBox.y - baseBox.y) * heightScale,
    width: currentBox.width * widthScale,
    height: currentBox.height * heightScale,
  })
}

/**
 * Resize a single rotated element by handle-drag, keeping the corner/edge opposite
 * the dragged handle visually pinned in world space (rhwp's `calcResizedBboxRotated`
 * technique). `resizeElementWithinBox`'s plain axis-aligned math is only correct for
 * rotation === 0 — a rotated shape's on-screen handles are rotated too (see
 * `SelectionHandles`), so the drag point has to be read in the shape's local,
 * unrotated frame before the existing resize math applies, and the resulting box
 * has to be re-anchored back into world space afterward.
 */
export function resizeRotatedElementFromHandle<T extends EditorElement>(
  element: T,
  baseBounds: Box2,
  handle: ResizeHandle,
  point: Vec2,
  minSize = 8,
): T {
  const rotation = element.rotation
  const center = boxCenter(baseBounds)
  const localPoint = rotateVector(subtractVec(point, center), -rotation)
  const localPointAbsolute = { x: center.x + localPoint.x, y: center.y + localPoint.y }
  const nextBox = resizeBoxFromHandle(baseBounds, handle, localPointAbsolute, minSize)

  const desiredAnchor = worldAnchorPoint(baseBounds, handle, center, rotation)
  const naiveCenter = boxCenter(nextBox)
  const naiveAnchorOffset = rotateVector(anchorOffsetFromCenter(nextBox, handle), rotation)
  const naiveAnchor = { x: naiveCenter.x + naiveAnchorOffset.x, y: naiveCenter.y + naiveAnchorOffset.y }

  const correctedBox: Box2 = {
    ...nextBox,
    x: nextBox.x + (desiredAnchor.x - naiveAnchor.x),
    y: nextBox.y + (desiredAnchor.y - naiveAnchor.y),
  }
  return resizeElementToBox(element, correctedBox)
}

function worldAnchorPoint(box: Box2, handle: ResizeHandle, center: Vec2, rotation: number): Vec2 {
  const offset = rotateVector(anchorOffsetFromCenter(box, handle), rotation)
  return { x: center.x + offset.x, y: center.y + offset.y }
}

/** The box-local point (relative to its own center) that a handle drag keeps fixed. */
function anchorOffsetFromCenter(box: Box2, handle: ResizeHandle): Vec2 {
  const x = handle.includes('w') ? box.width : 0
  const y = handle.includes('n') ? box.height : 0
  return { x: x - box.width / 2, y: y - box.height / 2 }
}

function subtractVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

function rotateVector(v: Vec2, degrees: number): Vec2 {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos }
}

export function rotateElement<T extends EditorElement>(element: T, rotation: number): T {
  return {
    ...element,
    rotation: normalizeRotation(rotation),
  }
}

export type LineEndpoint = 'start' | 'end'

export function moveLineEndpoint(element: LineElement, endpoint: LineEndpoint, point: Vec2): LineElement {
  if (element.rotation !== 0) return element

  const start = {
    x: element.x + element.start.x,
    y: element.y + element.start.y,
  }
  const end = {
    x: element.x + element.end.x,
    y: element.y + element.end.y,
  }

  return createLineElement({
    id: element.id,
    start: endpoint === 'start' ? point : start,
    end: endpoint === 'end' ? point : end,
    rotation: element.rotation,
    opacity: element.opacity,
    parentId: element.parentId,
    locked: element.locked,
    hidden: element.hidden,
    order: element.order,
    style: element.style,
    // Dragging one endpoint by hand detaches only that side from its anchor shape;
    // the other side keeps following its binding on the next recompute.
    startBinding: endpoint === 'start' ? null : element.startBinding,
    endBinding: endpoint === 'end' ? null : element.endBinding,
  })
}

export function normalizeRotation(rotation: number): number {
  const normalized = rotation % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export function angleBetween(center: Vec2, point: Vec2): number {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
}
