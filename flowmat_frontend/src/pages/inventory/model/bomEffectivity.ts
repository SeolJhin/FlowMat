/** Dates remain ISO calendar days; no browser time zone or Date conversion is involved. */
export function validBomPeriod(from: string, to: string): string | null {
  for (const value of [from, to]) {
    if (!value) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.slice(0, 4) === '0000') return 'Enter valid effective dates.'
    const [year, month, day] = value.split('-').map(Number)
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) return 'Enter valid effective dates.'
  }
  return from && to && to < from ? 'Effective to must not be before effective from.' : null
}
