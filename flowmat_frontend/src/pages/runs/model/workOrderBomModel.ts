/**
 * The project calendar day (YYYY-MM-DD) of a planned start typed in this browser's time zone: the day the server uses to
 * pick the work order's BOM revision (docs/domain/multi-level-bom.md, project time zone). Empty when either is missing
 * or invalid.
 */
export function projectDay(localInput: string, timeZone: string | undefined): string {
  if (!localInput || !timeZone) return ''
  const date = new Date(localInput)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  } catch {
    return ''
  }
}
