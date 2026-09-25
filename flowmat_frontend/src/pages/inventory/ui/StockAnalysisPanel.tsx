import { useState } from 'react'
import { useStockAnalysisQuery } from '../../../entities/inventory/api/useStockAnalysis'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import {
  ANALYSIS_SORTS,
  ANALYSIS_WINDOWS,
  analysisTotals,
  coverLabel,
  filterIdle,
  idleLabel,
  sortAnalysis,
  type AnalysisSort,
} from '../model/stockAnalysisModel'

const IDLE_FILTERS = [0, 30, 60, 90] as const
const cell = { padding: '6px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const
const head = { ...cell, textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 } as const

/**
 * How stock moves (docs/domain/stock-analysis.md): what each item used over a window, how long its usable stock lasts
 * at that rate, and how long it has sat idle. Use is issues and production inputs, not transfers or adjustments.
 */
export function StockAnalysisPanel({ projectId }: { projectId: string }) {
  const [days, setDays] = useState(30)
  const [sort, setSort] = useState<AnalysisSort>('idle')
  const [minIdle, setMinIdle] = useState(0)
  const analysisQuery = useStockAnalysisQuery(projectId, days)
  const lines = analysisQuery.data?.lines ?? []
  const shown = sortAnalysis(filterIdle(lines, minIdle), sort)
  const totals = analysisTotals(lines, Math.max(minIdle, 30))

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          <span>Use over</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {ANALYSIS_WINDOWS.map((value) => (
              <option key={value} value={value}>
                last {value} days
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as AnalysisSort)}>
            {ANALYSIS_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          <span>Show</span>
          <select value={minIdle} onChange={(e) => setMinIdle(Number(e.target.value))}>
            {IDLE_FILTERS.map((value) => (
              <option key={value} value={value}>
                {value === 0 ? 'all items' : `idle ${value}+ days`}
              </option>
            ))}
          </select>
        </label>
        <span className="inspector-hint">Use counts issues and production inputs; transfers and adjustments are not use.</span>
      </div>

      {analysisQuery.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(analysisQuery.error, 'Failed to analyse stock.')}</p>
      )}
      {analysisQuery.data && (
        <p aria-label="Stock analysis summary" style={{ margin: 0, fontSize: 13 }}>
          <strong>{totals.idleItems}</strong> item{totals.idleItems === 1 ? '' : 's'} idle {Math.max(minIdle, 30)}+ days
          {totals.idleItems > 0 && (
            <>
              {' '}holding <strong>{formatQty(totals.idleValue)}</strong>
              {totals.idleUncosted > 0 ? ` (+${totals.idleUncosted} without a unit cost)` : ''}
            </>
          )}
          {' · '}
          <strong style={{ color: totals.shortCover > 0 ? '#b45309' : undefined }}>{totals.shortCover}</strong> run
          {totals.shortCover === 1 ? 's' : ''} out before a new order would arrive
          {' · '}
          <strong>{totals.classA}</strong> class A item{totals.classA === 1 ? '' : 's'} (most of the value used)
        </p>
      )}
      {analysisQuery.data && shown.length === 0 && (
        <p className="inspector-hint">{lines.length === 0 ? 'No stock and no use yet.' : 'No item has been idle that long.'}</p>
      )}
      {shown.length > 0 && (
        <table aria-label="Stock analysis" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={head}>Item</th>
              <th style={{ ...head, textAlign: 'right' }}>On hand</th>
              <th style={{ ...head, textAlign: 'right' }}>Usable</th>
              <th style={{ ...head, textAlign: 'right' }}>Used ({days} d)</th>
              <th style={{ ...head, textAlign: 'right' }}>Per day</th>
              <th style={{ ...head, textAlign: 'right' }}>Lasts</th>
              <th style={{ ...head, textAlign: 'right' }}>Idle</th>
              <th style={{ ...head, textAlign: 'right' }}>Value</th>
              <th style={{ ...head, textAlign: 'center' }} title="By value used in the period: A makes up the first 80%, B the next 15%, C the rest">
                Class
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((line) => {
              const unit = line.unit ? ` ${line.unit}` : ''
              return (
                <tr key={line.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cell}>
                    <code>{line.itemCode}</code>
                    {line.itemName ? ` ${line.itemName}` : ''}
                  </td>
                  <td style={num}>{formatQty(line.onHandQuantity)}{unit}</td>
                  <td style={num}>{formatQty(line.usableQuantity)}{unit}</td>
                  <td style={num}>{formatQty(line.consumedQuantity)}{unit}</td>
                  <td style={num}>{line.consumedQuantity > 0 ? `${formatQty(line.averageDailyConsumption)}${unit}` : '-'}</td>
                  <td
                    style={{ ...num, color: line.coverBelowLeadTime ? '#b45309' : undefined, fontWeight: line.coverBelowLeadTime ? 600 : 400 }}
                    title={
                      line.coverBelowLeadTime
                        ? `Runs out before a new order would arrive (lead time ${line.leadTimeDays} days).`
                        : undefined
                    }
                  >
                    {coverLabel(line)}
                  </td>
                  <td
                    style={num}
                    title={
                      line.lastConsumedAt
                        ? `Last used ${new Date(line.lastConsumedAt).toLocaleString()}`
                        : line.lastReceivedAt
                          ? `Never used; last received ${new Date(line.lastReceivedAt).toLocaleString()}`
                          : undefined
                    }
                  >
                    {idleLabel(line.idleDays)}
                  </td>
                  <td style={{ ...num, opacity: line.stockValue === null ? 0.5 : 1 }}>
                    {line.stockValue === null ? 'no cost' : formatQty(line.stockValue)}
                  </td>
                  <td
                    style={{ ...cell, textAlign: 'center', fontWeight: line.abcClass === 'A' ? 700 : 400 }}
                    title={line.consumedValue === null ? 'No unit cost' : `Value used: ${formatQty(line.consumedValue)}`}
                  >
                    {line.abcClass ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
