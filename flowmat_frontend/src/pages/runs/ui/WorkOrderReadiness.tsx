import { useWorkOrderReadinessQuery } from '../../../entities/production/api/useWorkOrderReadiness'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ReadinessCheckStatus } from '../../../shared/types/api'
import { orderedChecks, readinessHeadline } from '../model/readinessModel'

const MARK: Record<ReadinessCheckStatus, { symbol: string; color: string; label: string }> = {
  fail: { symbol: '✕', color: '#b91c1c', label: 'problem' },
  warn: { symbol: '!', color: '#b45309', label: 'warning' },
  ok: { symbol: '✓', color: '#047857', label: 'ok' },
}

const cell = { padding: '4px 6px' } as const

/**
 * Whether a work order can run now: status, workflow, BOM and the materials for what is still to produce
 * (docs/domain/work-order-readiness.md). Checking reserves nothing; stock can change before the run starts.
 */
export function WorkOrderReadiness({ workOrderId }: { workOrderId: string }) {
  const query = useWorkOrderReadinessQuery(workOrderId, true)
  const readiness = query.data

  if (query.isLoading) return <p className="inspector-hint">Checking...</p>
  if (query.isError) {
    return <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(query.error, 'Readiness could not be checked.')}</p>
  }
  if (!readiness) return null

  return (
    <div aria-label="Readiness" style={{ display: 'grid', gap: 8, fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong style={{ color: readiness.ready ? '#047857' : '#b91c1c' }}>{readinessHeadline(readiness)}</strong>
        <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} style={{ fontSize: 11 }}>
          {query.isFetching ? 'Checking...' : 'Check again'}
        </button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
        {orderedChecks(readiness).map((check) => (
          <li key={check.code} style={{ display: 'flex', gap: 6 }}>
            <span aria-label={MARK[check.status].label} style={{ color: MARK[check.status].color, width: 12 }}>
              {MARK[check.status].symbol}
            </span>
            {check.message}
          </li>
        ))}
      </ul>
      {readiness.materials.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={cell}>Material</th>
              <th style={{ ...cell, textAlign: 'right' }}>Needed</th>
              <th style={{ ...cell, textAlign: 'right' }}>Available</th>
              <th style={{ ...cell, textAlign: 'right' }}>Short</th>
              <th style={cell}>LOTs</th>
            </tr>
          </thead>
          <tbody>
            {readiness.materials.map((material) => (
              <tr key={material.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  {material.itemCode}
                  {material.itemName ? ` · ${material.itemName}` : ''}
                </td>
                <td style={{ ...cell, textAlign: 'right' }}>{formatQty(material.requiredQuantity)} {material.unit}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{formatQty(material.availableQuantity)}</td>
                <td style={{ ...cell, textAlign: 'right', color: material.shortageQuantity > 0 ? '#b91c1c' : undefined }}>
                  {material.shortageQuantity > 0 ? formatQty(material.shortageQuantity) : '-'}
                </td>
                <td style={cell}>{material.lotTracked ? `${material.usableLots} usable` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
