import type { RectangleElement, ShapeStyle } from '../model/EditorElement'
import { DEFAULT_SHAPE_STYLE } from '../model/EditorElement'
import { createBaseElement, type BaseElementInput } from './elementDefaults'

export interface CreateRectangleElementInput extends BaseElementInput {
  cornerRadius?: number
  style?: Partial<ShapeStyle>
}

export function createRectangleElement(input: CreateRectangleElementInput): RectangleElement {
  return {
    ...createBaseElement(input),
    type: 'rectangle',
    cornerRadius: input.cornerRadius ?? 0,
    style: { ...DEFAULT_SHAPE_STYLE, ...input.style },
  }
}
