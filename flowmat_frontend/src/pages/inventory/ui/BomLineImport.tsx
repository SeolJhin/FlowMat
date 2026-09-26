import { useState } from 'react'
import { useImportBomLinesMutation } from '../../../entities/bom/api/useBoms'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { BomLineImportResultDto, BomLineImportRowDto } from '../../../shared/types/api'
import { bomLinesFromCsv } from '../model/bomModel'

const cell = { padding: '4px 6px' } as const

/**
 * A draft's materials from a spreadsheet (docs/domain/item-import.md "BOM 자재"): item_code, quantity and unit columns.
 * The file is checked with the approval rules first; saving happens only when no line is wrong.
 */
export function BomLineImport({ projectId, bomId }: { projectId: string; bomId: string }) {
  const importMutation = useImportBomLinesMutation(projectId)
  const [rows, setRows] = useState<BomLineImportRowDto[] | null>(null)
  const [replace, setReplace] = useState(false)
  const [check, setCheck] = useState<BomLineImportResultDto | null>(null)
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null)

  async function run(next: BomLineImportRowDto[], replaceLines: boolean, dryRun: boolean) {
    try {
      const result = await importMutation.mutateAsync({ bomId, rows: next, replace: replaceLines, dryRun })
      if (result.applied) {
        setRows(null)
        setCheck(null)
        const removed = result.removed ? `, removed ${result.removed}` : ''
        setMessage({ error: false, text: `Added ${result.added} material${result.added === 1 ? '' : 's'}${removed}.` })
      } else {
        setCheck(result)
      }
    } catch (error) {
      setMessage({ error: true, text: errorMessage(error, 'The file could not be checked.') })
    }
  }

  async function choose(file: File | undefined) {
    setRows(null)
    setCheck(null)
    setMessage(null)
    if (!file) return
    const parsed = bomLinesFromCsv(await file.text())
    if (!parsed.ok) {
      setMessage({ error: true, text: parsed.error })
      return
    }
    setRows(parsed.rows)
    await run(parsed.rows, replace, true)
  }

  return (
    <div aria-label="Materials from CSV" style={{ display: 'grid', gap: 6, marginBottom: 12, fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Materials from CSV</span>
          <input type="file" accept=".csv,text/csv" aria-label="Import materials file" onChange={(e) => void choose(e.target.files?.[0])} />
        </label>
        <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => {
              setReplace(e.target.checked)
              if (rows) void run(rows, e.target.checked, true)
            }}
          />
          Replace current materials
        </label>
      </div>
      {message && (
        <p role={message.error ? 'alert' : 'status'} style={{ margin: 0, color: message.error ? '#dc2626' : '#047857' }}>
          {message.text}
        </p>
      )}
      {rows && check && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
          <p style={{ margin: '0 0 4px' }}>
            {check.added} to add{check.removed ? `, ${check.removed} to remove` : ''}
            {check.errors > 0 && <strong style={{ color: '#dc2626' }}>, {check.errors} with problems</strong>}
          </p>
          {check.errors > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {check.rows
                  .filter((row) => row.action === 'error')
                  .map((row) => (
                    <tr key={row.row} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...cell, opacity: 0.6, whiteSpace: 'nowrap' }}>line {row.row + 1}</td>
                      <td style={cell}>
                        <code>{row.itemCode ?? '-'}</code>
                      </td>
                      <td style={{ ...cell, color: '#dc2626' }}>{row.message}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="button" disabled={check.errors > 0 || importMutation.isPending} onClick={() => void run(rows, replace, false)}>
              {replace ? 'Replace materials' : `Add ${check.added} material${check.added === 1 ? '' : 's'}`}
            </button>
            <button type="button" style={{ background: 'transparent' }} onClick={() => void choose(undefined)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
