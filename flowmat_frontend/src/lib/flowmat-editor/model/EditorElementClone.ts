import type { EditorElement } from './EditorElement'
import type { ElementId } from './ElementId'
import type { Vec2 } from '../geometry/Vec2'

const DEFAULT_CLONE_OFFSET: Vec2 = Object.freeze({ x: 24, y: 24 })

export function cloneEditorElement(
  element: EditorElement,
  id: ElementId,
  order: number,
  offset: Vec2 = DEFAULT_CLONE_OFFSET,
): EditorElement {
  switch (element.type) {
    case 'rectangle':
    case 'ellipse':
    case 'text':
      return { ...element, id, x: element.x + offset.x, y: element.y + offset.y, order, parentId: null }
    case 'polygon':
      return {
        ...element,
        id,
        x: element.x + offset.x,
        y: element.y + offset.y,
        order,
        parentId: null,
        points: element.points.map((point) => ({ ...point })),
      }
    case 'freehand':
      return {
        ...element,
        id,
        x: element.x + offset.x,
        y: element.y + offset.y,
        order,
        parentId: null,
        points: element.points.map((point) => ({ ...point })),
      }
    case 'line':
      return {
        ...element,
        id,
        x: element.x + offset.x,
        y: element.y + offset.y,
        order,
        parentId: null,
        start: { ...element.start },
        end: { ...element.end },
      }
    case 'group':
      return {
        ...element,
        id,
        x: element.x + offset.x,
        y: element.y + offset.y,
        order,
        parentId: null,
        childIds: [],
      }
  }
}
