import { useState } from 'react'
import { useExpiredWriteOffMutation, type ExpiredWriteOffInput } from '../../../entities/inventory/api/useExpiredWriteOffMutation'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ExpiredWriteOffDto, LotDto } from '../../../shared/types/api'
import { expiryOutlook } from '../model/expiryOutlookModel'

const WEEKS = 8
const cell = { padding: '3px 6px', verticalAlign: 'top' } as const

/**
 * When LOTs that still hold stock run out (docs/domain/lot-expiry.md "만료 전망"): already expired, then week by week for
 * the next eight weeks, soonest first within each week, so the ones to use first are easy to find. A LOT opens its
 * detail. Hidden when no LOT with stock has an expiry date.
 */
export function ExpiryOutlook({
  projectId,
  lots,
  itemLabel,
  onOpen,
}: {
  projectId: string
  lots: LotDto[]
  itemLabel: (itemId: string) => string
  onOpen: (lotId: string) => void
}) {
  const outlook = expiryOutlook(lots, new Date(), WEEKS)
  const operation = useWriteOff(projectId, outlook.expired)
  const hasOperation = operation.done !== null || operation.writeOff.isPending || operation.writeOff.isError
  const soon = outlook.weeks.reduce((sum, week) => sum + week.lots.length, 0)
  if (outlook.expired.length === 0 && soon === 0 && outlook.later === 0 && !hasOperation) return null

  const lotButton = (lot: LotDto) => (
    <button
      key={lot.lotId}
      type="button"
      onClick={() => onOpen(lot.lotId)}
      title={`${itemLabel(lot.itemId)} · ${formatQty(lot.quantityOnHand)} on hand`}
      style={{ fontSize: 11, marginRight: 4, marginBottom: 2 }}
    >
      {lot.lotNo} ({lot.expiryDate})
    </button>
  )

  return (
    <details aria-label="Expiry outlook" style={{ marginBottom: 10, fontSize: 12 }} open={outlook.expired.length > 0 || hasOperation}>
      <summary style={{ cursor: 'pointer' }}>
        Expiry outlook:{' '}
        <span style={{ color: outlook.expired.length ? '#b91c1c' : undefined }}>{outlook.expired.length} expired with stock</span>, {soon} within{' '}
        {WEEKS} weeks, {outlook.later} later
      </summary>
      <table style={{ borderCollapse: 'collapse', marginTop: 6 }}>
        <tbody>
          {outlook.expired.length > 0 && (
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ ...cell, color: '#b91c1c', whiteSpace: 'nowrap' }}>expired</td>
              <td style={cell}>{outlook.expired.map(lotButton)}</td>
            </tr>
          )}
          {outlook.weeks
            .filter((week) => week.lots.length > 0)
            .map((week) => (
              <tr key={week.from} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...cell, whiteSpace: 'nowrap', opacity: 0.8 }}>
                  {week.from} – {week.to}
                </td>
                <td style={cell}>{week.lots.map(lotButton)}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <ExpiredWriteOff operation={operation} expiredCount={outlook.expired.length} />
    </details>
  )
}

/** State stays mounted in the outlook even when refreshing the LOTs removes every expired row. */
function useWriteOff(projectId: string, expired: LotDto[]) {
  const writeOff = useExpiredWriteOffMutation(projectId)
  const [closeLots, setCloseLots] = useState(false)
  const [submitted, setSubmitted] = useState<ExpiredWriteOffInput | null>(null)
  const [done, setDone] = useState<ExpiredWriteOffDto | null>(null)
  const status = errorStatus(writeOff.error)
  const unconfirmed = writeOff.isError && (status === null || status >= 500)

  function submit() {
    if (writeOff.isPending) return
    // A retry confirms the previous operation; newly expired LOTs must never silently become its new targets.
    const input = unconfirmed ? submitted : { lotIds: expired.map((lot) => lot.lotId), closeLots, note: 'Expired stock written off' }
    if (!input || !input.lotIds?.length) return
    if (!unconfirmed && !window.confirm(`Write off the stock of ${input.lotIds.length} expired LOT${input.lotIds.length === 1 ? '' : 's'}? It leaves as an issue.`)) return
    setSubmitted(input)
    setDone(null)
    writeOff.mutate(input, { onSuccess: setDone })
  }

  function clear() {
    setDone(null)
    setSubmitted(null)
    writeOff.reset()
  }

  return { writeOff, closeLots, setCloseLots, done, unconfirmed, submit, clear }
}

/** A receipt or unconfirmed operation stays visible until the user has acknowledged and cleared it. */
function ExpiredWriteOff({ operation, expiredCount }: { operation: ReturnType<typeof useWriteOff>; expiredCount: number }) {
  const { writeOff, closeLots, setCloseLots, done, unconfirmed, submit, clear } = operation
  return (
    <div style={{ marginTop: 8, display: 'grid', gap: 4 }} aria-busy={writeOff.isPending}>
      {(expiredCount > 0 || writeOff.isPending || unconfirmed) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={{ fontSize: 11 }} disabled={writeOff.isPending} onClick={submit}>
            {writeOff.isPending ? 'Writing off...' : unconfirmed ? 'Retry write-off' : `Write off expired stock (${expiredCount})`}
          </button>
          <label style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <input type="checkbox" checked={closeLots} disabled={writeOff.isPending || unconfirmed} onChange={(e) => setCloseLots(e.target.checked)} />
            close the LOTs afterwards (owner)
          </label>
        </div>
      )}
      {done && (
        <p role="status" style={{ margin: 0, color: '#047857' }}>
          Wrote off {done.lines.map((line) => `LOT ${line.lotNo} ${formatQty(line.writtenOff)} ${line.unit ?? ''}${line.closed ? ' (closed)' : ''}`).join(', ')}
          {' '}· value {formatQty(done.value)}{done.valueComplete ? '' : ' (some items have no unit cost)'}
          {done.lines.some((line) => line.note) && (
            <span style={{ color: '#b45309' }}>
              {' '}· kept: {done.lines.filter((line) => line.note).map((line) => `LOT ${line.lotNo}: ${line.note}`).join('; ')}
            </span>
          )}
        </p>
      )}
      {writeOff.isError && <p role="alert" style={{ margin: 0, color: '#dc2626' }}>{errorMessage(writeOff.error, 'The write-off could not be confirmed.')}</p>}
      {unconfirmed && <p role="status" className="inspector-hint" style={{ margin: 0 }}>The write-off result is unconfirmed. Retry write-off confirms the original LOTs; newly expired LOTs are left alone.</p>}
      {(done || writeOff.isError) && !writeOff.isPending && !unconfirmed && (
        <button type="button" style={{ justifySelf: 'start', fontSize: 11 }} onClick={clear}>Clear write-off result</button>
      )}
    </div>
  )
}
