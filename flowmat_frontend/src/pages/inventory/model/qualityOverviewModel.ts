/** Windows the quality overview can show, in days; null is all time. */
export const QUALITY_PERIODS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: null, label: 'All time' },
] as const

/**
 * Where a window of {@code days} starts: local midnight, so today counts as one of the days. Starting at midnight also
 * keeps the value, and so the query, the same all day instead of changing on every render.
 */
export function windowStart(days: number | null, now: Date = new Date()): string | null {
  if (days === null) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))
  return start.toISOString()
}

/** "83.3%", or "–" without inspections. */
export function formatRate(rate: number | null): string {
  return rate === null ? '–' : `${(rate * 100).toFixed(1)}%`
}
