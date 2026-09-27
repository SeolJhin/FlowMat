import type { EquipmentLoadOrderDto, EquipmentLoadRowDto } from '../../../entities/production/api/useEquipmentLoad'
import { formatHours } from './equipmentScheduleModel'

/** Monday 00:00 (local) of the week the date falls in. */
export function weekStart(date: Date): Date {
  const sinceMonday = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - sinceMonday)
}

export function shiftWeeks(start: Date, weeks: number): Date {
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + weeks * 7)
}

/** The seven days from the week's Monday as instants for the API. */
export function weekRange(start: Date): { from: string; to: string } {
  return { from: start.toISOString(), to: shiftWeeks(start, 1).toISOString() }
}

/** "2030-01-07" for a date input, in local time. */
export function dateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A date input's value as a local date, or null when it is not a date. */
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export type LoadTone = 'over' | 'high' | 'ok' | 'idle'

/** Over 100 %, from 85 %, some load, or nothing planned (or no time at all). */
export function loadTone(row: EquipmentLoadRowDto): LoadTone {
  if (row.overloaded) return 'over'
  if (row.loadPercent === null || row.plannedHours === 0) return 'idle'
  return row.loadPercent >= 85 ? 'high' : 'ok'
}

/** "63.8%", or "—" when the equipment has no time in the window. */
export function loadLabel(row: EquipmentLoadRowDto): string {
  return row.loadPercent === null ? '—' : `${Number(row.loadPercent.toFixed(1))}%`
}

/** One line per order, e.g. "WO-1 · RED · 10 h", "WO-2 · draft · 5 h", "WO-3 · 15.5 of 31 h", "WO-4 · hours unknown". */
export function orderLine(order: EquipmentLoadOrderDto): string {
  const parts = [order.workOrderNumber]
  if (order.targetItemCode) parts.push(order.targetItemCode)
  if (order.workOrderStatus === 'draft') parts.push('draft')
  if (order.hoursInWindow === null || order.neededHours === null) {
    parts.push('hours unknown')
  } else if (order.hoursInWindow !== order.neededHours) {
    parts.push(`${Number(order.hoursInWindow.toFixed(2))} of ${formatHours(order.neededHours)}`)
  } else {
    parts.push(formatHours(order.hoursInWindow))
  }
  if (order.changeoverMinutes) parts.push(`incl. ${order.changeoverMinutes} min changeover`)
  return parts.join(' · ')
}
