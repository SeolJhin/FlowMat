import type { EllipseElement, ShapeStyle } from '../model/EditorElement'
import { DEFAULT_SHAPE_STYLE } from '../model/EditorElement'
import { createBaseElement, type BaseElementInput } from './elementDefaults'

export interface CreateEllipseElementInput extends BaseElementInput {
  style?: Partial<ShapeStyle>
}

export function createEllipseElement(input: CreateEllipseElementInput): EllipseElement {
  return {
    ...createBaseElement(input),
    type: 'ellipse',
    style: { ...DEFAULT_SHAPE_STYLE, ...input.style },
  }
}
