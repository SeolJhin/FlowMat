import { describe, expect, it } from 'vitest'
import type { BuildableQuantityDto } from '../../../shared/types/api'
import { shortBy, usableByMaterial } from './buildableModel'

const buildable: BuildableQuantityDto = {
  bomId: 'b1',
  targetItemId: 'bread',
  targetUnit: 'ea',
  baseQuantity: 10,
  buildable: 24,
  limitingItemId: 'flour',
  lines: [
    { childItemId: 'flour', itemUnit: 'kg', perBatch: 5, usable: 12.4, buildable: 24 },
    { childItemId: 'salt', itemUnit: 'kg', perBatch: 0.2, usable: 1, buildable: 50 },
  ],
}

describe('usableByMaterial', () => {
  it('maps each material to its usable stock', () => {
    const usable = usableByMaterial(buildable)
    expect(usable.get('flour')).toBe(12.4)
    expect(usable.get('salt')).toBe(1)
  })

  it('is empty before the answer arrives', () => {
    expect(usableByMaterial(undefined).size).toBe(0)
  })
})

describe('shortBy', () => {
  it('is what the quantity needs beyond the stock, without float noise', () => {
    expect(shortBy(15, 12.4)).toBe(2.6)
  })

  it('is 0 when the stock covers it', () => {
    expect(shortBy(0.6, 1)).toBe(0)
    expect(shortBy(12.4, 12.4)).toBe(0)
  })

  it('is null when the stock is not known', () => {
    expect(shortBy(5, undefined)).toBeNull()
  })
})
