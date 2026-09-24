import { useState, type ReactNode } from 'react'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { InventoryDto, QualityInspectionDto } from '../../../shared/types/api'
import {
  useDefectsQuery,
  useLogDefectMutation,
  useQualityInspectionsQuery,
  useRecordInspectionMutation,
  useResolveDefectMutation,
  type QualityFilter,
} from '../api/useQuality'
import type { InspectionTarget } from '../model/qualityModel'
import { DefectForm, DefectList, InspectionForm, InspectionList } from './QualityRecords'

interface Props {
  projectId: string
  /** Which records to show: one run's or one LOT's. */
  filter: QualityFilter
  /** What can be inspected from here. */
  targets: InspectionTarget[]
  targetLabel: (target: InspectionTarget) => string
  /** Sent with new records; null when they are not about a run. */
  productionRunId: string | null
  itemLabel: (itemId: string) => string
  /** Shown when there is nothing to inspect. */
  emptyHint: string
  /** The project's stock records, offered for scrapping when a defect is resolved. */
  stock: InventoryDto[]
  intro?: ReactNode
}

/**
 * Inspections and defects for one run or one LOT (docs/domain/quality-inspection.md): the lists, and the forms to add
 * to them. A failed inspection of a LOT can quarantine it; logging a defect moves no stock.
 */
export function QualitySection({
  projectId,
  filter,
  targets,
  targetLabel,
  productionRunId,
  itemLabel,
  emptyHint,
  stock,
  intro,
}: Props) {
  const inspectionsQuery = useQualityInspectionsQuery(projectId, filter)
  const defectsQuery = useDefectsQuery(projectId, filter)
  const recordMutation = useRecordInspectionMutation(projectId)
  const logMutation = useLogDefectMutation(projectId)
  const resolveMutation = useResolveDefectMutation(projectId)
  const [open, setOpen] = useState<null | 'inspection' | { defectFrom: QualityInspectionDto | null }>(null)

  const inspections = inspectionsQuery.data ?? []
  const defects = defectsQuery.data ?? []

  function subjectOf(record: { itemId: string | null; itemCode: string | null; lotNo: string | null }) {
    const item = record.itemId ? itemLabel(record.itemId) : (record.itemCode ?? '')
    return record.lotNo ? `${item} · LOT ${record.lotNo}` : item
  }

  function openForm(next: typeof open) {
    recordMutation.reset()
    logMutation.reset()
    setOpen(next)
  }

  const saveError = recordMutation.isError
    ? errorMessage(recordMutation.error, 'The inspection could not be saved.')
    : logMutation.isError
      ? errorMessage(logMutation.error, 'The defect could not be saved.')
      : null

  return (
    <>
      {intro}
      <h4 style={{ margin: '8px 0 4px' }}>Inspections</h4>
      {inspectionsQuery.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(inspectionsQuery.error, 'Failed to load inspections.')}</p>
      )}
      {inspections.length === 0 && !inspectionsQuery.isLoading && <p className="inspector-hint">No inspections yet.</p>}
      <InspectionList inspections={inspections} subjectOf={subjectOf} onLogDefect={(inspection) => openForm({ defectFrom: inspection })} />

      <h4 style={{ margin: '12px 0 4px' }}>Defects</h4>
      {defectsQuery.isError && <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(defectsQuery.error, 'Failed to load defects.')}</p>}
      {defects.length === 0 && !defectsQuery.isLoading && <p className="inspector-hint">No defects logged.</p>}
      <DefectList
        defects={defects}
        subjectOf={subjectOf}
        stock={stock}
        resolving={resolveMutation.isPending}
        onResolve={(defect, resolution) => resolveMutation.mutateAsync({ defectLogId: defect.defectLogId, ...resolution })}
      />
      {resolveMutation.isError && (
        <p role="alert" style={{ color: '#dc2626', fontSize: 12 }}>
          {errorMessage(resolveMutation.error, 'The defect could not be resolved.')}
        </p>
      )}

      {open === null && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" disabled={targets.length === 0} onClick={() => openForm('inspection')}>
            Record inspection
          </button>
          <button type="button" disabled={targets.length === 0} onClick={() => openForm({ defectFrom: null })}>
            Log defect
          </button>
          {targets.length === 0 && <span className="inspector-hint">{emptyHint}</span>}
        </div>
      )}
      {open === 'inspection' && (
        <InspectionForm
          targets={targets}
          targetLabel={targetLabel}
          productionRunId={productionRunId}
          pending={recordMutation.isPending}
          onSubmit={async (body) => {
            await recordMutation.mutateAsync(body)
            setOpen(null)
          }}
          onCancel={() => openForm(null)}
        />
      )}
      {open !== null && open !== 'inspection' && (
        <DefectForm
          key={open.defectFrom?.inspectionId ?? 'new'}
          targets={targets}
          targetLabel={targetLabel}
          productionRunId={productionRunId}
          fromInspection={
            open.defectFrom
              ? { inspectionId: open.defectFrom.inspectionId, label: `${open.defectFrom.inspectionType} (${subjectOf(open.defectFrom)})` }
              : null
          }
          pending={logMutation.isPending}
          onSubmit={async (body) => {
            await logMutation.mutateAsync(body)
            setOpen(null)
          }}
          onCancel={() => openForm(null)}
        />
      )}
      {saveError && (
        <p role="alert" style={{ color: '#dc2626', fontSize: 12 }}>
          {saveError}
        </p>
      )}
    </>
  )
}
