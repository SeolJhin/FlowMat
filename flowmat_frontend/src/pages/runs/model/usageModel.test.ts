import { describe, expect, it } from 'vitest'
import { basisLabel, formatVariance, varianceTone, yieldLabel } from './usageModel'

const line = { variance: 3, variancePercent: 37.5, unit: 'kg', actual: 11 }

describe('formatVariance', () => {
  it('signs the quantity and the percentage', () => {
    expect(formatVariance(line)).toBe('+3 kg (+37.5%)')
    expect(formatVariance({ ...line, variance: -0.5, variancePercent: -5 })).toBe('−0.5 kg (−5%)')
    expect(formatVariance({ ...line, variance: 0, variancePercent: 0 })).toBe('0 kg (0%)')
  })

  it('leaves out the percentage for items not in the BOM and says when it cannot be worked out', () => {
    expect(formatVariance({ ...line, variance: 0.1, variancePercent: null })).toBe('+0.1 kg')
    expect(formatVariance({ ...line, variance: null, variancePercent: null, actual: null })).toBe('unit?')
    expect(formatVariance({ ...line, variance: null, variancePercent: null })).toBe('–')
  })
})

describe('varianceTone', () => {
  it('tells over, under and even apart', () => {
    expect(varianceTone({ variance: 1 })).toBe('over')
    expect(varianceTone({ variance: -1 })).toBe('under')
    expect(varianceTone({ variance: 0 })).toBe('even')
    expect(varianceTone({ variance: null })).toBe('unknown')
  })
})

describe('basisLabel', () => {
  it('says whether the standard follows the actual or the planned output', () => {
    expect(basisLabel({ basisQuantity: 16, basisIsActual: true })).toBe('Standard for the 16 made.')
    expect(basisLabel({ basisQuantity: 20, basisIsActual: false })).toContain('20 planned')
    expect(basisLabel({ basisQuantity: null, basisIsActual: false })).toBe('No output to work the standard out for.')
  })
})

describe('yieldLabel', () => {
  it('compares what was made with the plan once there is an output', () => {
    expect(yieldLabel({ basisQuantity: 16, basisIsActual: true, plannedOutputQty: 20 })).toBe('Made 16 of 20 planned (80%).')
    expect(yieldLabel({ basisQuantity: 21, basisIsActual: true, plannedOutputQty: 20 })).toBe('Made 21 of 20 planned (105%).')
    expect(yieldLabel({ basisQuantity: 1, basisIsActual: true, plannedOutputQty: 3 })).toBe('Made 1 of 3 planned (33.3%).')
    expect(yieldLabel({ basisQuantity: 20, basisIsActual: false, plannedOutputQty: 20 })).toBeNull()
    expect(yieldLabel({ basisQuantity: 5, basisIsActual: true, plannedOutputQty: null })).toBeNull()
  })
})
