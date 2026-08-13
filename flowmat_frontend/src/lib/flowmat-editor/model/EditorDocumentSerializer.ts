import type { Camera } from './Camera'
import { createCamera } from './Camera'
import type { EditorDocument } from './EditorDocument'
import { EDITOR_DOCUMENT_SCHEMA_VERSION } from './EditorDocument'
import type { AnchorSide, ElementBinding, EditorElement, EditorElementType, LineStyle, ShapeStyle, TextStyle } from './EditorElement'
import type { ElementId } from './ElementId'
import { toElementId } from './ElementId'
import type { Vec2 } from '../geometry/Vec2'

export interface SerializedEditorDocument {
  schemaVersion: number
  elements: SerializedEditorElement[]
  selectedIds: string[]
  camera: Camera
  nextElementSeq: number
}

type SerializedElementOf<T extends EditorElement> = Omit<T, 'id' | 'parentId'> & {
  id: string
  parentId: string | null
}

export type SerializedEditorElement = EditorElement extends infer T
  ? T extends EditorElement
    ? SerializedElementOf<T>
    : never
  : never

export function serializeEditorDocument(doc: EditorDocument): string {
  return JSON.stringify(toSerializedEditorDocument(doc))
}

export function toSerializedEditorDocument(doc: EditorDocument): SerializedEditorDocument {
  validateEditorDocument(doc)
  return toPlainDocument(doc)
}

export function deserializeEditorDocument(source: string): EditorDocument {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    throw new Error('EditorDocument JSON is invalid.')
  }

  return fromSerializedEditorDocument(parsed)
}

export function fromSerializedEditorDocument(value: unknown): EditorDocument {
  if (!isRecord(value)) {
    throw new Error('EditorDocument must be an object.')
  }

  const schemaVersion = readNumber(value, 'schemaVersion')
  if (schemaVersion !== EDITOR_DOCUMENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported EditorDocument schemaVersion: ${schemaVersion}`)
  }

  const rawElements = readArray(value, 'elements')
  const elements = rawElements.map(readElement)
  const ids = new Set<string>()
  for (const element of elements) {
    if (ids.has(element.id)) {
      throw new Error(`Duplicate element id: ${element.id}`)
    }
    ids.add(element.id)
  }

  const selectedIds = readArray(value, 'selectedIds').map((id) => toElementId(readStringValue(id, 'selectedIds[]')))
  for (const id of selectedIds) {
    if (!ids.has(id)) {
      throw new Error(`Selected element does not exist: ${id}`)
    }
  }

  const cameraValue = readRecord(value, 'camera')
  const nextElementSeq = readNumber(value, 'nextElementSeq')
  if (!Number.isInteger(nextElementSeq) || nextElementSeq < 0) {
    throw new Error('nextElementSeq must be a non-negative integer.')
  }

  return {
    schemaVersion,
    elements,
    selectedIds,
    camera: createCamera({
      x: readNumber(cameraValue, 'x'),
      y: readNumber(cameraValue, 'y'),
      zoom: readNumber(cameraValue, 'zoom'),
    }),
    nextElementSeq,
  }
}

export function validateEditorDocument(doc: EditorDocument): void {
  fromSerializedEditorDocument(toPlainDocument(doc))
}

function toPlainDocument(doc: EditorDocument): SerializedEditorDocument {
  return {
    schemaVersion: doc.schemaVersion,
    elements: doc.elements.map((element) => ({
      ...element,
      id: element.id,
      parentId: element.parentId,
    })) as SerializedEditorElement[],
    selectedIds: doc.selectedIds.map((id) => id),
    camera: { ...doc.camera },
    nextElementSeq: doc.nextElementSeq,
  }
}

function readElement(value: unknown): EditorElement {
  const record = readRecordValue(value, 'elements[]')
  const type = readElementType(record)
  const base = {
    id: toElementId(readString(record, 'id')),
    type,
    x: readNumber(record, 'x'),
    y: readNumber(record, 'y'),
    width: readNonNegativeNumber(record, 'width'),
    height: readNonNegativeNumber(record, 'height'),
    rotation: readNumber(record, 'rotation'),
    opacity: readOpacity(record),
    parentId: readNullableElementId(record, 'parentId'),
    locked: readBoolean(record, 'locked'),
    hidden: readBoolean(record, 'hidden'),
    order: readNumber(record, 'order'),
  }

  switch (type) {
    case 'rectangle':
      return {
        ...base,
        type,
        cornerRadius: readNonNegativeNumber(record, 'cornerRadius'),
        style: readShapeStyle(record, 'style'),
      }
    case 'ellipse':
      return { ...base, type, style: readShapeStyle(record, 'style') }
    case 'polygon': {
      const points = readPoints(record, 'points')
      if (points.length < 3) {
        throw new Error('PolygonElement requires at least 3 points.')
      }
      return { ...base, type, points, closed: readBoolean(record, 'closed'), style: readShapeStyle(record, 'style') }
    }
    case 'line':
      return {
        ...base,
        type,
        start: readVec2(record, 'start'),
        end: readVec2(record, 'end'),
        style: readLineStyle(record, 'style'),
        startBinding: readNullableBinding(record, 'startBinding'),
        endBinding: readNullableBinding(record, 'endBinding'),
      }
    case 'freehand': {
      const points = readPoints(record, 'points')
      if (points.length < 1) {
        throw new Error('FreehandElement requires at least 1 point.')
      }
      return { ...base, type, points, style: readLineStyle(record, 'style') }
    }
    case 'text':
      return { ...base, type, text: readString(record, 'text'), style: readTextStyle(record, 'style') }
    case 'group':
      return { ...base, type, childIds: readArray(record, 'childIds').map((id) => toElementId(readStringValue(id, 'childIds[]'))) }
  }
}

function readElementType(record: Record<string, unknown>): EditorElementType {
  const type = readString(record, 'type')
  if (
    type === 'rectangle' ||
    type === 'ellipse' ||
    type === 'polygon' ||
    type === 'line' ||
    type === 'freehand' ||
    type === 'text' ||
    type === 'group'
  ) {
    return type
  }
  throw new Error(`Unsupported element type: ${type}`)
}

function readShapeStyle(record: Record<string, unknown>, key: string): ShapeStyle {
  const style = readRecord(record, key)
  return {
    fill: readString(style, 'fill'),
    stroke: readString(style, 'stroke'),
    strokeWidth: readNonNegativeNumber(style, 'strokeWidth'),
    strokeStyle: readStrokeStyle(style),
    opacity: readOpacity(style),
  }
}

function readLineStyle(record: Record<string, unknown>, key: string): LineStyle {
  const style = readRecord(record, key)
  return {
    stroke: readString(style, 'stroke'),
    strokeWidth: readNonNegativeNumber(style, 'strokeWidth'),
    strokeStyle: readStrokeStyle(style),
    opacity: readOpacity(style),
    startArrow: readArrow(style, 'startArrow'),
    endArrow: readArrow(style, 'endArrow'),
  }
}

function readTextStyle(record: Record<string, unknown>, key: string): TextStyle {
  const style = readRecord(record, key)
  return {
    color: readString(style, 'color'),
    fontFamily: readString(style, 'fontFamily'),
    fontSize: readNonNegativeNumber(style, 'fontSize'),
    fontWeight: readNonNegativeNumber(style, 'fontWeight'),
    opacity: readOpacity(style),
  }
}

function readPoints(record: Record<string, unknown>, key: string): Vec2[] {
  return readArray(record, key).map((point) => readVec2Value(point, `${key}[]`))
}

function readVec2(record: Record<string, unknown>, key: string): Vec2 {
  return readVec2Value(record[key], key)
}

function readVec2Value(value: unknown, key: string): Vec2 {
  const record = readRecordValue(value, key)
  return { x: readNumber(record, 'x'), y: readNumber(record, 'y') }
}

function readStrokeStyle(record: Record<string, unknown>): 'solid' | 'dashed' | 'dotted' {
  const value = readString(record, 'strokeStyle')
  if (value === 'solid' || value === 'dashed' || value === 'dotted') return value
  throw new Error(`Unsupported strokeStyle: ${value}`)
}

function readArrow(record: Record<string, unknown>, key: string): 'none' | 'arrow' | undefined {
  const value = record[key]
  if (value == null) return undefined
  const text = readStringValue(value, key)
  if (text === 'none' || text === 'arrow') return text
  throw new Error(`Unsupported arrow value: ${text}`)
}

function readOpacity(record: Record<string, unknown>): number {
  const value = readNumber(record, 'opacity')
  if (value < 0 || value > 1) {
    throw new Error('opacity must be between 0 and 1.')
  }
  return value
}

function readNullableElementId(record: Record<string, unknown>, key: string): ElementId | null {
  const value = record[key]
  if (value == null) return null
  return toElementId(readStringValue(value, key))
}

function readNullableBinding(record: Record<string, unknown>, key: string): ElementBinding | null | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (value === null) return null
  const bindingRecord = readRecordValue(value, key)
  return {
    elementId: toElementId(readString(bindingRecord, 'elementId')),
    anchor: readAnchorSide(bindingRecord, 'anchor'),
  }
}

function readAnchorSide(record: Record<string, unknown>, key: string): AnchorSide {
  const value = readString(record, key)
  if (value === 'top' || value === 'right' || value === 'bottom' || value === 'left') return value
  throw new Error(`Unsupported anchor side: ${value}`)
}

function readNonNegativeNumber(record: Record<string, unknown>, key: string): number {
  const value = readNumber(record, key)
  if (value < 0) {
    throw new Error(`${key} must be non-negative.`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number.`)
  }
  return value
}

function readString(record: Record<string, unknown>, key: string): string {
  return readStringValue(record[key], key)
}

function readStringValue(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} must be a non-empty string.`)
  }
  return value
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new Error(`${key} must be boolean.`)
  }
  return value
}

function readArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array.`)
  }
  return value
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  return readRecordValue(record[key], key)
}

function readRecordValue(value: unknown, key: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${key} must be an object.`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
