import { useState } from 'react'
import { AsOfInput } from './AsOfInput'
import { useBomWhereUsedQuery, useBomWhereUsedTreeQuery } from '../../../entities/bom/api/useBoms'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { lineTypeTag } from '../model/bomLineTypeModel'
import type { ItemDto } from '../../../shared/types/api'

const cell = { padding: '6px 6px' } as const

/**
 * Where an item is used: every BOM revision that has it as a line, approved first. Answers "what does changing or
 * dropping this material affect?". Clicking a row opens that BOM.
 */
export function BomWhereUsed({
  projectId,
  items,
  onOpen,
}: {
  projectId: string
  items: ItemDto[]
  onOpen: (bomId: string) => void
}) {
  const [itemId, setItemId] = useState('')
  const [allLevels, setAllLevels] = useState(false)
  const whereUsedQuery = useBomWhereUsedQuery(projectId, !allLevels && itemId ? itemId : null)
  const rows = whereUsedQuery.data ?? []

  return (
    <section aria-label="Where used" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
      <h4 style={{ margin: '0 0 6px' }}>Where is a material used?</h4>
      <label style={{ display: 'grid', gap: 4, fontSize: 12, maxWidth: 360 }}>
        <span>Material</span>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">Choose an item...</option>
          {items.map((item) => (
            <option key={item.itemId} value={item.itemId}>
              {item.itemCode} · {item.itemName}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginTop: 6 }}>
        <input type="checkbox" checked={allLevels} onChange={(e) => setAllLevels(e.target.checked)} />
        <span>All levels, through approved sub-assemblies up to the top products</span>
      </label>
      {allLevels && itemId && <WhereUsedAllLevels projectId={projectId} itemId={itemId} onOpen={onOpen} />}
      {!allLevels && whereUsedQuery.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(whereUsedQuery.error, 'Failed to look it up.')}</p>
      )}
      {!allLevels && itemId && !whereUsedQuery.isLoading && rows.length === 0 && (
        <p className="inspector-hint">No BOM uses this item.</p>
      )}
      {!allLevels && rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={cell}>Product</th>
              <th style={cell}>BOM</th>
              <th style={cell}>Status</th>
              <th style={{ ...cell, textAlign: 'right' }}>Uses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.bomLineId}
                onClick={() => onOpen(row.bomId)}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: row.bomStatus === 'retired' ? 0.6 : 1 }}
              >
                <td style={cell}>
                  {row.targetItemCode ?? row.targetItemId}
                  {row.targetItemName ? ` · ${row.targetItemName}` : ''}
                </td>
                <td style={cell}>
                  <code>v{row.bomVersion}</code> {row.bomName}
                </td>
                <td style={cell}>{row.bomStatus.replace('_', ' ')}</td>
                <td style={{ ...cell, textAlign: 'right' }}>
                  {lineTypeTag(row.lineType) ? 'gives off ' : ''}
                  {formatQty(row.lineQuantity)} {row.lineUnit} per {formatQty(row.baseQuantity)} {row.baseUnit}
                  {lineTypeTag(row.lineType) && <span className="inspector-hint"> ({lineTypeTag(row.lineType)})</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/**
 * The item's uses at every level through approved BOMs (docs/domain/multi-level-bom.md "다단계 역전개"): first the top
 * products and how much of the item one of them takes, then every route, indented by level.
 */
function WhereUsedAllLevels({ projectId, itemId, onOpen }: { projectId: string; itemId: string; onOpen: (bomId: string) => void }) {
  const [on, setOn] = useState('')
  return (
    <div style={{ marginTop: 8 }}>
      <AsOfInput label="Where used as of" value={on} onChange={setOn} />
      <WhereUsedTree projectId={projectId} itemId={itemId} on={on} onOpen={onOpen} />
    </div>
  )
}

function WhereUsedTree({ projectId, itemId, on, onOpen }: {
  projectId: string; itemId: string; on: string; onOpen: (bomId: string) => void
}) {
  const treeQuery = useBomWhereUsedTreeQuery(projectId, itemId, on)
  const tree = treeQuery.data
  if (treeQuery.isError) {
    return <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(treeQuery.error, 'Failed to look it up.')}</p>
  }
  if (!tree) return null
  if (tree.uses.length === 0) {
    return <p className="inspector-hint">No approved BOM uses this item.</p>
  }
  const unit = tree.unit ?? ''
  return (
    <div aria-label="Where used at all levels" style={{ marginTop: 8, fontSize: 13 }}>
      <p style={{ margin: '0 0 6px' }}>
        <strong>Top products:</strong>{' '}
        {tree.topProducts
          .map((top) =>
            `${top.itemCode} needs ${top.perUnit == null ? '?' : formatQty(top.perUnit)} ${unit} per ${top.unit ?? 'unit'}`
            + (top.routes > 1 ? ` (${top.routes} routes)` : '')
            + (top.levels > 1 ? ` · ${top.levels} levels` : ''),
          )
          .join('; ')}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
            <th style={cell}>Used in</th>
            <th style={{ ...cell, textAlign: 'right' }}>BOM line</th>
            <th style={{ ...cell, textAlign: 'right' }}>{tree.itemCode} per product</th>
          </tr>
        </thead>
        <tbody>
          {tree.uses.map((use) => (
            <tr
              key={use.path.join('>') + use.bomId}
              onClick={() => onOpen(use.bomId)}
              title={use.path.join(' → ')}
              style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            >
              <td style={{ ...cell, paddingLeft: 6 + (use.level - 1) * 18 }}>
                {use.level > 1 && <span style={{ opacity: 0.5 }}>↳ </span>}
                {use.productItemCode}
                {use.productItemName ? ` · ${use.productItemName}` : ''} <code>v{use.bomVersion}</code>
                {use.topLevel && <span className="inspector-hint"> · top</span>}
              </td>
              <td style={{ ...cell, textAlign: 'right' }}>
                {use.level > 1 ? `${use.materialItemCode} ` : ''}
                {formatQty(use.lineQuantity)} {use.lineUnit} per {formatQty(use.baseQuantity)} {use.baseUnit}
              </td>
              <td style={{ ...cell, textAlign: 'right' }}>
                {use.perProductUnit == null ? '?' : `${formatQty(use.perProductUnit)} ${unit}`}
                {use.productUnit ? ` / ${use.productUnit}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tree.problems.length > 0 && (
        <p role="note" style={{ color: '#b45309', fontSize: 12, margin: '4px 0 0' }}>Not converted: {tree.problems.join('; ')}</p>
      )}
    </div>
  )
}
