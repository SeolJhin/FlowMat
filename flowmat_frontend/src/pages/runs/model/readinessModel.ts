import type { ReadinessCheckStatus, WorkOrderReadinessDto } from '../../../shared/types/api'

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
