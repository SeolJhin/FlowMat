import { describe, expect, it } from 'vitest'
import {
  computeAlignedPosition,
  computeDistributedPositions,
  computeSelectionBounds,
  type LayoutBox,
} from './annotationLayout'

const boxes: LayoutBox[] = [
  { id: 'a', x: 0, y: 0, width: 100, height: 50 },
  { id: 'b', x: 200, y: 300, width: 40, height: 40 },
  { id: 'c', x: 50, y: 150, width: 60, height: 20 },
]

describe('computeSelectionBounds', () => {
  it('returns zeroed bounds for an empty selection', () => {
    expect(computeSelectionBounds([])).toEqual({ left: 0, top: 0, right: 0, bottom: 0 })
  })

  it('wraps the tightest box around all boxes', () => {
    expect(computeSelectionBounds(boxes)).toEqual({
      left: 0,
      top: 0,
      right: 240,
      bottom: 340,
    })
  })
})

describe('computeAlignedPosition', () => {
  const bounds = computeSelectionBounds(boxes)
  const box = boxes[2] // x:50 y:150 w:60 h:20

  it('aligns to the left edge', () => {
    expect(computeAlignedPosition(box, bounds, 'left')).toEqual({ x: 0, y: 150 })
  })

  it('aligns to the right edge', () => {
    expect(computeAlignedPosition(box, bounds, 'right')).toEqual({ x: 180, y: 150 })
  })

  it('centers horizontally', () => {
    expect(computeAlignedPosition(box, bounds, 'centerX')).toEqual({ x: 90, y: 150 })
  })

  it('aligns to the top edge', () => {
    expect(computeAlignedPosition(box, bounds, 'top')).toEqual({ x: 50, y: 0 })
  })

  it('aligns to the bottom edge', () => {
    expect(computeAlignedPosition(box, bounds, 'bottom')).toEqual({ x: 50, y: 320 })
  })

  it('centers vertically', () => {
    expect(computeAlignedPosition(box, bounds, 'centerY')).toEqual({ x: 50, y: 160 })
  })
})

describe('computeDistributedPositions', () => {
  it('leaves selections of fewer than 3 boxes untouched', () => {
    const pair = boxes.slice(0, 2)
    expect(computeDistributedPositions(pair, 'horizontal')).toEqual(
      pair.map((b) => ({ id: b.id, x: b.x, y: b.y }))
    )
  })

  it('spaces three boxes evenly along the horizontal axis', () => {
    const row: LayoutBox[] = [
      { id: 'first', x: 0, y: 0, width: 10, height: 10 },
      { id: 'middle', x: 40, y: 0, width: 10, height: 10 },
      { id: 'last', x: 90, y: 0, width: 10, height: 10 },
    ]

    const result = computeDistributedPositions(row, 'horizontal')

    expect(result.find((r) => r.id === 'first')).toEqual({ id: 'first', x: 0, y: 0 })
    expect(result.find((r) => r.id === 'last')).toEqual({ id: 'last', x: 90, y: 0 })
    // total span is 0..100, three 10-wide boxes leave 70 of gap split into 2 equal gaps of 35;
    // middle starts after first box (10) plus one gap (35) = 45
    expect(result.find((r) => r.id === 'middle')?.x).toBeCloseTo(45)
  })

  it('spaces boxes evenly along the vertical axis regardless of input order', () => {
    const column: LayoutBox[] = [
      { id: 'last', x: 0, y: 100, width: 10, height: 10 },
      { id: 'first', x: 0, y: 0, width: 10, height: 10 },
      { id: 'middle', x: 0, y: 20, width: 10, height: 10 },
    ]

    const result = computeDistributedPositions(column, 'vertical')

    expect(result.find((r) => r.id === 'first')).toEqual({ id: 'first', x: 0, y: 0 })
    expect(result.find((r) => r.id === 'last')).toEqual({ id: 'last', x: 0, y: 100 })
    expect(result.find((r) => r.id === 'middle')?.y).toBeCloseTo(50)
  })
})
