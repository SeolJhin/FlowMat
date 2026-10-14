import { useMemo, useState } from 'react'
import { useWorkerLoadQuery } from '../../../entities/production/api/useWorkerLoad'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { dateInputValue, parseDateInput, shiftWeeks, weekRange, weekStart } from '../../inventory/model/equipmentLoadModel'
import { overlapText, workerLoadLabel, workerLoadTone, workerOrderLine, type WorkerLoadTone } from '../model/workerLoadModel'

const cell = { padding: '4px 6px', verticalAlign: 'top' } as const

const TONE: Record<WorkerLoadTone, string> = { over: '#b91c1c', high: '#b45309', ok: '#047857', idle: 'var(--border)' }

function hours(value: number): string {
  return `${Number(value.toFixed(2))} h`
}

/**
 * A week of worker load (docs/domain/worker-calendar.md WC22): each worker's shift hours against the approved and running
 * orders that name them, drafts apart, and the orders that want them at the same time.
 */
export function WorkerLoadBoard({ projectId }: { projectId: string }) {
  const [start, setStart] = useState(() => weekStart(new Date()))
  const range = useMemo(() => weekRange(start), [start])
  const query = useWorkerLoadQuery(projectId, range.from, range.to, true)
  const rows = Array.isArray(query.data?.workers) ? query.data.workers : []

  return (
    <section aria-label="Worker load" style={{ display: 'grid', gap: 8, fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setStart(shiftWeeks(start, -1))}>Previous week</button>
        <label>Week of <input type="date" value={dateInputValue(start)} onChange={(event) => {
          const picked = parseDateInput(event.target.value)
          if (picked) setStart(weekStart(picked))
        }} /></label>
        <button type="button" onClick={() => setStart(shiftWeeks(start, 1))}>Next week</button>
        <button type="button" onClick={() => setStart(weekStart(new Date()))}>This week</button>
        <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>
          {query.isFetching ? 'Loading...' : 'Refresh'}</button>
      </div>
      {query.isError && <p role="alert">{errorMessage(query.error, 'Failed to load the worker load.')}</p>}
      {rows.length > 0 && <table aria-label="Load by worker" style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'left' }}>
        <thead><tr><th style={cell}>Worker</th><th style={cell}>Shifts</th><th style={cell}>Planned</th>
          <th style={cell}>Drafts</th><th style={cell}>Load</th><th style={cell}>Orders</th></tr></thead>
        <tbody>{rows.map((row) => {
          const tone = workerLoadTone(row)
          return <tr key={row.userId} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={cell}>{row.userId}{row.owner ? ' (owner)' : ''}</td>
            <td style={cell}>{row.calendarSet ? hours(row.shiftHours) : '—'}</td>
            <td style={cell}>{row.calendarSet ? hours(row.plannedHours) : '—'}</td>
            <td style={cell}>{row.calendarSet && row.draftHours > 0 ? hours(row.draftHours) : '—'}</td>
            <td style={{ ...cell, minWidth: 110 }}>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
                <div style={{ width: `${Math.min(100, row.loadPercent ?? 0)}%`, height: '100%', borderRadius: 3, background: TONE[tone] }} />
              </div>
              <span style={{ color: tone === 'over' ? TONE.over : undefined }}>{workerLoadLabel(row)}{row.overloaded && ' · Overloaded'}</span>
            </td>
            <td style={cell}>
              {row.orders.map((order) => <div key={order.workOrderId}>{workerOrderLine(order, row.calendarSet)}</div>)}
              {row.overlaps.map((overlap) => (
                <div key={`${overlap.firstWorkOrderNumber}-${overlap.secondWorkOrderNumber}`} style={{ color: TONE.high }}>
                  {overlapText(overlap, row.calendarSet)}
                </div>
              ))}
              {row.unplannedOrders > 0 && <div className="inspector-hint">{row.unplannedOrders} open order(s) without planned dates</div>}
            </td>
          </tr>
        })}</tbody>
      </table>}
    </section>
  )
}
