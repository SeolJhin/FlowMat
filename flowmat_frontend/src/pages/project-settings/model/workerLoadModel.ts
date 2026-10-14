import type { WorkerLoadOrderDto, WorkerLoadOverlapDto, WorkerLoadRowDto } from '../../../entities/production/api/useWorkerLoad'
import { planStamp } from '../../runs/model/workOrderPlanModel'

export type WorkerLoadTone = 'over' | 'high' | 'ok' | 'idle'

function hours(value: number): string {
  return `${Number(value.toFixed(2))} h`
}

/** Red past their shift hours, amber from 85%, grey with nothing planned or no shifts (docs/domain/worker-calendar.md WC22). */
export function workerLoadTone(row: WorkerLoadRowDto): WorkerLoadTone {
  if (row.overloaded) return 'over'
  if (row.loadPercent === null || row.plannedHours === 0) return 'idle'
  return row.loadPercent >= 85 ? 'high' : 'ok'
}

/** "80%", "No shifts set", or "—" when they have no shift time in the window. */
export function workerLoadLabel(row: WorkerLoadRowDto): string {
  if (!row.calendarSet) return 'No shifts set'
  return row.loadPercent === null ? '—' : `${Number(row.loadPercent.toFixed(1))}%`
}

/**
 * "WO-0001 · Mixing · 16 h", with "draft" for a draft, the share when less than all ("50%"), and no hours for someone without
 * shifts.
 */
export function workerOrderLine(order: WorkerLoadOrderDto, calendarSet: boolean): string {
  const parts = [order.workOrderNumber, order.workOrderTitle]
  if (order.workOrderStatus === 'draft') parts.push('draft')
  if ((order.sharePercent ?? 100) < 100) parts.push(`${order.sharePercent}%`)
  if (calendarSet) parts.push(hours(order.hoursInWindow))
  return parts.join(' · ')
}

/** "WO-0001 and WO-0002 at once: Tue 2041-04-02 09:00 → Tue 2041-04-02 17:00 · 8 h". */
export function overlapText(overlap: WorkerLoadOverlapDto, calendarSet: boolean): string {
  const when = `${planStamp(overlap.from)} → ${planStamp(overlap.to)}`
  return `${overlap.firstWorkOrderNumber} and ${overlap.secondWorkOrderNumber} at once: ${when}${calendarSet ? ` · ${hours(overlap.hours)}` : ''}`
}
