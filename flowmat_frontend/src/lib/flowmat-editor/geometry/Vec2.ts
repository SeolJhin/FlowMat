export interface Vec2 {
  x: number
  y: number
}

export const ORIGIN: Vec2 = Object.freeze({ x: 0, y: 0 })

export function vec2(x: number, y: number): Vec2 {
  assertFiniteNumber(x, 'x')
  assertFiniteNumber(y, 'y')
  return { x, y }
}

export function addVec2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function subtractVec2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scaleVec2(value: Vec2, scale: number): Vec2 {
  assertFiniteNumber(scale, 'scale')
  return { x: value.x * scale, y: value.y * scale }
}

export function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function nearlyEqualVec2(a: Vec2, b: Vec2, epsilon = 0.000001): boolean {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon
}

function assertFiniteNumber(value: number, name: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`)
  }
}
