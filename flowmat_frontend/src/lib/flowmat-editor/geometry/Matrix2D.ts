import type { Vec2 } from './Vec2'

export interface Matrix2D {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export const IDENTITY_MATRIX: Matrix2D = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })

export function translationMatrix(x: number, y: number): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y }
}

export function scaleMatrix(scaleX: number, scaleY = scaleX): Matrix2D {
  return { a: scaleX, b: 0, c: 0, d: scaleY, e: 0, f: 0 }
}

export function rotationMatrix(radians: number): Matrix2D {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
}

export function multiplyMatrix(left: Matrix2D, right: Matrix2D): Matrix2D {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

export function transformPoint(matrix: Matrix2D, point: Vec2): Vec2 {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  }
}

export function invertMatrix(matrix: Matrix2D): Matrix2D {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  if (Math.abs(determinant) < Number.EPSILON) {
    throw new Error('Matrix is not invertible.')
  }

  const a = matrix.d / determinant
  const b = -matrix.b / determinant
  const c = -matrix.c / determinant
  const d = matrix.a / determinant
  const e = (matrix.c * matrix.f - matrix.d * matrix.e) / determinant
  const f = (matrix.b * matrix.e - matrix.a * matrix.f) / determinant

  return { a, b, c, d, e, f }
}
