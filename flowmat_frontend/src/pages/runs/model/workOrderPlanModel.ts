import type { WorkOrderPlanSuggestionDto } from '../../../entities/production/api/useWorkOrderPlan'
import type { WorkOrderInput } from '../../../entities/production/api/useWorkOrders'
import type { WorkOrderDto } from '../../../shared/types/api'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** "2030-01-07T09:00" for a datetime-local field, in local time. */
export function localInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "Mon 2030-01-07 09:00", in local time. */
export function planStamp(iso: string): string {
  const date = new Date(iso)
  return `${DAY_NAMES[date.getDay()]} ${localInput(date).replace('T', ' ')}`
}

/** Where a suggestion starts unless the user picks a time: the planned start if still ahead, else the next minute. */
export function defaultPlanFrom(order: Pick<WorkOrderDto, 'plannedStartAt'>, now: Date): string {
  const planned = order.plannedStartAt ? new Date(order.plannedStartAt) : null
  if (planned && planned > now) return localInput(planned)
  return localInput(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1))
}

function hours(value: number): string {
  return `${Number(value.toFixed(2))} h`
}

/**
 * One line, e.g. "Mon 2030-01-07 09:00 → Tue 2030-01-08 11:00 · needs 10 h", with the changeover and the orders the
 * suggestion was moved after when there are any.
 */
export function planSummary(plan: WorkOrderPlanSuggestionDto): string {
  const changeover = plan.changeoverHours > 0
    ? ` (with ${hours(plan.changeoverHours)} changeover${plan.changeoverFrom ? ` after ${plan.changeoverFrom}` : ''})`
    : ''
  const after = plan.movedPast.length > 0 ? ` · after ${plan.movedPast.join(', ')}` : ''
  return `${planStamp(plan.plannedStartAt)} → ${planStamp(plan.plannedEndAt)} · needs ${hours(plan.neededHours)}${changeover}${after}`
}

/** The draft as it is with the suggested dates; the update replaces every editable field, so all of them are sent. */
export function planInput(
  order: WorkOrderDto,
  plan: Pick<WorkOrderPlanSuggestionDto, 'plannedStartAt' | 'plannedEndAt'>,
): WorkOrderInput {
  return {
    workOrderTitle: order.workOrderTitle,
    workflowId: order.workflowId ?? undefined,
    targetItemId: order.targetItemId ?? undefined,
    bomId: order.bomId ?? undefined,
    targetQuantity: order.targetQuantity ?? undefined,
    priority: order.priority,
    plannedStartAt: plan.plannedStartAt,
    plannedEndAt: plan.plannedEndAt,
    instruction: order.instruction ?? undefined,
    assignedTo: order.assignedTo ?? undefined,
    instructionUrl: order.instructionUrl ?? undefined,
  }
}
