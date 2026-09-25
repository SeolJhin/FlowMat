import type { StockAnalysisLineDto } from '../../../shared/types/api'

export const ANALYSIS_WINDOWS = [7, 30, 90, 180, 365] as const

export type AnalysisSort = 'idle' | 'cover' | 'consumed' | 'value'

export const ANALYSIS_SORTS: { value: AnalysisSort; label: string }[] = [
  { value: 'idle', label: 'Idle longest' },
  { value: 'cover', label: 'Runs out first' },
  { value: 'consumed', label: 'Used most' },
  { value: 'value', label: 'Most value used' },
]

const byCode = (a: StockAnalysisLineDto, b: StockAnalysisLineDto) => a.itemCode.localeCompare(b.itemCode)

/** Unknowns go last: no idle time means nothing came in, no cover means nothing was used. */
export function sortAnalysis(lines: StockAnalysisLineDto[], sort: AnalysisSort): StockAnalysisLineDto[] {
  const last = (value: number | null, missing: number) => (value === null ? missing : value)
  const sorted = [...lines]
  if (sort === 'idle') sorted.sort((a, b) => last(b.idleDays, -1) - last(a.idleDays, -1) || byCode(a, b))
  if (sort === 'cover') sorted.sort((a, b) => last(a.daysOfCover, Infinity) - last(b.daysOfCover, Infinity) || byCode(a, b))
  if (sort === 'consumed') sorted.sort((a, b) => b.consumedQuantity - a.consumedQuantity || byCode(a, b))
  if (sort === 'value') sorted.sort((a, b) => last(b.consumedValue, -1) - last(a.consumedValue, -1) || byCode(a, b))
  return sorted
}

/** Lines idle for at least {@code minDays}; all of them when it is 0. */
export function filterIdle(lines: StockAnalysisLineDto[], minDays: number): StockAnalysisLineDto[] {
  return minDays <= 0 ? lines : lines.filter((line) => line.idleDays !== null && line.idleDays >= minDays)
}

/** "today", "1 day", "12 days", or a dash when nothing has come in or gone out. */
export function idleLabel(days: number | null): string {
  if (days === null) return '\u2013'
  if (days === 0) return 'today'
  return days === 1 ? '1 day' : `${days} days`
}

/** "105 days", or "not used" without consumption. */
export function coverLabel(line: Pick<StockAnalysisLineDto, 'daysOfCover'>): string {
  if (line.daysOfCover === null) return 'not used'
  return `${Math.floor(line.daysOfCover)} days`
}

/** Headline numbers: stock idle for at least {@code idleDays} and its value, and items that run out within their lead time. */
export function analysisTotals(lines: StockAnalysisLineDto[], idleDays: number) {
  const idle = lines.filter((line) => line.idleDays !== null && line.idleDays >= idleDays && line.onHandQuantity > 0)
  return {
    idleItems: idle.length,
    idleValue: idle.reduce((sum, line) => sum + (line.stockValue ?? 0), 0),
    idleUncosted: idle.filter((line) => line.stockValue === null).length,
    shortCover: lines.filter((line) => line.coverBelowLeadTime).length,
    classA: lines.filter((line) => line.abcClass === 'A').length,
  }
}
