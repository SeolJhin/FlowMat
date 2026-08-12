import { describe, expect, it } from 'vitest'
import { createLineElement } from '../elements/LineElement'
import { createRectangleElement } from '../elements/RectangleElement'
import { boxFromPoints, containsPointInBox, normalizeBox, unionBoxes } from './Box2'
import { findTopmostElementIdAtPoint, hitTestElement } from './HitTest'
import { invertMatrix, multiplyMatrix, rotationMatrix, transformPoint, translationMatrix } from './Matrix2D'
import { moveLineEndpoint, resizeBoxFromHandle, resizeElementToBox, resizeElementWithinBox, rotateElement } from './Transform'
import { nearlyEqualVec2, vec2 } from './Vec2'
import { canvasToScreenPoint, createCamera, screenToCanvasPoint, zoomCameraAtScreenPoint } from '../model/Camera'
import { toElementId } from '../model/ElementId'

describe('Box2', () => {
  it('normalizes reverse drag boxes', () => {
    expect(normalizeBox({ x: 120, y: 80, width: -100, height: -40 })).toEqual({
      x: 20,
      y: 40,
      width: 100,
      height: 40,
    })
  })

  it('creates bounds from points', () => {
    expect(boxFromPoints([vec2(10, 40), vec2(-5, 20), vec2(30, 100)])).toEqual({
      x: -5,
      y: 20,
      width: 35,
      height: 80,
    })
  })

  it('unions multiple boxes', () => {
    expect(
      unionBoxes([
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: -5, width: 5, height: 30 },
      ]),
    ).toEqual({ x: 0, y: -5, width: 25, height: 30 })
  })

  it('checks point containment against normalized boxes', () => {
    expect(containsPointInBox({ x: 10, y: 10, width: -10, height: -10 }, vec2(5, 5))).toBe(true)
    expect(containsPointInBox({ x: 10, y: 10, width: -10, height: -10 }, vec2(15, 5))).toBe(false)
  })
})

describe('Matrix2D', () => {
  it('composes transforms in DOM matrix order', () => {
    const matrix = multiplyMatrix(translationMatrix(10, 20), rotationMatrix(Math.PI / 2))

    expect(nearlyEqualVec2(transformPoint(matrix, vec2(10, 0)), vec2(10, 30))).toBe(true)
  })

  it('inverts a composed transform', () => {
    const matrix = multiplyMatrix(translationMatrix(100, -40), rotationMatrix(Math.PI / 4))
    const point = vec2(12, 30)
    const transformed = transformPoint(matrix, point)

    expect(nearlyEqualVec2(transformPoint(invertMatrix(matrix), transformed), point)).toBe(true)
  })
})

describe('Camera', () => {
  it('converts between screen and canvas coordinates', () => {
    const camera = createCamera({ x: 100, y: 50, zoom: 2 })
    const screen = canvasToScreenPoint(vec2(20, 30), camera)

    expect(screen).toEqual({ x: 140, y: 110 })
    expect(screenToCanvasPoint(screen, camera)).toEqual({ x: 20, y: 30 })
  })

  it('keeps the anchor point stable while zooming', () => {
    const camera = createCamera({ x: 100, y: 50, zoom: 2 })
    const anchor = vec2(200, 150)
    const canvasBefore = screenToCanvasPoint(anchor, camera)
    const nextCamera = zoomCameraAtScreenPoint(camera, anchor, 4)

    expect(screenToCanvasPoint(anchor, nextCamera)).toEqual(canvasBefore)
  })
})

describe('HitTest', () => {
  it('detects points inside rectangle elements', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 20, y: 30, width: 100, height: 80 })

    expect(hitTestElement(rectangle, vec2(60, 60))).toBe(true)
    expect(hitTestElement(rectangle, vec2(10, 60))).toBe(false)
  })

  it('detects points near line elements', () => {
    const line = createLineElement({ id: toElementId('line-1'), start: vec2(10, 10), end: vec2(110, 10) })

    expect(hitTestElement(line, vec2(60, 13), { tolerance: 4 })).toBe(true)
    expect(hitTestElement(line, vec2(60, 20), { tolerance: 4 })).toBe(false)
  })

  it('returns the highest ordered hit element', () => {
    const lower = createRectangleElement({ id: toElementId('lower'), x: 0, y: 0, width: 100, height: 100, order: 1 })
    const upper = createRectangleElement({ id: toElementId('upper'), x: 0, y: 0, width: 100, height: 100, order: 2 })

    expect(findTopmostElementIdAtPoint([lower, upper], vec2(50, 50))).toBe(upper.id)
  })
})

describe('Transform', () => {
  it('resizes a box from a southeast handle', () => {
    expect(resizeBoxFromHandle({ x: 10, y: 20, width: 100, height: 80 }, 'se', vec2(140, 130))).toEqual({
      x: 10,
      y: 20,
      width: 130,
      height: 110,
    })
  })

  it('scales polygon points when resizing to a new box', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 10, y: 20, width: 100, height: 80 })
    const resized = resizeElementToBox(rectangle, { x: 0, y: 0, width: 200, height: 160 })

    expect(resized).toMatchObject({ x: 0, y: 0, width: 200, height: 160 })
  })

  it('resizes an element relative to a selection box', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 60, y: 50, width: 40, height: 30 })
    const resized = resizeElementWithinBox(
      rectangle,
      { x: 20, y: 30, width: 120, height: 80 },
      { x: 10, y: 10, width: 240, height: 160 },
    )

    expect(resized).toMatchObject({ x: 90, y: 50, width: 80, height: 60 })
  })

  it('moves line endpoints and normalizes the line bounds', () => {
    const line = createLineElement({ id: toElementId('line-1'), start: vec2(40, 40), end: vec2(120, 80) })
    const movedStart = moveLineEndpoint(line, 'start', vec2(20, 100))
    const movedEnd = moveLineEndpoint(movedStart, 'end', vec2(180, 10))

    expect(movedStart).toMatchObject({
      x: 20,
      y: 80,
      width: 100,
      height: 20,
      start: { x: 0, y: 20 },
      end: { x: 100, y: 0 },
    })
    expect(movedEnd).toMatchObject({
      x: 20,
      y: 10,
      width: 160,
      height: 90,
      start: { x: 0, y: 90 },
      end: { x: 160, y: 0 },
    })
  })

  it('normalizes rotation into a positive degree range', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 100, height: 80 })

    expect(rotateElement(rectangle, -15).rotation).toBe(345)
    expect(rotateElement(rectangle, 375).rotation).toBe(15)
  })
})
