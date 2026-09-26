import { useBomWhereUsedQuery, useBomsQuery, useBuildableBomsQuery } from '../../../entities/bom/api/useBoms'
import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import { isActiveItem } from '../model/itemStatusModel'
import { useInventoriesQuery } from '../../../entities/inventory/api/useInventoriesQuery'
import { useLedgerSearchQuery } from '../../../entities/inventory/api/useLedgerSearch'
import { useLotsQuery } from '../../../entities/inventory/api/useLots'
import { useStockAnalysisQuery } from '../../../entities/inventory/api/useStockAnalysis'
import { useStockWasteQuery } from '../../../entities/inventory/api/useStockWaste'
import { useDefectsQuery, useQualityInspectionsQuery } from '../../../entities/quality/api/useQuality'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ItemDto } from '../../../shared/types/api'
import { summariseItemStock } from '../model/itemDetailModel'
import { itemInfoLines } from '../model/itemInfoModel'
import { coverLabel, idleLabel } from '../model/stockAnalysisModel'

const cell = { padding: '3px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const
const block = { borderTop: '1px solid var(--border)', paddingTop: 8 } as const

/**
 * One item at a glance: its master data, where its stock is, its LOTs, the BOMs that make it or use it, the last 30
 * days of use and its latest movements. Everything comes from the lists the other tabs use.
 */
export function ItemDetail({
  projectId,
  item,
  unit,
  onEdit,
  onClose,
}: {
  projectId: string
  item: ItemDto
  unit: string
  onEdit: () => void
  onClose: () => void
}) {
  const inventoriesQuery = useInventoriesQuery(projectId)
  const lotsQuery = useLotsQuery(projectId)
  const bomsQuery = useBomsQuery(projectId)
  const whereUsedQuery = useBomWhereUsedQuery(projectId, item.itemId)
  // What the approved BOM for this product could make from usable stock now.
  const canMake = useBuildableBomsQuery(projectId).data?.find((entry) => entry.targetItemId === item.itemId)
  const itemCodes = new Map((useItemsQuery(projectId).data ?? []).map((other) => [other.itemId, other.itemCode]))
  const analysisQuery = useStockAnalysisQuery(projectId, 30)
  const waste = useStockWasteQuery(projectId, 30).data?.lines.find((line) => line.itemId === item.itemId)
  const ledgerQuery = useLedgerSearchQuery(projectId, { itemId: item.itemId }, 10)
  const inspectionsQuery = useQualityInspectionsQuery(projectId, { itemId: item.itemId })
  const defectsQuery = useDefectsQuery(projectId, { itemId: item.itemId })

  const records = (inventoriesQuery.data ?? []).filter((row) => row.itemId === item.itemId)
  const stock = summariseItemStock(records, item.itemId)
  const lots = (lotsQuery.data ?? []).filter((lot) => lot.itemId === item.itemId)
  const makes = (bomsQuery.data ?? []).filter((bom) => bom.targetItemId === item.itemId)
  const usedIn = whereUsedQuery.data ?? []
  const use = analysisQuery.data?.lines.find((line) => line.itemId === item.itemId)
  const movements = ledgerQuery.data?.pages[0]?.items ?? []
  const inspections = inspectionsQuery.data ?? []
  const failed = inspections.filter((inspection) => inspection.resultStatus === 'fail').length
  const defects = defectsQuery.data ?? []
  const openDefects = defects.filter((defect) => !defect.resolved).length

  return (
    <section
      aria-label={`Item ${item.itemCode}`}
      style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 12, display: 'grid', gap: 8, fontSize: 13 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <strong>
          <code>{item.itemCode}</code> {item.itemName}
        </strong>
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={onEdit} style={{ fontSize: 12 }}>
            Edit
          </button>
          <button type="button" onClick={onClose} style={{ fontSize: 12, background: 'transparent' }}>
            Close
          </button>
        </span>
      </div>
      <p style={{ margin: 0, opacity: 0.8 }}>
        {item.itemType} · {item.resourceCategory} · {unit || 'no unit'} ·{' '}
        {isActiveItem(item) ? (
          item.itemStatus
        ) : (
          <span style={{ color: '#b45309' }} title="Its stock can still be used up (docs/domain/item-status.md)">
            {item.itemStatus}: no new stock, BOM use or work orders
          </span>
        )}
        {item.lotManageYn === 'Y' ? ' · LOT-tracked' : ''}
        {item.unitCost != null ? ` · unit cost ${formatQty(item.unitCost)}` : ''}
        {item.purchaseUnit ? ` · bought in ${item.purchaseUnit} of ${formatQty(item.purchaseUnitQty)} ${unit}` : ''}
        {item.safetyStockQty ? ` · safety stock ${formatQty(item.safetyStockQty)}` : ''}
        {item.leadTimeDays != null ? ` · lead time ${item.leadTimeDays} d` : ''}
      </p>
      {itemInfoLines(item.details).length > 0 && (
        <dl aria-label="Item details" style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '2px 10px' }}>
          {itemInfoLines(item.details).map((line) => (
            <div key={line.label} style={{ display: 'contents' }}>
              <dt style={{ opacity: 0.7 }}>{line.label}</dt>
              <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{line.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div aria-label="Item stock" style={block}>
        <strong>Stock</strong>{' '}
        {stock.records === 0 ? (
          <span className="inspector-hint">no stock records</span>
        ) : (
          <span>
            {formatQty(stock.onHand)} {unit} on hand in {stock.records} record{stock.records === 1 ? '' : 's'} at {stock.locations} place
            {stock.locations === 1 ? '' : 's'}
            {stock.reserved ? `, ${formatQty(stock.reserved)} reserved` : ''}
            {stock.quarantined ? <span style={{ color: '#b45309' }}>, {formatQty(stock.quarantined)} quarantined</span> : ''}
          </span>
        )}
        {records.length > 0 && (
          <table style={{ borderCollapse: 'collapse', marginTop: 4, fontSize: 12 }}>
            <tbody>
              {records.map((row) => (
                <tr key={row.inventoryId}>
                  <td style={cell}>{row.location ?? 'no location'}</td>
                  <td style={cell}>{row.lotNo ? `LOT ${row.lotNo}` : ''}</td>
                  <td style={num}>{formatQty(row.quantity)}</td>
                  <td style={{ ...cell, opacity: 0.7 }}>{row.inventoryStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {item.lotManageYn === 'Y' && (
        <div aria-label="Item LOTs" style={block}>
          <strong>LOTs</strong> {lots.length === 0 && <span className="inspector-hint">none registered</span>}
          {lots.slice(0, 8).map((lot) => (
            <span key={lot.lotId} style={{ marginLeft: 8, color: lot.expired ? '#b91c1c' : undefined }}>
              <code>{lot.lotNo}</code> {formatQty(lot.quantityOnHand)} · {lot.lotStatus}
              {lot.expiryDate ? ` · exp ${lot.expiryDate}` : ''}
            </span>
          ))}
          {lots.length > 8 && <span className="inspector-hint"> and {lots.length - 8} more on the LOTs tab</span>}
        </div>
      )}

      <div aria-label="Item BOMs" style={block}>
        <strong>BOMs</strong>{' '}
        {makes.length === 0 && usedIn.length === 0 && <span className="inspector-hint">not in any BOM</span>}
        {makes.length > 0 && (
          <span>made by {makes.map((bom) => `${bom.bomName} v${bom.bomVersion} (${bom.bomStatus.replace('_', ' ')})`).join(', ')}</span>
        )}
        {canMake && canMake.buildable != null && (
          <span aria-label="Item can make" style={{ color: Number(canMake.buildable) > 0 ? undefined : '#b91c1c' }}>
            {' '}· stock can make {formatQty(canMake.buildable)} {canMake.targetUnit} now
            {canMake.limitingItemId ? ` (${itemCodes.get(canMake.limitingItemId) ?? canMake.limitingItemId} runs out first)` : ''}
          </span>
        )}
        {makes.length > 0 && usedIn.length > 0 && ' · '}
        {usedIn.length > 0 && (
          <span>
            used in{' '}
            {usedIn
              .map((line) => `${line.targetItemCode ?? line.targetItemId} ${line.bomName} v${line.bomVersion} (${formatQty(line.lineQuantity)} ${line.lineUnit})`)
              .join(', ')}
          </span>
        )}
      </div>

      <div aria-label="Item use" style={block}>
        <strong>Last 30 days</strong>{' '}
        {use ? (
          <span>
            used {formatQty(use.consumedQuantity)} {unit}, lasts {coverLabel(use)}, idle {idleLabel(use.idleDays)}
            {use.abcClass ? `, class ${use.abcClass}` : ''}
          </span>
        ) : (
          <span className="inspector-hint">no stock and no use</span>
        )}
        {waste && (
          <span aria-label="Item waste" style={{ color: '#b45309' }}>
            {' '}· lost {formatQty(waste.total)} {unit}
            {' '}({[
              waste.expired ? `${formatQty(waste.expired)} expired` : null,
              waste.defect ? `${formatQty(waste.defect)} defective` : null,
              waste.countLoss ? `${formatQty(waste.countLoss)} short at counts` : null,
            ].filter(Boolean).join(', ')})
            {waste.value !== null ? `, worth ${formatQty(waste.value)}` : ''}
          </span>
        )}
      </div>

      <div aria-label="Item quality" style={block}>
        <strong>Quality</strong>{' '}
        {inspections.length === 0 && defects.length === 0 ? (
          <span className="inspector-hint">no inspections or defects</span>
        ) : (
          <span>
            {inspections.length} inspection{inspections.length === 1 ? '' : 's'}
            {failed > 0 && <span style={{ color: '#b91c1c' }}> ({failed} failed)</span>}
            {inspections[0] && `, latest ${inspections[0].inspectionType} ${inspections[0].resultStatus} on ${new Date(inspections[0].inspectedAt).toLocaleDateString()}`}
            {' · '}
            {defects.length} defect{defects.length === 1 ? '' : 's'}
            {openDefects > 0 && <span style={{ color: '#b45309' }}> ({openDefects} open)</span>}
          </span>
        )}
      </div>

      <div aria-label="Item movements" style={block}>
        <strong>Latest movements</strong> {movements.length === 0 && <span className="inspector-hint">none yet</span>}
        {movements.length > 0 && (
          <table style={{ borderCollapse: 'collapse', marginTop: 4, fontSize: 12 }}>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.inventoryTransactionId}>
                  <td style={{ ...cell, opacity: 0.7, whiteSpace: 'nowrap' }}>
                    {movement.createdAt ? new Date(movement.createdAt).toLocaleString() : ''}
                  </td>
                  <td style={cell}>{movement.transactionType}</td>
                  <td style={{ ...num, color: movement.quantityDelta < 0 ? '#b91c1c' : movement.quantityDelta > 0 ? '#047857' : undefined }}>
                    {movement.quantityDelta > 0 ? '+' : ''}
                    {formatQty(movement.quantityDelta)}
                  </td>
                  <td style={{ ...num, opacity: 0.7 }}>→ {formatQty(movement.quantityAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
