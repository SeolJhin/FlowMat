import type { ReadinessCheckStatus, WorkOrderDto, WorkOrderReadinessDto } from '../../../shared/types/api'

const ORDER: Record<ReadinessCheckStatus, number> = { fail: 0, warn: 1, ok: 2 }

/** Problems first, then warnings, then what is fine; the server's order is kept within each group. */
export function orderedChecks(readiness: WorkOrderReadinessDto): WorkOrderReadinessDto['checks'] {
  return readiness.checks
    .map((check, index) => ({ check, index }))
    .sort((a, b) => ORDER[a.check.status] - ORDER[b.check.status] || a.index - b.index)
    .map(({ check }) => check)
}

/** One line for the top of the readiness box, e.g. "Not ready: 2 problems". */
export function readinessHeadline(readiness: WorkOrderReadinessDto): string {
  const count = (status: ReadinessCheckStatus) => readiness.checks.filter((check) => check.status === status).length
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const failures = count('fail')
  if (failures > 0) return `Not ready: ${plural(failures, 'problem')}`
  const warnings = count('warn')
  return warnings > 0 ? `Ready, with ${plural(warnings, 'warning')}` : 'Ready to run'
}

/**
 * What approved and in-progress work orders other than {@code exceptOrderId} will still make of each item: their target
 * less what their runs produced. Drafts do not count, as in open order needs (docs/domain/multi-level-bom.md).
 */
export function plannedSupply(
  orders: Pick<WorkOrderDto, 'workOrderId' | 'workOrderStatus' | 'targetItemId' | 'targetQuantity' | 'producedQuantity'>[],
  exceptOrderId: string,
): Map<string, number> {
  const supply = new Map<string, number>()
  for (const order of orders) {
    if (order.workOrderId === exceptOrderId || !order.targetItemId || order.targetQuantity === null) continue
    if (order.workOrderStatus !== 'approved' && order.workOrderStatus !== 'in_progress') continue
    const left = Math.max(0, order.targetQuantity - order.producedQuantity)
    supply.set(order.targetItemId, (supply.get(order.targetItemId) ?? 0) + left)
  }
  return supply
}

/** What a new work order should make of a short sub-assembly: the shortage less what open orders will make, at least 0. */
export function subAssemblyToMake(shortage: number, planned: number): number {
  return Math.max(0, Math.round((shortage - planned) * 10_000) / 10_000)
}
