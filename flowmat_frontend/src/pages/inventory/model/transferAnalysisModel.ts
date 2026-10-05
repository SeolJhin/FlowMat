import { formatQty } from '../../../shared/lib/formatQty'
import type { StockTransferAnalysisDto } from '../../../shared/types/api'

type Route = StockTransferAnalysisDto['routes'][number]

/** "DOCK → SHELF", with "no place" for stock kept without one (docs/domain/stock-analysis.md "위치 간 이동"). */
export function routeText(route: Pick<Route, 'fromLocation' | 'toLocation'>): string {
  return `${route.fromLocation ?? 'no place'} → ${route.toLocation ?? 'no place'}`
}

/** "BOLT 5 kg (2), NUT 5 ea": each item's quantity, with its moves when more than one. */
export function routeItemsText(route: Pick<Route, 'items'>): string {
  return route.items
    .map((item) => `${item.itemCode ?? item.itemId} ${formatQty(item.quantity)}${item.unit ? ` ${item.unit}` : ''}${item.moves > 1 ? ` (${item.moves})` : ''}`)
    .join(', ')
}

/** Moves out of and into each place, the busiest first (then by name): where stock is handled most. */
export function placeTraffic(routes: Route[]): { place: string | null; out: number; in: number }[] {
  const byPlace = new Map<string | null, { place: string | null; out: number; in: number }>()
  const at = (place: string | null) => {
    const found = byPlace.get(place) ?? { place, out: 0, in: 0 }
    byPlace.set(place, found)
    return found
  }
  for (const route of routes) {
    at(route.fromLocation).out += route.moves
    at(route.toLocation).in += route.moves
  }
  return [...byPlace.values()].sort((a, b) => b.out + b.in - (a.out + a.in) || (a.place ?? '').localeCompare(b.place ?? ''))
}
