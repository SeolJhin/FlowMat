import type { WorkOrderDto, WorkOrderStatus } from '../../../shared/types/api'
import type { WorkOrderTransition } from '../../../entities/production/api/useWorkOrders'

/** Mirrors WorkOrderStatus.canTransitionTo on the backend; the server remains the authority. */
const ACTIONS: Record<WorkOrderStatus, WorkOrderTransition[]> = {
  draft: ['approve', 'cancel'],
  approved: ['cancel'],
  in_progress: ['complete'],
  completed: [],
  cancelled: [],
}

export function availableWorkOrderActions(status: WorkOrderStatus): WorkOrderTransition[] {
  return ACTIONS[status] ?? []
}

export function isWorkOrderEditable(status: WorkOrderStatus): boolean {
  return status === 'draft'
}

/** Orders a run may be started against, limited to the selected workflow when the order names one. */
export function runnableWorkOrders(orders: WorkOrderDto[], workflowId: string): WorkOrderDto[] {
  return orders.filter(
    (order) =>
      (order.workOrderStatus === 'approved' || order.workOrderStatus === 'in_progress') &&
      (!order.workflowId || order.workflowId === workflowId),
  )
}

/** Produced / target as a 0–100 percentage, or null when the order has no target quantity. */
export function workOrderProgress(order: Pick<WorkOrderDto, 'producedQuantity' | 'targetQuantity'>): number | null {
  if (!order.targetQuantity || order.targetQuantity <= 0) return null
  return Math.min(100, Math.round((Number(order.producedQuantity) / Number(order.targetQuantity)) * 100))
}

/**
 * The work order's instruction link when it is an absolute http or https address, else null. The server only saves
 * such links; checking again keeps a stray javascript: or data: value from ever becoming a clickable link.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}
