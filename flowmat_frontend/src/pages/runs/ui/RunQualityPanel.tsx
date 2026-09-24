import { useMemo } from 'react'
import { useInventoriesQuery } from '../../../entities/inventory/api/useInventoriesQuery'
import { useLotsQuery } from '../../../entities/inventory/api/useLots'
import { inspectionTargets, type InspectionTarget } from '../../../entities/quality/model/qualityModel'
import { QualitySection } from '../../../entities/quality/ui/QualitySection'
import type { ProductionRunDto, ProductionRunItemDto } from '../../../shared/types/api'

interface Props {
  projectId: string
  run: ProductionRunDto
  runItems: ProductionRunItemDto[]
  itemLabel: (itemId: string) => string
}

/** Inspections and defects of what this run used and made (docs/domain/quality-inspection.md). */
export function RunQualityPanel({ projectId, run, runItems, itemLabel }: Props) {
  const lotsQuery = useLotsQuery(projectId)
  const inventoriesQuery = useInventoriesQuery(projectId)
  const lotNo = useMemo(() => new Map((lotsQuery.data ?? []).map((lot) => [lot.lotId, lot.lotNo])), [lotsQuery.data])
  const targets = useMemo(() => inspectionTargets(runItems), [runItems])
  const filter = useMemo(() => ({ productionRunId: run.productionRunId }), [run.productionRunId])

  function targetLabel(target: InspectionTarget) {
    return `${target.direction} · ${itemLabel(target.itemId)}${target.lotId ? ` · LOT ${lotNo.get(target.lotId) ?? target.lotId}` : ''}`
  }

  return (
    <section aria-label="Quality" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <h3 style={{ marginTop: 0 }}>Quality</h3>
      <QualitySection
        projectId={projectId}
        filter={filter}
        targets={targets}
        targetLabel={targetLabel}
        productionRunId={run.productionRunId}
        itemLabel={itemLabel}
        emptyHint="Record items first; they are what gets inspected."
        stock={inventoriesQuery.data ?? []}
        intro={
          <p className="inspector-hint" style={{ marginTop: 0 }}>
            Inspections are kept as recorded; a new one follows a wrong one. Releasing a quarantined LOT is done from Stock.
          </p>
        }
      />
    </section>
  )
}
