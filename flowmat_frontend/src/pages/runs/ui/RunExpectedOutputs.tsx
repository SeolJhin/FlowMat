import { useBomRequirementsQuery } from '../../../entities/bom/api/useBoms'
import { formatQty } from '../../../shared/lib/formatQty'
import type { BomOutputDto, ItemDto, ProductionRunItemDto } from '../../../shared/types/api'
import { lineTypeTag, recordedOutput } from '../../inventory/model/bomLineTypeModel'

const cell = { padding: '6px 6px' } as const

/**
 * By-products and waste the run's BOM says a batch of this size gives off (docs/domain/bom-by-products.md), with what is
 * recorded so far. Nothing is recorded by itself: Record copies the rest into the output form, where the stock row is chosen.
 */
export function RunExpectedOutputs({
  bomId,
  plannedOutputQty,
  runItems,
  items,
  open,
  onRecord,
}: {
  bomId: string | null
  plannedOutputQty: number
  runItems: ProductionRunItemDto[]
  items: ItemDto[]
  open: boolean
  onRecord: (output: BomOutputDto, remaining: number) => void
}) {
  const query = useBomRequirementsQuery(bomId, plannedOutputQty)
  const outputs = query.data?.outputs ?? []
  if (outputs.length === 0) return null
  const label = new Map(items.map((item) => [item.itemId, `${item.itemCode} · ${item.itemName}`]))

  return (
    <section aria-label="Expected by-products" style={{ marginTop: 16 }}>
      <h4 style={{ margin: '0 0 6px' }}>Also comes out</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {outputs.map((output) => {
            const recorded = recordedOutput(output.itemId, runItems)
            const remaining = output.itemQuantity - recorded
            return (
              <tr key={output.bomLineId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  {label.get(output.itemId) ?? output.itemId}
                  <span className="inspector-hint"> · {lineTypeTag(output.lineType)}</span>
                </td>
                <td style={{ ...cell, textAlign: 'right' }}>expected {formatQty(output.itemQuantity)} {output.itemUnit}</td>
                <td style={{ ...cell, textAlign: 'right', opacity: 0.8 }}>recorded {formatQty(recorded)}</td>
                <td style={cell}>
                  {open && (
                    <button type="button" style={{ fontSize: 11 }} onClick={() => onRecord(output, remaining)}>Record</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
