import { useWorkOrderSetupComparisonQuery } from '../../../entities/production/api/useWorkOrderSetupComparison'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from './runDisplay'

/**
 * The work order's planned changeover beside the setups its runs recorded (docs/domain/equipment-setup-cost.md AS12).
 * Shown when there is either; never added to material cost.
 */
export function WorkOrderSetupComparison({ workOrderId }: { workOrderId: string }) {
  const query = useWorkOrderSetupComparisonQuery(workOrderId)
  const value = query.data && typeof query.data.actualMinutes === 'number' ? query.data : undefined
  if (query.isError) return <p role="alert" style={{ fontSize: 12 }}>{errorMessage(query.error, 'Could not compare the setups.')}</p>
  if (!value || (value.plannedMinutes == null && value.actualMinutes === 0)) return null
  const planned = value.plannedMinutes == null ? 'no planned changeover'
    : `${value.plannedMinutes} min${value.plannedCost == null ? ' · cost unknown' : ` · ${formatQty(value.plannedCost)} at today's rate`}`
  const actual = value.runs === 0 ? 'no run yet'
    : `${value.actualMinutes} min · ${formatQty(value.actualCost)}${value.actualCostComplete ? '' : ' known so far'} over ${value.runs} run${value.runs === 1 ? '' : 's'}`
  return <section aria-label="Setup planned and actual" style={{ marginTop: 10, fontSize: 12 }}>
    <strong>Setup</strong>
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
