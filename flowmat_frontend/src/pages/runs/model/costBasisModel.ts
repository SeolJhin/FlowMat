import type { RunCostBasis } from '../../../shared/types/api'

/** Price certainty and price completeness are independent: a historical price may still be unknown. */
export function costBasisLabel(cost: { costBasis?: RunCostBasis; costBasisAt?: string | null }): string {
  const at = cost.costBasisAt ? new Date(cost.costBasisAt).toLocaleString() : null
  switch (cost.costBasis) {
    case 'CURRENT': return 'Current item prices.'
    case 'HISTORICAL': return at ? `Prices at original finish: ${at}.` : 'Historical price basis unavailable.'
    case 'ESTIMATED': return at
      ? `Estimated prices at original finish: ${at}; some price history is missing.`
      : 'Estimated using current prices: the original finish time is unknown.'
    default: return 'Price basis unavailable.'
  }
}
