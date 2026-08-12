import type { Vec2 } from '../geometry/Vec2'
import type { ElementId } from './ElementId'

export type EditorElementType = 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'freehand' | 'text' | 'group'

export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

export interface ShapeStyle {
  fill: string
  stroke: string
  strokeWidth: number
  strokeStyle: StrokeStyle
  opacity: number
}

export interface LineStyle {
  stroke: string
  strokeWidth: number
  strokeStyle: StrokeStyle
  opacity: number
  startArrow?: 'none' | 'arrow'
  endArrow?: 'none' | 'arrow'
}

export interface TextStyle {
  color: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  opacity: number
}

export interface BaseElement {
  id: ElementId
  type: EditorElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  parentId: ElementId | null
  locked: boolean
  hidden: boolean
  order: number
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle'
  cornerRadius: number
  style: ShapeStyle
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse'
  style: ShapeStyle
}

export interface PolygonElement extends BaseElement {
  type: 'polygon'
  points: readonly Vec2[]
  closed: boolean
  style: ShapeStyle
}

export interface LineElement extends BaseElement {
  type: 'line'
  start: Vec2
  end: Vec2
  style: LineStyle
}

export interface FreehandElement extends BaseElement {
  type: 'freehand'
  points: readonly Vec2[]
  style: LineStyle
}

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  style: TextStyle
}

export interface GroupElement extends BaseElement {
  type: 'group'
  childIds: readonly ElementId[]
}

export type EditorElement =
  | RectangleElement
  | EllipseElement
  | PolygonElement
  | LineElement
  | FreehandElement
  | TextElement
  | GroupElement

export const DEFAULT_SHAPE_STYLE: ShapeStyle = Object.freeze({
  fill: '#ffffff',
  stroke: '#111827',
  strokeWidth: 1,
  strokeStyle: 'solid',
  opacity: 1,
})

export const DEFAULT_LINE_STYLE: LineStyle = Object.freeze({
  stroke: '#111827',
  strokeWidth: 1,
  strokeStyle: 'solid',
  opacity: 1,
  startArrow: 'none',
  endArrow: 'none',
})

export const DEFAULT_TEXT_STYLE: TextStyle = Object.freeze({
  color: '#111827',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  fontWeight: 400,
  opacity: 1,
})
