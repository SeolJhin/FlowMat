import type { BaseElement } from '../model/EditorElement'
import type { ElementId } from '../model/ElementId'

export interface BaseElementInput {
  id: ElementId
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  opacity?: number
  parentId?: ElementId | null
  locked?: boolean
  hidden?: boolean
  order?: number
}

export function createBaseElement(input: BaseElementInput): Omit<BaseElement, 'type'> {
  return {
    id: input.id,
    x: input.x,
    y: input.y,
    width: Math.max(0, input.width),
    height: Math.max(0, input.height),
    rotation: input.rotation ?? 0,
    opacity: input.opacity ?? 1,
    parentId: input.parentId ?? null,
    locked: input.locked ?? false,
    hidden: input.hidden ?? false,
    order: input.order ?? 0,
  }
}
