/**
 * The moments a value trend looks at: the end of each of the last {@code months} months (local time), oldest first,
 * then the end of today. They depend only on the date, so they stay the same all day.
 */
export function trendMoments(months: number, now: Date = new Date()): { label: string; at: string }[] {
  const moments: { label: string; at: string }[] = []
  for (let back = months; back >= 1; back--) {
    // Day 0 of a month is the last day of the month before.
    const end = new Date(now.getFullYear(), now.getMonth() - back + 1, 0, 23, 59, 59, 999)
    moments.push({ label: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`, at: end.toISOString() })
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  moments.push({ label: 'today', at: today.toISOString() })
  return moments
}

/** Each value with its change from the one before; the first has none. */
export function withChanges(values: (number | null)[]): { value: number | null; change: number | null }[] {
  return values.map((value, index) => {
    const before = index > 0 ? values[index - 1] : null
    return { value, change: value === null || before === null || before === undefined ? null : Math.round((value - before) * 10000) / 10000 }
  })
}
