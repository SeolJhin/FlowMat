import { describe, expect, it } from 'vitest'
import { snapPoint, snapValue } from './SnapManager'

describe('SnapManager', () => {
  it('snaps values and points to the configured grid', () => {
    expect(snapValue(23, { enabled: true, gridSize: 16 })).toBe(16)
    expect(snapPoint({ x: 25, y: 39 }, { enabled: true, gridSize: 16 })).toEqual({ x: 32, y: 32 })
  })

  it('returns original values when snapping is disabled', () => {
    expect(snapValue(23, { enabled: false, gridSize: 16 })).toBe(23)
    expect(snapPoint({ x: 25, y: 39 }, { enabled: false, gridSize: 16 })).toEqual({ x: 25, y: 39 })
  })
})
