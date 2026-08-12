import { boxFromPoints } from '../geometry/Box2'
import type { Vec2 } from '../geometry/Vec2'
import type { LineElement, LineStyle } from '../model/EditorElement'
import { DEFAULT_LINE_STYLE } from '../model/EditorElement'
import type { ElementId } from '../model/ElementId'
import { createBaseElement } from './elementDefaults'

export interface CreateLineElementInput {
  id: ElementId
  start: Vec2
  end: Vec2
  rotation?: number
  opacity?: number
  parentId?: ElementId | null
  locked?: boolean
  hidden?: boolean
  order?: number
  style?: Partial<LineStyle>
}

export function createLineElement(input: CreateLineElementInput): LineElement {
  const bounds = boxFromPoints([input.start, input.end])
  const start = { x: input.start.x - bounds.x, y: input.start.y - bounds.y }
  const end = { x: input.end.x - bounds.x, y: input.end.y - bounds.y }
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
    type: 'line',
    start,
    end,
    style: { ...DEFAULT_LINE_STYLE, ...input.style },
  }
}
