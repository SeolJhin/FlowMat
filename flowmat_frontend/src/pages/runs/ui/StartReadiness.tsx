import { useWorkOrderReadinessQuery } from '../../../entities/production/api/useWorkOrderReadiness'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { orderedChecks, readinessHeadline } from '../model/readinessModel'

/**
 * Readiness of the work order chosen in the start form (docs/domain/work-order-readiness.md): the headline and every check
 * that is not ok, so problems show before the run starts. It does not block the start; recording the run still checks stock.
 */
export function StartReadiness({ workOrderId }: { workOrderId: string }) {
  const query = useWorkOrderReadinessQuery(workOrderId, true)
  const readiness = query.data
  if (query.isLoading) return <p className="inspector-hint" style={{ margin: 0, fontSize: 12 }}>Checking readiness...</p>
  if (query.isError) {
    return <p role="alert" style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{errorMessage(query.error, 'Readiness could not be checked.')}</p>
  }
  if (!readiness) return null
  const issues = orderedChecks(readiness).filter((check) => check.status !== 'ok')
  return (
    <div aria-label="Start readiness" style={{ display: 'grid', gap: 2, fontSize: 12 }}>
      <strong style={{ color: readiness.ready ? '#047857' : '#b91c1c' }}>{readinessHeadline(readiness)}</strong>
      {issues.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {issues.map((check) => (
            <li key={check.code} style={{ color: check.status === 'fail' ? '#b91c1c' : '#b45309' }}>{check.message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
