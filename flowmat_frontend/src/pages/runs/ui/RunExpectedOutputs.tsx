import { useBomRequirementsQuery } from '../../../entities/bom/api/useBoms'
import { formatQty } from '../../../shared/lib/formatQty'
import type { BomOutputDto, ItemDto, ProductionRunItemDto } from '../../../shared/types/api'
import { differenceText, finishedByProduct, lineTypeTag, recordedOutput } from '../../inventory/model/bomLineTypeModel'

const cell = { padding: '6px 6px' } as const

/**
 * By-products and waste the run's BOM says a batch of this size gives off (docs/domain/bom-by-products.md), with what is
 * recorded so far. Nothing is recorded by itself: Record copies the rest into the output form, where the stock row is chosen.
 * Once the run is finished, what is expected follows what it made, and the difference shows instead of Record.
 */
export function RunExpectedOutputs({
  bomId,
  plannedOutputQty,
  runItems,
  items,
  open,
  madeQty,
  onRecord,
}: {
  bomId: string | null
  plannedOutputQty: number
  runItems: ProductionRunItemDto[]
  items: ItemDto[]
  open: boolean
  /** What a finished run made; null while it is open (or when it did not finish). */
  madeQty: number | null
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
            const finished = madeQty === null ? null : finishedByProduct(output.itemQuantity, plannedOutputQty, madeQty, recorded)
            return (
              <tr key={output.bomLineId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  {label.get(output.itemId) ?? output.itemId}
                  <span className="inspector-hint"> · {lineTypeTag(output.lineType)}</span>
                </td>
                <td style={{ ...cell, textAlign: 'right' }}>
                  {finished && madeQty !== null
                    ? `expected ${formatQty(finished.expected)} ${output.itemUnit} for ${formatQty(madeQty)} made`
                    : `expected ${formatQty(output.itemQuantity)} ${output.itemUnit}`}
                </td>
                <td style={{ ...cell, textAlign: 'right', opacity: 0.8 }}>recorded {formatQty(recorded)}</td>
                <td style={{ ...cell, color: finished && finished.difference < 0 ? '#b45309' : undefined }}>
                  {finished && differenceText(finished.difference, output.itemUnit)}
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
