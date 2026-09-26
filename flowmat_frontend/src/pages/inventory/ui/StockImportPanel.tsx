import { useState } from 'react'
import { useStockImportMutation } from '../../../entities/inventory/api/useStockImportMutation'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { StockImportResultDto, StockImportRowDto } from '../../../shared/types/api'
import { STOCK_CSV_TEMPLATE, stockRowsFromCsv } from '../model/stockImportModel'

const cell = { padding: '4px 6px' } as const

/**
 * Stock from a spreadsheet, such as opening balances (docs/domain/stock-import.md). Each line receives into the record
 * already at that item, location and LOT, or makes a new one; new LOT numbers are registered. The whole file is
 * checked first and received only when no line is wrong.
 */
export function StockImportPanel({ projectId }: { projectId: string }) {
  const importMutation = useStockImportMutation(projectId)
  const [rows, setRows] = useState<StockImportRowDto[] | null>(null)
  const [note, setNote] = useState('')
  const [check, setCheck] = useState<StockImportResultDto | null>(null)
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null)

  async function choose(file: File | undefined) {
    setRows(null)
    setCheck(null)
    setMessage(null)
    if (!file) return
    const parsed = stockRowsFromCsv(await file.text())
    if (!parsed.ok) {
      setMessage({ error: true, text: parsed.error })
      return
    }
    setRows(parsed.rows)
    try {
      setCheck(await importMutation.mutateAsync({ rows: parsed.rows, dryRun: true }))
    } catch (error) {
      setMessage({ error: true, text: errorMessage(error, 'The file could not be checked.') })
    }
  }

  async function receive() {
    if (!rows) return
    try {
      const result = await importMutation.mutateAsync({ rows, dryRun: false, note: note.trim() || undefined })
      if (result.applied) {
        setRows(null)
        setCheck(null)
        const lots = result.newLots ? `, ${result.newLots} new LOT${result.newLots === 1 ? '' : 's'}` : ''
        setMessage({
          error: false,
          text: `Received: ${result.created} new record${result.created === 1 ? '' : 's'}, ${result.received} into existing ones${lots}.`,
        })
      } else {
        setCheck(result)
      }
    } catch (error) {
      setMessage({ error: true, text: errorMessage(error, 'The stock could not be received.') })
    }
  }

  function template() {
    const url = URL.createObjectURL(new Blob([STOCK_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'stock-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const lines = check ? check.created + check.received : 0

  return (
    <details aria-label="Receive stock from a spreadsheet" style={{ marginBottom: 12, fontSize: 13 }}>
      <summary style={{ cursor: 'pointer' }}>Receive stock from a spreadsheet</summary>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        <p className="inspector-hint" style={{ margin: 0 }}>
          Columns item_code, location, lot_no, quantity, expiry_date (yyyy-mm-dd, for a new LOT). Each line receives into the
          record already at that place and LOT, or makes a new one.{' '}
          <button type="button" onClick={template} style={{ fontSize: 12 }}>
            Template
          </button>
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept=".csv,text/csv" aria-label="Import stock file" onChange={(e) => void choose(e.target.files?.[0])} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note, e.g. opening balance" aria-label="Import note" />
        </div>
        {message && (
          <p role={message.error ? 'alert' : 'status'} style={{ margin: 0, color: message.error ? '#dc2626' : '#047857' }}>
            {message.text}
          </p>
        )}
        {rows && check && (
          <div aria-label="Stock import check" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
            <p style={{ margin: '0 0 4px' }}>
              {check.created} new record{check.created === 1 ? '' : 's'}, {check.received} into existing ones
              {check.newLots > 0 && `, ${check.newLots} new LOT${check.newLots === 1 ? '' : 's'}`}
              {check.errors > 0 && <strong style={{ color: '#dc2626' }}>, {check.errors} with problems</strong>}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {check.rows.map((row) => (
                  <tr key={row.row} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...cell, opacity: 0.6, whiteSpace: 'nowrap' }}>line {row.row + 1}</td>
                    <td style={cell}>
                      <code>{row.itemCode ?? '-'}</code>
                    </td>
                    <td style={{ ...cell, color: row.action === 'error' ? '#dc2626' : undefined, fontWeight: row.action === 'error' ? 600 : 400 }}>
                      {row.action}
                    </td>
                    <td style={cell}>{row.message ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" disabled={check.errors > 0 || importMutation.isPending} onClick={() => void receive()}>
                Receive {lines} line{lines === 1 ? '' : 's'}
              </button>
              <button type="button" style={{ background: 'transparent' }} onClick={() => void choose(undefined)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  )
}
