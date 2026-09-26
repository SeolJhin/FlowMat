import type { LotDto } from '../../../shared/types/api'

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export interface ExpiryWeek {
  /** First and last day of the week, both included, as local dates. */
  from: string
  to: string
  lots: LotDto[]
}

/**
 * LOTs that still hold stock, are not closed and have an expiry date, by when they run out: already expired, in each of
 * the next {@code weeks} weeks counted from today (today is day one of the first week), or later. Each group is in
 * expiry order, so the one to use first comes first.
 */
export function expiryOutlook(lots: LotDto[], today: Date = new Date(), weeks = 8): { expired: LotDto[]; weeks: ExpiryWeek[]; later: number } {
  const dated = lots
    .filter((lot) => lot.expiryDate !== null && lot.quantityOnHand > 0 && lot.lotStatus !== 'closed')
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? '') || a.lotNo.localeCompare(b.lotNo))
  const start = localDate(today)
  const buckets: ExpiryWeek[] = []
  for (let week = 0; week < weeks; week++) {
    buckets.push({
      from: localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + week * 7)),
      to: localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + week * 7 + 6)),
      lots: [],
    })
  }
  const expired: LotDto[] = []
  let later = 0
  for (const lot of dated) {
    const date = lot.expiryDate as string
    if (date < start) {
      expired.push(lot)
      continue
    }
    const bucket = buckets.find((week) => date >= week.from && date <= week.to)
    if (bucket) bucket.lots.push(lot)
    else later += 1
  }
  return { expired, weeks: buckets, later }
}
