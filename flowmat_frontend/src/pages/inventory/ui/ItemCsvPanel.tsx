import { useState } from 'react'
import { useImportItemsMutation } from '../../../entities/catalog/api/useImportItemsMutation'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { ItemDto, ItemImportResultDto, ItemImportRowDto, UnitDto } from '../../../shared/types/api'
import { itemsCsv, rowsFromCsv } from '../model/itemCsvModel'

const cell = { padding: '4px 6px' } as const

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Items to and from a spreadsheet (docs/domain/item-import.md). Export writes the columns the import reads. Import checks
 * the whole file first and shows what would change; saving happens only when no row is wrong.
 */
export function ItemCsvPanel({ projectId, items, units }: { projectId: string; items: ItemDto[]; units: UnitDto[] }) {
  const importMutation = useImportItemsMutation(projectId)
  const [file, setFile] = useState<{ name: string; rows: ItemImportRowDto[]; ignored: string[] } | null>(null)
  const [check, setCheck] = useState<ItemImportResultDto | null>(null)
  const [done, setDone] = useState<ItemImportResultDto | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const unitCodes = new Map(units.map((unit) => [unit.unitId, unit.unitCode]))

  async function choose(chosen: File | undefined) {
    importMutation.reset()
    setCheck(null)
    setDone(null)
    setFile(null)
    setReadError(null)
    if (!chosen) return
    const parsed = rowsFromCsv(await chosen.text())
    if (!parsed.ok) {
      setReadError(parsed.error)
      return
    }
    setFile({ name: chosen.name, rows: parsed.rows, ignored: parsed.ignored })
    try {
      setCheck(await importMutation.mutateAsync({ rows: parsed.rows, dryRun: true }))
    } catch {
      // Shown below.
    }
  }

  async function save() {
    if (!file) return
    try {
      const result = await importMutation.mutateAsync({ rows: file.rows, dryRun: false })
      setDone(result)
      setCheck(result.applied ? null : result)
      if (result.applied) setFile(null)
    } catch {
      // Shown below.
    }
  }

  const changes = check ? check.created + check.updated : 0
  const listed = check ? check.rows.filter((row) => row.action !== 'unchanged') : []

  return (
    <section aria-label="Items spreadsheet" style={{ display: 'grid', gap: 8, marginBottom: 12, fontSize: 13 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => download(itemsCsv(items, (id) => unitCodes.get(id)), `items-${new Date().toISOString().slice(0, 10)}.csv`)}
        >
          Export CSV
        </button>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Import CSV</span>
          <input type="file" accept=".csv,text/csv" aria-label="Import items file" onChange={(e) => void choose(e.target.files?.[0])} />
        </label>
        <span className="inspector-hint">Matched by item code: new codes are added, existing ones updated; blank cells leave a value as it is.</span>
      </div>
      {readError && <p role="alert" style={{ color: '#dc2626', margin: 0 }}>{readError}</p>}
      {importMutation.isError && (
        <p role="alert" style={{ color: '#dc2626', margin: 0 }}>{errorMessage(importMutation.error, 'The file could not be checked.')}</p>
      )}
      {done?.applied && (
        <p role="status" style={{ color: '#047857', margin: 0 }}>
          Saved: {done.created} added, {done.updated} updated, {done.unchanged} unchanged.
        </p>
      )}
      {file && check && (
        <div aria-label="Import check" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
          <p style={{ margin: '0 0 6px' }}>
            <strong>{file.name}</strong>: {check.created} to add, {check.updated} to update, {check.unchanged} unchanged
            {check.errors > 0 && <strong style={{ color: '#dc2626' }}>, {check.errors} with problems</strong>}
            {file.ignored.length > 0 && <span style={{ opacity: 0.7 }}> · ignored columns: {file.ignored.join(', ')}</span>}
          </p>
          {listed.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {listed.map((row) => (
                  <tr key={row.row} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...cell, opacity: 0.6, whiteSpace: 'nowrap' }}>line {row.row + 1}</td>
                    <td style={cell}>
                      <code>{row.itemCode ?? '-'}</code>
                    </td>
                    <td style={{ ...cell, color: row.action === 'error' ? '#dc2626' : undefined, fontWeight: row.action === 'error' ? 600 : 400 }}>
                      {row.action === 'create' ? 'add' : row.action}
                    </td>
                    <td style={cell}>{row.message ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <button type="button" disabled={check.errors > 0 || changes === 0 || importMutation.isPending} onClick={() => void save()}>
              {changes === 0 ? 'Nothing to save' : `Save ${changes} change${changes === 1 ? '' : 's'}`}
            </button>
            <button type="button" style={{ background: 'transparent' }} onClick={() => void choose(undefined)}>
              Cancel
            </button>
            {check.errors > 0 && <span className="inspector-hint">Fix the lines with problems and choose the file again.</span>}
          </div>
        </div>
      )}
    </section>
  )
}
