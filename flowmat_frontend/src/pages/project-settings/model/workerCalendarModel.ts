import type {
  WorkerCalendarDto, WorkerDayDto, WorkerDayOffDto, WorkerShiftDto,
} from '../../../entities/workforce/api/useWorkerCalendars'
import { dayLabel } from '../../inventory/model/equipmentScheduleModel'

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** ISO days as text: a run of three or more reads "Mon–Fri", others are listed ("Mon, Wed, Fri"). */
export function daysText(days: number[]): string {
  const sorted = [...new Set(days)].filter((day) => day >= 1 && day <= 7).sort((a, b) => a - b)
  const parts: string[] = []
  for (let index = 0; index < sorted.length;) {
    let end = index
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[end] + 1) end += 1
    if (end - index >= 2) {
      parts.push(`${DAY_NAMES[sorted[index] - 1]}–${DAY_NAMES[sorted[end] - 1]}`)
    } else {
      for (let one = index; one <= end; one += 1) parts.push(DAY_NAMES[sorted[one] - 1])
    }
    index = end + 1
  }
  return parts.join(', ')
}

/** "Mon–Fri 09:00–17:00". */
export function shiftText(shift: Pick<WorkerShiftDto, 'shiftStart' | 'shiftEnd' | 'workDays'>): string {
  return `${daysText(shift.workDays)} ${shift.shiftStart}–${shift.shiftEnd}`
}

/** "40 h a week", or "No shifts set" when the worker's time is not known. */
export function weeklyText(worker: Pick<WorkerCalendarDto, 'calendarSet' | 'weeklyHours'>): string {
  return worker.calendarSet ? `${Number(worker.weeklyHours.toFixed(2))} h a week` : 'No shifts set'
}

/**
 * A date's own shifts (docs/domain/worker-calendar.md WC33): "Wed 2041-06-05 · Off" or "Tue 2041-06-04 · 06:00–14:00,
 * 14:00–18:00 · 12 h", with the reason after a dot.
 */
export function workerDayText(day: Pick<WorkerDayDto, 'date' | 'shifts' | 'off' | 'hours' | 'reason'>): string {
  const times = day.shifts.map((shift) => {
    if (shift.shiftStart === shift.shiftEnd) return 'All day'
    return `${shift.shiftStart}–${shift.shiftEnd}${shift.shiftEnd < shift.shiftStart ? ' (ends next day)' : ''}`
  })
  const what = day.off ? 'Off' : `${times.join(', ')} · ${Number(day.hours.toFixed(2))} h`
  return `${dayLabel(day.date)} · ${what}${day.reason ? ` · ${day.reason}` : ''}`
}

/** "2030-01-09" or "2030-01-09 – 2030-01-11", with the reason after a dot. */
export function dayOffText(dayOff: Pick<WorkerDayOffDto, 'firstDay' | 'lastDay' | 'reason'>): string {
  const days = dayOff.firstDay === dayOff.lastDay ? dayOff.firstDay : `${dayOff.firstDay} – ${dayOff.lastDay}`
  return dayOff.reason ? `${days} · ${dayOff.reason}` : days
}
