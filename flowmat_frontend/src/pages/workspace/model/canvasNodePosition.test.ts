import { describe, expect, it } from 'vitest'
import { canvasNodePosition } from './canvasNodePosition'

describe('canvas position reconciliation', () => {
  it('applies saved layout positions to existing nodes', () => {
    expect(canvasNodePosition({ x: 0, y: 148 }, { x: 80, y: 80 }, {
      position: { x: 80, y: 80 },
    })).toEqual({ x: 0, y: 148 })
  })

  it.each([{ x: 80, y: 148 }, { x: 240, y: 80 }])('applies a change to either coordinate: %j', (incoming) => {
    expect(canvasNodePosition(incoming, { x: 80, y: 80 }, {
      position: { x: 80, y: 80 },
    })).toEqual(incoming)
  })

  it('keeps a drag in progress when a different server position arrives', () => {
    expect(canvasNodePosition({ x: 0, y: 148 }, { x: 80, y: 80 }, {
      position: { x: 209.5, y: 95 }, dragging: true,
    })).toEqual({ x: 209.5, y: 95 })
  })

  it('keeps an unsaved position through selection, presence and unrelated refetches', () => {
    expect(canvasNodePosition({ x: 80, y: 80 }, { x: 80, y: 80 }, {
      position: { x: 209.5, y: 95 }, dragging: false,
    })).toEqual({ x: 209.5, y: 95 })
  })

  it('uses the saved rounded position once the drag save is acknowledged', () => {
    expect(canvasNodePosition({ x: 210, y: 95 }, { x: 80, y: 80 }, {
      position: { x: 209.5, y: 95 }, dragging: false,
    })).toEqual({ x: 210, y: 95 })
  })

  it('places a new node at its incoming position', () => {
    expect(canvasNodePosition({ x: 0, y: 296 }, undefined, undefined)).toEqual({ x: 0, y: 296 })
  })

  it('uses the incoming position when there is no prior server snapshot', () => {
    expect(canvasNodePosition({ x: 0, y: 296 }, undefined, {
      position: { x: 80, y: 80 },
    })).toEqual({ x: 0, y: 296 })
  })
})
