import { describe, expect, it } from 'vitest'
import { placeTraffic, routeItemsText, routeText } from './transferAnalysisModel'

const item = (itemCode: string, quantity: number, unit: string | null, moves: number) => ({
  itemId: itemCode.toLowerCase(), itemCode, itemName: null, unit, quantity, moves,
})

describe('moves between places', () => {
  it('names the route and what moved along it', () => {
    expect(routeText({ fromLocation: 'DOCK', toLocation: 'SHELF' })).toBe('DOCK → SHELF')
    expect(routeText({ fromLocation: null, toLocation: 'SHELF' })).toBe('no place → SHELF')
    expect(routeItemsText({ items: [item('BOLT', 5, 'kg', 2), item('NUT', 5, 'ea', 1), item('PIN', 0.25, null, 1)] }))
      .toBe('BOLT 5 kg (2), NUT 5 ea, PIN 0.25')
  })

  it('counts each place\'s moves out and in, the busiest first', () => {
    const routes = [
      { fromLocation: 'DOCK', toLocation: 'SHELF', moves: 3, items: [] },
      { fromLocation: 'SHELF', toLocation: 'LINE', moves: 1, items: [] },
      { fromLocation: null, toLocation: 'LINE', moves: 1, items: [] },
    ]
    expect(placeTraffic(routes)).toEqual([
      { place: 'SHELF', out: 1, in: 3 },
      { place: 'DOCK', out: 3, in: 0 },
      { place: 'LINE', out: 0, in: 2 },
      { place: null, out: 1, in: 0 },
    ])
    expect(placeTraffic([])).toEqual([])
  })
})
