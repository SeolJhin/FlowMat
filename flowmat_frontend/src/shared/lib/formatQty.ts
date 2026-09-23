/** Formats a backend BigDecimal quantity for display; null/undefined render as "-". */
export function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })
}
