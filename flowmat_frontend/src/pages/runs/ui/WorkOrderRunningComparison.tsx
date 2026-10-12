import { useWorkOrderRunningComparisonQuery } from '../../../entities/production/api/useWorkOrderRunningComparison'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from './runDisplay'

/**
 * The work order's planned running time beside the running time its runs recorded (docs/domain/equipment-setup-cost.md
 * ER9). Shown when there is either; never added to material cost.
 */
export function WorkOrderRunningComparison({ workOrderId }: { workOrderId: string }) {
  const query = useWorkOrderRunningComparisonQuery(workOrderId)
  const value = query.data && typeof query.data.actualMinutes === 'number' ? query.data : undefined
  if (query.isError) return <p role="alert" style={{ fontSize: 12 }}>{errorMessage(query.error, 'Could not compare the running time.')}</p>
  if (!value || (value.plannedMinutes == null && value.actualMinutes === 0)) return null
  const planned = value.plannedMinutes == null ? 'no planned time'
    : `${value.plannedMinutes} min${value.capacityPerHour != null ? ` at ${formatQty(value.capacityPerHour)}/h` : ''}`
      + (value.plannedCost == null ? ' · cost unknown' : ` · ${formatQty(value.plannedCost)} at today's rate`)
  const actual = value.runs === 0 ? 'no run yet'
    : `${value.actualMinutes} min · ${formatQty(value.actualCost)}${value.actualCostComplete ? '' : ' known so far'} over ${value.runs} run${value.runs === 1 ? '' : 's'}`
  return <section aria-label="Running time planned and actual" style={{ marginTop: 10, fontSize: 12 }}>
    <strong>Running time</strong>
    <div>Planned: {planned}</div>
    <div>Actual: {actual}</div>
    {value.plannedMinutes != null && value.runs > 0 && (
      <div className="inspector-hint">
        {value.actualMinutes - value.plannedMinutes === 0 ? 'As planned'
          : `${Math.abs(value.actualMinutes - value.plannedMinutes)} min ${value.actualMinutes > value.plannedMinutes ? 'more' : 'less'} than planned`}
      </div>
    )}
  </section>
}
