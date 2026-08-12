import type { ElementId } from '../model/ElementId'
import type { GroupElement } from '../model/EditorElement'
import { createBaseElement, type BaseElementInput } from './elementDefaults'

export interface CreateGroupElementInput extends BaseElementInput {
  childIds: readonly ElementId[]
}

export function createGroupElement(input: CreateGroupElementInput): GroupElement {
  return {
    ...createBaseElement(input),
    type: 'group',
    childIds: [...input.childIds],
  }
}
