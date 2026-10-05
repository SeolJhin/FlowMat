import { useWorkOrderReadinessQuery } from '../../../entities/production/api/useWorkOrderReadiness'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ReadinessCheckStatus, WorkOrderReadinessDto } from '../../../shared/types/api'
import { orderedChecks, readinessHeadline, subAssemblyToMake } from '../model/readinessModel'

type Material = WorkOrderReadinessDto['materials'][number]

const MARK: Record<ReadinessCheckStatus, { symbol: string; color: string; label: string }> = {
  fail: { symbol: '✕', color: '#b91c1c', label: 'problem' },
  warn: { symbol: '!', color: '#b45309', label: 'warning' },
  ok: { symbol: '✓', color: '#047857', label: 'ok' },
}

const cell = { padding: '4px 6px' } as const

/**
 * Whether a work order can run now: status, workflow, BOM and the materials for what is still to produce
 * (docs/domain/work-order-readiness.md). Checking reserves nothing; stock can change before the run starts. A short
 * material with its own approved BOM (a sub-assembly, docs/domain/multi-level-bom.md) offers a work order for what open
 * orders do not already make.
 */
export function WorkOrderReadiness({ workOrderId, makeable, planned, onMake }: {
  workOrderId: string
  /** Items with their own approved BOM. */
  makeable?: Set<string>
  /** What other open work orders will still make of each item. */
  planned?: Map<string, number>
  onMake?: (material: Material, quantity: number) => void
}) {
  const query = useWorkOrderReadinessQuery(workOrderId, true)
  const readiness = query.data
  const making = Boolean(makeable && onMake)

  function makeCell(material: Material) {
    if (!makeable?.has(material.itemId)) return '-'
    if (material.shortageQuantity <= 0) return 'own BOM'
    const already = planned?.get(material.itemId) ?? 0
    const quantity = subAssemblyToMake(material.shortageQuantity, already)
    if (quantity <= 0) return <span className="inspector-hint">open work orders make {formatQty(already)}</span>
    return (
      <>
        <button type="button" style={{ fontSize: 11 }} aria-label={`Make ${material.itemCode} with a work order`}
          onClick={() => onMake?.(material, quantity)}>
          Make {formatQty(quantity)}
        </button>
        {already > 0 && <span className="inspector-hint"> ({formatQty(already)} already planned)</span>}
      </>
    )
  }

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
              {making && <th style={cell}>Sub-assembly</th>}
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
                {making && <td style={cell}>{makeCell(material)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
