import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBomCostRollupQuery } from '../../../entities/bom/api/useBomCostRollup'
import { useUpdateItemMutation } from '../../../entities/catalog/api/useUpdateItemMutation'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { costGapPercent } from '../model/bomExplosionModel'
import { AsOfInput } from './AsOfInput'

const cell = { padding: '5px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

/**
 * Material cost per unit of every made item, rolled up through approved BOMs (docs/domain/multi-level-bom.md "반제품 원가
 * 누적"), beside the unit cost the item has now. "Use" writes a complete roll-up as the item's unit cost, which the
 * one-level BOM cost and stock value then pick up. Hidden when the project has no approved BOM.
 */
export function BomCostRollup({ projectId, onOpen }: { projectId: string; onOpen: (bomId: string) => void }) {
  const [on, setOn] = useState('')
  const rollupQuery = useBomCostRollupQuery(projectId, on)
  const updateItem = useUpdateItemMutation()
  const queryClient = useQueryClient()
  const lines = rollupQuery.data?.items ?? []
  if (rollupQuery.isError) {
    return <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(rollupQuery.error, 'Failed to roll up costs.')}</p>
  }
  // Hidden without approved BOMs today; kept once a day is chosen, so the day can be changed back.
  if (lines.length === 0 && !on) return null
  const differing = lines.filter((line) => line.complete && line.currentUnitCost !== Number(line.rolledUpCost)).length

  async function use(itemId: string, cost: number) {
    try {
      await updateItem.mutateAsync({ itemId, projectId, unitCost: cost })
      void queryClient.invalidateQueries({ queryKey: ['boms', projectId] })
    } catch {
      // Shown below.
    }
  }

  return (
    <details aria-label="Cost roll-up" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
      <summary style={{ cursor: 'pointer' }}>
        <strong>Cost roll-up</strong>{' '}
        <span className="inspector-hint">
          material cost per unit of {lines.length} made item{lines.length === 1 ? '' : 's'}
          {differing > 0 ? ` · ${differing} differ from their unit cost` : ''}
        </span>
      </summary>
      <p className="inspector-hint" style={{ margin: '6px 0' }}>
        Bought materials&apos; unit costs, through every approved BOM level. A sub-assembly counts at its own roll-up, not its
        stored unit cost. By-products earn no credit.
      </p>
      <AsOfInput label="Cost roll-up as of" value={on} onChange={setOn} />
      {on && lines.length === 0 && rollupQuery.isSuccess && <p className="inspector-hint">No approved BOM is effective on {on}.</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
            <th style={cell}>Item</th>
            <th style={num}>Levels</th>
            <th style={num}>Rolled-up cost</th>
            <th style={num}>Unit cost now</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const gap = line.complete ? costGapPercent(Number(line.rolledUpCost), line.currentUnitCost) : null
            const same = line.currentUnitCost === Number(line.rolledUpCost)
            return (
              <tr key={line.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  <button type="button" onClick={() => onOpen(line.bomId)} style={{ background: 'transparent', padding: 0, textAlign: 'left' }}>
                    {line.itemCode}
                    {line.itemName ? ` · ${line.itemName}` : ''} <code>v{line.bomVersion}</code>
                  </button>
                  {!line.complete && (
                    <span style={{ display: 'block', fontSize: 11, color: '#b45309' }}>
                      {line.missingCosts.length > 0 ? `no unit cost: ${line.missingCosts.join(', ')}` : ''}
                      {line.problems.length > 0 ? ` ${line.problems.join('; ')}` : ''}
                    </span>
                  )}
                </td>
                <td style={num}>{line.levels}</td>
                <td style={{ ...num, opacity: line.complete ? 1 : 0.7 }}>
                  {line.complete ? '' : '≥ '}
                  {formatQty(line.rolledUpCost)} / {line.unit ?? 'unit'}
                </td>
                <td style={num}>
                  {line.currentUnitCost == null ? '-' : formatQty(line.currentUnitCost)}
                  {gap != null && gap !== 0 && (
                    <span style={{ display: 'block', fontSize: 11, color: Math.abs(gap) >= 10 ? '#b45309' : undefined }}>
                      {gap > 0 ? '+' : ''}
                      {gap}%
                    </span>
                  )}
                </td>
                <td style={{ ...cell, width: 1 }}>
                  {line.complete && !same && (
                    <button
                      type="button"
                      disabled={updateItem.isPending || Boolean(on)}
                      onClick={() => void use(line.itemId, Number(line.rolledUpCost))}
                      title={on ? "Clear the day to set unit costs from today's roll-up" : "Set the item's unit cost to the rolled-up cost"}
                      style={{ fontSize: 11 }}
                    >
                      Use
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {updateItem.isError && (
        <p style={{ color: '#dc2626', fontSize: 12, margin: '6px 0 0' }}>{errorMessage(updateItem.error, 'The unit cost was not saved.')}</p>
      )}
    </details>
  )
}
