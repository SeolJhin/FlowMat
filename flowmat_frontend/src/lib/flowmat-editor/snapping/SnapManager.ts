import type { Vec2 } from '../geometry/Vec2'

export interface SnapOptions {
  enabled: boolean
  gridSize: number
}

export function snapValue(value: number, options: SnapOptions): number {
  if (!options.enabled || options.gridSize <= 0) return value
  return Math.round(value / options.gridSize) * options.gridSize
}

export function snapPoint(point: Vec2, options: SnapOptions): Vec2 {
  return {
    x: snapValue(point.x, options),
    y: snapValue(point.y, options),
  }
}
