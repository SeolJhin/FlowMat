type Dates = { plannedStartAt: string | null; plannedEndAt: string | null }

/** Local editor value includes seconds. Unedited values keep the original API precision and offset. */
export function localDateInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
}

export function rescheduleDates(order: Dates, start: string, end: string) {
  function instant(value: string, original: string | null, field: string) {
    if (value === localDateInput(original)) return original
    if (!value) return null
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) throw new Error(`${field} must be a valid date.`)
    return date.toISOString()
  }
  const plannedStartAt = instant(start, order.plannedStartAt, 'plannedStartAt')
  const plannedEndAt = instant(end, order.plannedEndAt, 'plannedEndAt')
  if (plannedStartAt && plannedEndAt && new Date(plannedEndAt) < new Date(plannedStartAt)) {
    throw new Error('plannedEndAt must not be before plannedStartAt.')
  }
  return { expectedPlannedStartAt: order.plannedStartAt, expectedPlannedEndAt: order.plannedEndAt, plannedStartAt, plannedEndAt }
}
