import type {
  DowntimeType,
  EquipmentAvailabilityDto,
  EquipmentCalendarInput,
  EquipmentDowntimeDto,
  EquipmentDowntimeInput,
  EquipmentScheduleDto,
} from '../../../entities/catalog/api/useEquipment'
import type { EquipmentDto } from '../../../shared/types/api'

/** ISO day numbers and their short names, Monday first. */
export const DAYS: readonly (readonly [number, string])[] = [
  [1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun'],
]

export const DOWNTIME_TYPES: DowntimeType[] = ['maintenance', 'breakdown', 'other']

export interface CalendarForm {
  shiftStart: string
  shiftEnd: string
  workDays: number[]
}

export const DEFAULT_CALENDAR_FORM: CalendarForm = { shiftStart: '09:00', shiftEnd: '18:00', workDays: [1, 2, 3, 4, 5] }

export interface DowntimeForm {
  downtimeType: DowntimeType
  /** datetime-local values, local time. */
  startsAt: string
  endsAt: string
  reason: string
}

export const EMPTY_DOWNTIME_FORM: DowntimeForm = { downtimeType: 'maintenance', startsAt: '', endsAt: '', reason: '' }

/** The saved calendar as a form, or a weekday day shift to start from. */
export function calendarForm(schedule: EquipmentScheduleDto | undefined): CalendarForm {
  const calendar = schedule?.calendar
  return calendar
    ? { shiftStart: calendar.shiftStart.slice(0, 5), shiftEnd: calendar.shiftEnd.slice(0, 5), workDays: [...calendar.workDays] }
    : DEFAULT_CALENDAR_FORM
}

export function toggleDay(days: number[], day: number): number[] {
  return days.includes(day) ? days.filter((one) => one !== day) : [...days, day].sort((a, b) => a - b)
}

export function calendarPayload(form: CalendarForm): { input: EquipmentCalendarInput; error: null } | { input: null; error: string } {
  const time = /^\d{2}:\d{2}$/
  if (!time.test(form.shiftStart) || !time.test(form.shiftEnd)) return { input: null, error: 'Enter when the shift starts and ends.' }
  if (form.workDays.length === 0) return { input: null, error: 'Choose at least one work day.' }
  const workDays = [...new Set(form.workDays)].sort((a, b) => a - b)
  return { input: { shiftStart: form.shiftStart, shiftEnd: form.shiftEnd, workDays }, error: null }
}

/** "Mon–Fri", "Mon, Wed, Fri", "Mon–Wed, Sat" or "Every day"; three or more days in a row become a range. */
export function dayList(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  if (sorted.length === 7) return 'Every day'
  const name = (day: number) => DAYS.find(([number]) => number === day)?.[1] ?? String(day)
  const parts: string[] = []
  for (let index = 0; index < sorted.length; ) {
    let end = index
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[end] + 1) end += 1
    if (end - index >= 2) parts.push(`${name(sorted[index])}–${name(sorted[end])}`)
    else for (let one = index; one <= end; one += 1) parts.push(name(sorted[one]))
    index = end + 1
  }
  return parts.join(', ')
}

export function formatHours(hours: number): string {
  return `${Number(hours.toFixed(2))} h`
}

/** One line for the calendar, e.g. "09:00–17:00 · Mon–Fri · 8 h a shift". */
export function shiftSummary(calendar: EquipmentScheduleDto['calendar']): string {
  if (!calendar) return 'No calendar: available around the clock.'
  const start = calendar.shiftStart.slice(0, 5)
  const end = calendar.shiftEnd.slice(0, 5)
  const times = start === end ? 'All day' : `${start}–${end}${end < start ? ' (ends next day)' : ''}`
  return `${times} · ${dayList(calendar.workDays)} · ${formatHours(calendar.shiftHours)} a shift`
}

export function downtimePayload(form: DowntimeForm): { input: EquipmentDowntimeInput; error: null } | { input: null; error: string } {
  if (!form.startsAt || !form.endsAt) return { input: null, error: 'Enter when the downtime starts and ends.' }
  const startsAt = new Date(form.startsAt)
  const endsAt = new Date(form.endsAt)
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { input: null, error: 'Enter when the downtime starts and ends.' }
  }
  if (endsAt <= startsAt) return { input: null, error: 'The downtime must end after it starts.' }
  const reason = form.reason.trim()
  return {
    input: { downtimeType: form.downtimeType, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: reason || null },
    error: null,
  }
}

/** From midnight today (local) for seven days. */
export function nextWeek(now: Date): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function availabilitySummary(availability: EquipmentAvailabilityDto): string {
  const down = availability.downtimeHours > 0 ? ` (${formatHours(availability.downtimeHours)} down)` : ''
  const capacity = availability.capacity !== null ? ` · can make ${Number(availability.capacity.toFixed(2))}` : ''
  const holidays = availability.holidays?.length ?? 0
  const off = holidays > 0 ? ` · ${holidays} holiday${holidays === 1 ? '' : 's'} off` : ''
  return `Next 7 days: ${formatHours(availability.availableHours)} available${down}${capacity}${off}.`
}

/** Downtime not over yet (soonest first), and what is over (latest first). */
export function splitDowntimes(downtimes: EquipmentDowntimeDto[], now: Date): { current: EquipmentDowntimeDto[]; past: EquipmentDowntimeDto[] } {
  const ended = (one: EquipmentDowntimeDto) => new Date(one.endsAt).getTime() <= now.getTime()
  return {
    current: downtimes.filter((one) => !ended(one)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    past: downtimes.filter(ended),
  }
}

/** Equipment a work order can be put on: everything but inactive, plus whatever it is on now. */
export function equipmentChoices(equipment: EquipmentDto[], currentId: string | null): EquipmentDto[] {
  return equipment.filter((one) => one.equipmentStatus !== 'inactive' || one.equipmentId === currentId)
}

export function equipmentLabel(equipment: EquipmentDto): string {
  const name = equipment.equipmentCode ? `${equipment.equipmentCode} · ${equipment.equipmentName}` : equipment.equipmentName
  return equipment.equipmentStatus === 'active' ? name : `${name} (${equipment.equipmentStatus})`
}
