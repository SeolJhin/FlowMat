import { useState } from 'react'
import { useBomExplosionQuery } from '../../../entities/bom/api/useBomExplosion'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { explosionSummary } from '../model/bomExplosionModel'
import { AsOfInput } from './AsOfInput'

const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

/**
 * The materials an approved BOM needs through all levels (docs/domain/multi-level-bom.md): the tree, each sub-assembly
 * with the materials of its own approved BOM under it, and the bought materials added up with their cost. Gross: stock
 * is not taken off.
 */
export function BomExplosion({ bomId, quantity }: { bomId: string; quantity: number }) {
  const [on, setOn] = useState('')
  const query = useBomExplosionQuery(bomId, quantity, on)
  const explosion = query.data

  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{ cursor: 'pointer', fontSize: 13 }}>Through sub-assemblies (all levels)</summary>
      <AsOfInput label="Explosion as of" value={on} onChange={setOn} />
      {query.isError && <p role="alert" style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(query.error, 'Could not explode the BOM.')}</p>}
      {explosion && (
        <div role="region" aria-label="BOM explosion" style={{ display: 'grid', gap: 8, fontSize: 12, marginTop: 6 }}>
          <span>{explosionSummary(explosion)}{explosion.asOf ? ` · as of ${explosion.asOf}` : ''}</span>
          {explosion.problems.length > 0 && <p role="note" style={{ color: '#b45309', margin: 0 }}>Not counted: {explosion.problems.join('; ')}</p>}
          <table aria-label="Exploded materials" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {explosion.lines.map((line, index) => (
                <tr key={`${line.parentItemId}-${line.itemId}-${index}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...cell, paddingLeft: 6 + (line.level - 1) * 16 }}>
                    {line.itemCode}{line.itemName ? ` · ${line.itemName}` : ''}
                    {line.bomId && <span className="inspector-hint"> · own BOM v{line.bomVersion}</span>}
                  </td>
                  <td style={num}>{formatQty(line.quantity)} {line.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table aria-label="Bought materials" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={cell}>Bought material</th><th style={num}>Total</th><th style={num}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {explosion.materials.map((material) => (
                <tr key={material.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cell}>{material.itemCode}{material.itemName ? ` · ${material.itemName}` : ''}</td>
                  <td style={num}>{formatQty(material.quantity)} {material.unit}</td>
                  <td style={{ ...num, opacity: material.cost == null ? 0.5 : 1 }}>{material.cost == null ? 'no cost' : formatQty(material.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  )
}
