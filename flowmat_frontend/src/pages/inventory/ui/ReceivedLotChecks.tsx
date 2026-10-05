import { useInspectionStandardsQuery } from '../../../entities/quality/api/useInspectionStandards'
import { receiptChecklist } from '../../../entities/quality/model/standardModel'
import { QualitySection } from '../../../entities/quality/ui/QualitySection'
import { ReceiptChecklist } from '../../../entities/quality/ui/ReceiptChecklist'
import type { InventoryDto } from '../../../shared/types/api'

/**
 * Right after stock comes in for a LOT, its receipt checks and the form to record them (docs/domain/inspection-standard.md),
 * so receiving and checking happen in one place; the same as under the LOT on the LOTs tab. Shows nothing when the
 * item has no receipt or any-stage checks.
 */
export function ReceivedLotChecks({
  projectId,
  lot,
  itemLabel,
  stock,
  onClose,
}: {
  projectId: string
  lot: { lotId: string; lotNo: string; itemId: string }
  itemLabel: (itemId: string) => string
  stock: InventoryDto[]
  onClose: () => void
}) {
  const standards = useInspectionStandardsQuery(projectId).data ?? []
  if (receiptChecklist(standards, lot.itemId, []).length === 0) return null
  return (
    <section aria-label={`Receipt checks for LOT ${lot.lotNo}`}
      style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <h4 style={{ margin: '0 0 6px' }}>Received LOT <code>{lot.lotNo}</code></h4>
        <button type="button" onClick={onClose} style={{ fontSize: 11 }}>Done</button>
      </div>
      <ReceiptChecklist projectId={projectId} lotId={lot.lotId} itemId={lot.itemId} />
      <QualitySection
        projectId={projectId}
        filter={{ lotId: lot.lotId }}
        targets={[{ key: `lot:${lot.lotId}`, itemId: lot.itemId, lotId: lot.lotId, direction: 'lot' }]}
        targetLabel={() => lot.lotNo}
        productionRunId={null}
        itemLabel={itemLabel}
        emptyHint=""
        stock={stock}
      />
    </section>
  )
}
