import { normalizeBox } from '../geometry/Box2'
import type { Vec2 } from '../geometry/Vec2'
import { createRectangleElement } from '../elements/RectangleElement'
import type { RectangleElement, ShapeStyle } from '../model/EditorElement'
import type { ElementId } from '../model/ElementId'

export interface RectangleDrag {
  origin: Vec2
  current: Vec2
}

export interface CreateRectangleFromDragInput {
  id: ElementId
  drag: RectangleDrag
  order?: number
  minSize?: number
  style?: Partial<ShapeStyle>
}

export function createRectangleFromDrag(input: CreateRectangleFromDragInput): RectangleElement | null {
  const minSize = input.minSize ?? 4
  const box = normalizeBox({
    x: input.drag.origin.x,
    y: input.drag.origin.y,
    width: input.drag.current.x - input.drag.origin.x,
    height: input.drag.current.y - input.drag.origin.y,
  })

  if (box.width < minSize || box.height < minSize) {
    return null
  }

  return createRectangleElement({
    id: input.id,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    order: input.order,
    style: input.style,
  })
}
