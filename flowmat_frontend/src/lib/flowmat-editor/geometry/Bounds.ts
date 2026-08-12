import { boxFromPoints, type Box2 } from './Box2'
import type { EditorElement } from '../model/EditorElement'

export function getElementBounds(element: EditorElement): Box2 {
  switch (element.type) {
    case 'rectangle':
    case 'ellipse':
    case 'text':
    case 'group':
      return { x: element.x, y: element.y, width: element.width, height: element.height }
    case 'polygon':
    case 'freehand':
      return boxFromPoints(element.points.map((point) => ({ x: element.x + point.x, y: element.y + point.y })))
    case 'line':
      return boxFromPoints([
        { x: element.x + element.start.x, y: element.y + element.start.y },
        { x: element.x + element.end.x, y: element.y + element.end.y },
      ])
  }
}
