import { useState } from 'react'
import { useLotRecallQuery, useRecallQuarantineMutation } from '../../../entities/inventory/api/useLots'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { LotDto } from '../../../shared/types/api'
import { recallCsv, recallTotals } from '../model/recallModel'

const cell = { padding: '3px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

/**
 * Recall from a suspect LOT (docs/domain/lot-recall.md): every LOT made from it, where their stock is and what already
 * left through issues, and holding them all at once. Loaded only when opened.
 */
export function LotRecall({ projectId, lot }: { projectId: string; lot: LotDto }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const recallQuery = useLotRecallQuery(projectId, lot.lotId, open)
  const quarantineMutation = useRecallQuarantineMutation(projectId)
  const lines = recallQuery.data?.lots ?? []
  const totals = recallTotals(lines)
  const toHold = lines.filter((line) => line.lotStatus !== 'quarantined' && line.lotStatus !== 'closed').length

  function download() {
    const url = URL.createObjectURL(new Blob([recallCsv(lines)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `recall-${lot.lotNo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-label="LOT recall" style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 13 }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}>
          Recall report
        </button>
      ) : (
        <>
          <h4 style={{ margin: '0 0 4px' }}>Recall from {lot.lotNo}</h4>
          {recallQuery.isError && <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(recallQuery.error, 'Failed to trace the LOT.')}</p>}
          {recallQuery.data && (
            <p aria-label="Recall summary" style={{ margin: '0 0 6px', fontSize: 12 }}>
              {totals.lots} LOT{totals.lots === 1 ? '' : 's'} · {totals.holding} still holding stock ·{' '}
              <span style={{ color: totals.shipped ? '#b91c1c' : undefined }}>{totals.shipped} already sent some out</span> ·{' '}
              {totals.quarantined} quarantined
            </p>
          )}
          {lines.length > 0 && (
            <table aria-label="Recall list" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.lotId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...cell, paddingLeft: 6 + line.depth * 12 }}>
                      <code>{line.lotNo}</code> {line.itemCode}
                    </td>
                    <td style={{ ...cell, color: line.lotStatus === 'quarantined' ? '#b45309' : undefined }}>{line.lotStatus}</td>
                    <td style={num} title={line.places.join(', ')}>
                      {formatQty(line.onHand)} {line.unit ?? ''}
                    </td>
                    <td style={{ ...num, color: line.issued ? '#b91c1c' : undefined }} title="Issued, not reversed">
                      {line.issued ? `out ${formatQty(line.issued)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {recallQuery.data && (
            <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason, e.g. supplier recall" aria-label="Recall reason" />
                <button
                  type="button"
                  disabled={toHold === 0 || !reason.trim() || quarantineMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Quarantine ${toHold} LOT${toHold === 1 ? '' : 's'}? They can no longer be used or issued until released.`)) {
                      quarantineMutation.mutate({ lotId: lot.lotId, reason: reason.trim() })
                    }
                  }}
                >
                  Quarantine all ({toHold})
                </button>
                <button type="button" disabled={lines.length === 0} onClick={download}>
                  Download CSV
                </button>
              </div>
              {quarantineMutation.isError && (
                <p role="alert" style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>
                  {errorMessage(quarantineMutation.error, 'The LOTs could not be quarantined.')}
                </p>
              )}
              {quarantineMutation.data && (
                <p role="status" style={{ color: '#047857', fontSize: 12, margin: 0 }}>
                  Quarantined {quarantineMutation.data.quarantined.length}
                  {quarantineMutation.data.skipped.length > 0 &&
                    `; left ${quarantineMutation.data.skipped.map((skip) => `${skip.lotNo} (${skip.reason})`).join(', ')}`}
                  .
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
