import { describe, expect, it } from 'vitest'
import { createRectangleElement } from '../elements/RectangleElement'
import { toElementId } from '../model/ElementId'
import { findNearestAnchor, getAnchorPoint, getAnchorPoints, getNearestAnchor } from './AnchorPoints'
import { vec2 } from './Vec2'

describe('AnchorPoints', () => {
  it('places the 4 connection points at the edge midpoints of an unrotated element', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 100, height: 40 })

    expect(getAnchorPoint(rectangle, 'top')).toEqual({ x: 50, y: 0 })
    expect(getAnchorPoint(rectangle, 'right')).toEqual({ x: 100, y: 20 })
    expect(getAnchorPoint(rectangle, 'bottom')).toEqual({ x: 50, y: 40 })
    expect(getAnchorPoint(rectangle, 'left')).toEqual({ x: 0, y: 20 })
  })

  it('rotates connection points around the element center', () => {
    const square = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 100, height: 100, rotation: 90 })

    // A 90deg rotation moves the unrotated "top" edge midpoint (50,0) to where
    // the unrotated "right" edge midpoint (100,50) used to be.
    const top = getAnchorPoint(square, 'top')
    expect(top.x).toBeCloseTo(100)
    expect(top.y).toBeCloseTo(50)
  })

  it('lists all 4 anchor points for an element', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 100, height: 40 })
    expect(getAnchorPoints(rectangle).map((hit) => hit.side)).toEqual(['top', 'right', 'bottom', 'left'])
  })

  it('finds the nearest single-element anchor within a threshold', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 100, height: 40 })

    expect(getNearestAnchor(rectangle, vec2(98, 20), 10)?.side).toBe('right')
    expect(getNearestAnchor(rectangle, vec2(500, 500), 10)).toBeNull()
  })

  it('finds the nearest anchor across a whole element list, excluding a given element', () => {
    const near = createRectangleElement({ id: toElementId('near'), x: 0, y: 0, width: 40, height: 40 })
    const far = createRectangleElement({ id: toElementId('far'), x: 200, y: 200, width: 40, height: 40 })

    const match = findNearestAnchor([near, far], vec2(21, 1), 10)
    expect(match?.elementId).toBe(near.id)
    expect(match?.side).toBe('top')

    expect(findNearestAnchor([near, far], vec2(21, 1), 10, near.id)).toBeNull()
  })
})
