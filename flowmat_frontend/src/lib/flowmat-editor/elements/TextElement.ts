import type { TextElement, TextStyle } from '../model/EditorElement'
import { DEFAULT_TEXT_STYLE } from '../model/EditorElement'
import { createBaseElement, type BaseElementInput } from './elementDefaults'

export interface CreateTextElementInput extends BaseElementInput {
  text?: string
  style?: Partial<TextStyle>
}

export function createTextElement(input: CreateTextElementInput): TextElement {
  return {
    ...createBaseElement(input),
    type: 'text',
    text: input.text ?? '',
    style: { ...DEFAULT_TEXT_STYLE, ...input.style },
  }
}
