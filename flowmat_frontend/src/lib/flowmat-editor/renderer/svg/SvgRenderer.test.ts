import { describe, expect, it } from 'vitest'
import { createRectangleElement } from '../../elements/RectangleElement'
import { toElementId } from '../../model/ElementId'
import { formatNumber, freehandPointsToPath, getElementSvgTransform, pointsToSvgPoints, toSvgRenderNodes } from './SvgRenderer'

describe('SvgRenderer', () => {
  it('sorts visible elements by render order', () => {
    const upper = createRectangleElement({ id: toElementId('upper'), x: 0, y: 0, width: 10, height: 10, order: 10 })
    const lower = createRectangleElement({ id: toElementId('lower'), x: 0, y: 0, width: 10, height: 10, order: 1 })

    expect(toSvgRenderNodes([upper, lower]).map((node) => node.id)).toEqual([lower.id, upper.id])
  })

  it('builds stable transform strings', () => {
    const rectangle = createRectangleElement({
      id: toElementId('rect-1'),
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      rotation: 15,
    })

    expect(getElementSvgTransform(rectangle)).toBe('translate(10 20) rotate(15 50 40)')
  })

  it('formats points and paths without noisy decimals', () => {
    expect(formatNumber(10.5)).toBe('10.5')
    expect(pointsToSvgPoints([{ x: 0, y: 0 }, { x: 10.125, y: 20 }])).toBe('0,0 10.125,20')
    expect(freehandPointsToPath([{ x: 0, y: 0 }, { x: 10, y: 20 }])).toBe('M 0 0 L 10 20')
  })
})
