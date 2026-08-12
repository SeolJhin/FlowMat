import type { Vec2 } from './Vec2'

export interface Box2 {
  x: number
  y: number
  width: number
  height: number
}

export const ZERO_BOX: Box2 = Object.freeze({ x: 0, y: 0, width: 0, height: 0 })

export function box2(x: number, y: number, width: number, height: number): Box2 {
  assertFiniteNumber(x, 'x')
  assertFiniteNumber(y, 'y')
  assertFiniteNumber(width, 'width')
  assertFiniteNumber(height, 'height')
  return { x, y, width, height }
}

export function normalizeBox(box: Box2): Box2 {
  const x = box.width < 0 ? box.x + box.width : box.x
  const y = box.height < 0 ? box.y + box.height : box.y
  return {
    x,
    y,
    width: Math.abs(box.width),
    height: Math.abs(box.height),
  }
}

export function boxFromPoints(points: readonly Vec2[]): Box2 {
  if (points.length === 0) return ZERO_BOX

  let left = points[0].x
  let right = points[0].x
  let top = points[0].y
  let bottom = points[0].y

  for (const point of points.slice(1)) {
    left = Math.min(left, point.x)
    right = Math.max(right, point.x)
    top = Math.min(top, point.y)
    bottom = Math.max(bottom, point.y)
  }

  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function containsPointInBox(box: Box2, point: Vec2): boolean {
  const normalized = normalizeBox(box)
  return (
    point.x >= normalized.x &&
    point.x <= normalized.x + normalized.width &&
    point.y >= normalized.y &&
    point.y <= normalized.y + normalized.height
  )
}

export function unionBoxes(boxes: readonly Box2[]): Box2 {
  if (boxes.length === 0) return ZERO_BOX

  const first = normalizeBox(boxes[0])
  let left = first.x
  let top = first.y
  let right = first.x + first.width
  let bottom = first.y + first.height

  for (const rawBox of boxes.slice(1)) {
    const box = normalizeBox(rawBox)
    left = Math.min(left, box.x)
    top = Math.min(top, box.y)
    right = Math.max(right, box.x + box.width)
    bottom = Math.max(bottom, box.y + box.height)
  }

  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function boxCenter(box: Box2): Vec2 {
  const normalized = normalizeBox(box)
  return {
    x: normalized.x + normalized.width / 2,
    y: normalized.y + normalized.height / 2,
  }
}

function assertFiniteNumber(value: number, name: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`)
  }
}
