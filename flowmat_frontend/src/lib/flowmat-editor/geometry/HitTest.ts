import { getElementBounds } from './Bounds'
import { containsPointInBox } from './Box2'
import type { Vec2 } from './Vec2'
import type { EditorElement, LineElement } from '../model/EditorElement'
import type { ElementId } from '../model/ElementId'

export interface HitTestOptions {
  tolerance?: number
}

const DEFAULT_TOLERANCE = 6

export function hitTestElement(element: EditorElement, point: Vec2, options: HitTestOptions = {}): boolean {
  if (element.hidden) return false

  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE
  const localPoint = toLocalPoint(element, point)

  switch (element.type) {
    case 'rectangle':
    case 'text':
    case 'group':
      return containsPointInBox({ x: 0, y: 0, width: element.width, height: element.height }, localPoint)
    case 'ellipse':
      return hitTestEllipse(element.width, element.height, localPoint)
    case 'polygon':
      return element.closed
        ? hitTestClosedPolygon(element.points, localPoint)
        : hitTestPolyline(element.points, localPoint, tolerance)
    case 'line':
      return hitTestLine(element, localPoint, tolerance)
    case 'freehand':
      return hitTestPolyline(element.points, localPoint, tolerance)
  }
}

export function findTopmostElementAtPoint(
  elements: readonly EditorElement[],
  point: Vec2,
  options: HitTestOptions = {},
): EditorElement | null {
  const ordered = [...elements].sort((a, b) => b.order - a.order)
  return ordered.find((element) => hitTestElement(element, point, options)) ?? null
}

export function findTopmostElementIdAtPoint(
  elements: readonly EditorElement[],
  point: Vec2,
  options: HitTestOptions = {},
): ElementId | null {
  return findTopmostElementAtPoint(elements, point, options)?.id ?? null
}

function toLocalPoint(element: EditorElement, point: Vec2): Vec2 {
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  }
  const radians = (-element.rotation * Math.PI) / 180
  const translated = { x: point.x - center.x, y: point.y - center.y }
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: translated.x * cos - translated.y * sin + element.width / 2,
    y: translated.x * sin + translated.y * cos + element.height / 2,
  }
}

function hitTestEllipse(width: number, height: number, point: Vec2): boolean {
  if (width <= 0 || height <= 0) return false
  const rx = width / 2
  const ry = height / 2
  const dx = point.x - rx
  const dy = point.y - ry
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
}

function hitTestClosedPolygon(points: readonly Vec2[], point: Vec2): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i]
    const b = points[j]
    const intersects = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (intersects) inside = !inside
  }
  return inside
}

function hitTestLine(line: LineElement, point: Vec2, tolerance: number): boolean {
  return distanceToSegment(point, line.start, line.end) <= tolerance
}

function hitTestPolyline(points: readonly Vec2[], point: Vec2, tolerance: number): boolean {
  if (points.length === 0) return false
  if (points.length === 1) return Math.hypot(points[0].x - point.x, points[0].y - point.y) <= tolerance

  for (let index = 1; index < points.length; index += 1) {
    if (distanceToSegment(point, points[index - 1], points[index]) <= tolerance) {
      return true
    }
  }
  return false
}

function distanceToSegment(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y)

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
  const projection = { x: start.x + t * dx, y: start.y + t * dy }
  return Math.hypot(point.x - projection.x, point.y - projection.y)
}

export function getHitTestBounds(element: EditorElement) {
  return getElementBounds(element)
}
