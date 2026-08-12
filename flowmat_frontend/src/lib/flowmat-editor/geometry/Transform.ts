import type { Vec2 } from './Vec2'
import { createLineElement } from '../elements/LineElement'
import type { EditorElement } from '../model/EditorElement'
import type { LineElement } from '../model/EditorElement'
import { getElementBounds } from './Bounds'
import { normalizeBox, type Box2 } from './Box2'

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
  })
}

export function normalizeRotation(rotation: number): number {
  const normalized = rotation % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export function angleBetween(center: Vec2, point: Vec2): number {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
}
