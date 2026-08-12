import { boxFromPoints } from '../geometry/Box2'
import type { Vec2 } from '../geometry/Vec2'
import type { PolygonElement, ShapeStyle } from '../model/EditorElement'
import { DEFAULT_SHAPE_STYLE } from '../model/EditorElement'
import type { ElementId } from '../model/ElementId'
import { createBaseElement } from './elementDefaults'

export interface CreatePolygonElementInput {
  id: ElementId
  points: readonly Vec2[]
  closed?: boolean
  x?: number
  y?: number
  rotation?: number
  opacity?: number
  parentId?: ElementId | null
  locked?: boolean
  hidden?: boolean
  order?: number
  style?: Partial<ShapeStyle>
}

export function createPolygonElement(input: CreatePolygonElementInput): PolygonElement {
  const rawPoints = input.points.map((point) => ({ x: point.x, y: point.y }))
  const bounds = boxFromPoints(rawPoints)
  const originX = input.x ?? bounds.x
  const originY = input.y ?? bounds.y
  const localPoints =
    input.x == null && input.y == null
      ? rawPoints.map((point) => ({ x: point.x - bounds.x, y: point.y - bounds.y }))
      : rawPoints

  return {
    ...createBaseElement({
      id: input.id,
      x: originX,
      y: originY,
      width: bounds.width,
      height: bounds.height,
      rotation: input.rotation,
      opacity: input.opacity,
      parentId: input.parentId,
      locked: input.locked,
      hidden: input.hidden,
      order: input.order,
    }),
    type: 'polygon',
    points: localPoints,
    closed: input.closed ?? true,
    style: { ...DEFAULT_SHAPE_STYLE, ...input.style },
  }
}

export function createTriangleElement(
  input: Omit<CreatePolygonElementInput, 'points' | 'closed'> & { width: number; height: number },
): PolygonElement {
  return createPolygonElement({
    ...input,
    closed: true,
    points: [
      { x: 0, y: input.height },
      { x: input.width / 2, y: 0 },
      { x: input.width, y: input.height },
    ],
  })
}
