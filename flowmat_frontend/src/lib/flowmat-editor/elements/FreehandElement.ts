import { boxFromPoints } from '../geometry/Box2'
import type { Vec2 } from '../geometry/Vec2'
import type { FreehandElement, LineStyle } from '../model/EditorElement'
import { DEFAULT_LINE_STYLE } from '../model/EditorElement'
import type { ElementId } from '../model/ElementId'
import { createBaseElement } from './elementDefaults'

export interface CreateFreehandElementInput {
  id: ElementId
  points: readonly Vec2[]
  rotation?: number
  opacity?: number
  parentId?: ElementId | null
  locked?: boolean
  hidden?: boolean
  order?: number
  style?: Partial<LineStyle>
}

export function createFreehandElement(input: CreateFreehandElementInput): FreehandElement {
  const rawPoints = input.points.map((point) => ({ x: point.x, y: point.y }))
  const bounds = boxFromPoints(rawPoints)
  const points = rawPoints.map((point) => ({ x: point.x - bounds.x, y: point.y - bounds.y }))

  return {
    ...createBaseElement({
      id: input.id,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: input.rotation,
      opacity: input.opacity,
      parentId: input.parentId,
      locked: input.locked,
      hidden: input.hidden,
      order: input.order,
    }),
    type: 'freehand',
    points,
    style: { ...DEFAULT_LINE_STYLE, ...input.style },
  }
}
