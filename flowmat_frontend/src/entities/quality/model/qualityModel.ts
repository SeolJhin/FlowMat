import type {
  DefectCreateRequest,
  DefectDto,
  DefectSeverity,
  InventoryDto,
  InspectionResult,
  ProductionRunItemDto,
  QualityInspectionCreateRequest,
  QualityInspectionDto,
} from '../../../shared/types/api'

/** Something of this run that can be inspected: one LOT, or an item recorded without a LOT. */
export interface InspectionTarget {
  key: string
  itemId: string
  lotId: string | null
  direction: string
}

/**
 * The run's LOTs and LOT-less items, outputs first, each once. Cancelled recordings are left out: what they point at
 * was not really used or made by this run.
 */
export function inspectionTargets(runItems: ProductionRunItemDto[]): InspectionTarget[] {
  const targets = new Map<string, InspectionTarget>()
  const ordered = [...runItems].sort((a, b) => Number(a.direction !== 'output') - Number(b.direction !== 'output'))
  for (const item of ordered) {
    if (item.cancelled) continue
    const key = item.lotId ? `lot:${item.lotId}` : `item:${item.itemId}`
    if (!targets.has(key)) {
      targets.set(key, { key, itemId: item.itemId, lotId: item.lotId, direction: item.direction })
    }
  }
  return [...targets.values()]
}

export interface InspectionDraft {
  targetKey: string
  inspectionType: string
  measuredValue: string
  standardMin: string
  standardMax: string
  unit: string
  result: InspectionResult | ''
  note: string
  quarantineLot: boolean
}

export const EMPTY_INSPECTION: InspectionDraft = {
  targetKey: '',
  inspectionType: '',
  measuredValue: '',
  standardMin: '',
  standardMax: '',
  unit: '',
  result: '',
  note: '',
  quarantineLot: false,
}

type Parsed = { ok: true; value: number | null } | { ok: false }

function parse(text: string): Parsed {
  if (!text.trim()) return { ok: true, value: null }
  const value = Number(text)
  return Number.isFinite(value) ? { ok: true, value } : { ok: false }
}

/**
 * The result a measured value with a limit gives, the same way the server works it out; null when the inspector has to
 * say it (no measurement, or no limit).
 */
export function measuredResult(draft: Pick<InspectionDraft, 'measuredValue' | 'standardMin' | 'standardMax'>): InspectionResult | null {
  const value = parse(draft.measuredValue)
  const min = parse(draft.standardMin)
  const max = parse(draft.standardMax)
  if (!value.ok || !min.ok || !max.ok || value.value === null || (min.value === null && max.value === null)) return null
  const within = (min.value === null || value.value >= min.value) && (max.value === null || value.value <= max.value)
  return within ? 'pass' : 'fail'
}

export type BuildResult<T> = { ok: true; body: T } | { ok: false; error: string }

/** {@code productionRunId} is null when the inspection is not about a run, e.g. a received LOT. */
export function buildInspectionRequest(
  draft: InspectionDraft,
  targets: InspectionTarget[],
  productionRunId: string | null,
): BuildResult<Omit<QualityInspectionCreateRequest, 'projectId'>> {
  const target = targets.find((t) => t.key === draft.targetKey)
  if (!target) return { ok: false, error: 'Pick what was inspected.' }
  if (!draft.inspectionType.trim()) return { ok: false, error: 'Say what was checked.' }
  const value = parse(draft.measuredValue)
  const min = parse(draft.standardMin)
  const max = parse(draft.standardMax)
  if (!value.ok || !min.ok || !max.ok) return { ok: false, error: 'Measured value and limits must be numbers.' }
  if (min.value !== null && max.value !== null && min.value > max.value) {
    return { ok: false, error: 'The lower limit is above the upper limit.' }
  }
  const result = measuredResult(draft) ?? (draft.result || null)
  if (!result) return { ok: false, error: 'Give the result, or a measured value with a limit.' }
  if (draft.quarantineLot && (result !== 'fail' || !target.lotId)) {
    return { ok: false, error: 'Only a failed inspection of a LOT can quarantine it.' }
  }
  return {
    ok: true,
    body: {
      productionRunId,
      lotId: target.lotId,
      itemId: target.lotId ? null : target.itemId,
      inspectionType: draft.inspectionType.trim(),
      result,
      measuredValue: value.value,
      standardMin: min.value,
      standardMax: max.value,
      unit: draft.unit.trim() || null,
      note: draft.note.trim() || null,
      quarantineLot: draft.quarantineLot,
    },
  }
}

export interface DefectDraft {
  /** Set when the defect is logged from an inspection; run, LOT and item then come from it. */
  inspectionId: string | null
  targetKey: string
  quantity: string
  defectType: string
  severity: DefectSeverity
  reason: string
}

export const EMPTY_DEFECT: DefectDraft = {
  inspectionId: null,
  targetKey: '',
  quantity: '',
  defectType: '',
  severity: 'minor',
  reason: '',
}

export function buildDefectRequest(
  draft: DefectDraft,
  targets: InspectionTarget[],
  productionRunId: string | null,
): BuildResult<Omit<DefectCreateRequest, 'projectId'>> {
  const quantity = Number(draft.quantity)
  if (!draft.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: 'The defective quantity must be more than 0.' }
  }
  if (!draft.defectType.trim()) return { ok: false, error: 'Say what the defect is.' }
  const common = { quantity, defectType: draft.defectType.trim(), severity: draft.severity, reason: draft.reason.trim() || null }
  if (draft.inspectionId) return { ok: true, body: { inspectionId: draft.inspectionId, ...common } }
  const target = targets.find((t) => t.key === draft.targetKey)
  if (!target) return { ok: false, error: 'Pick where the defect was found.' }
  return {
    ok: true,
    body: { productionRunId, lotId: target.lotId, itemId: target.lotId ? null : target.itemId, ...common },
  }
}

/** Stock records a defect can be scrapped from: the defect's item, its LOT when it names one, and something on hand. */
export function scrapCandidates(defect: Pick<DefectDto, 'itemId' | 'lotId'>, stock: InventoryDto[]): InventoryDto[] {
  return stock.filter(
    (row) => row.itemId === defect.itemId && (defect.lotId === null || row.lotId === defect.lotId) && row.quantity > 0,
  )
}

/** Resolving sends what was done and, when a record is picked, how much to scrap from it. */
export function buildResolution(draft: { actionTaken: string; scrapFrom: string; scrapQuantity: string }): BuildResult<{
  actionTaken: string
  scrapInventoryId?: string
  scrapQuantity?: number
}> {
  const actionTaken = draft.actionTaken.trim()
  if (!actionTaken) return { ok: false, error: 'Say what was done about the defect.' }
  if (!draft.scrapFrom) return { ok: true, body: { actionTaken } }
  const quantity = Number(draft.scrapQuantity)
  if (!draft.scrapQuantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: 'Give how much to scrap (more than 0).' }
  }
  return { ok: true, body: { actionTaken, scrapInventoryId: draft.scrapFrom, scrapQuantity: quantity } }
}

/** "14.2 % (limits 10–12)", "5 (at most 4)", or "" when nothing was measured. */
export function describeMeasurement(
  inspection: Pick<QualityInspectionDto, 'measuredValue' | 'standardMin' | 'standardMax' | 'unit'>,
  format: (value: number) => string = String,
): string {
  if (inspection.measuredValue === null) return ''
  const unit = inspection.unit ? ` ${inspection.unit}` : ''
  const { standardMin: min, standardMax: max } = inspection
  const limits =
    min !== null && max !== null
      ? ` (limits ${format(min)}–${format(max)})`
      : min !== null
        ? ` (at least ${format(min)})`
        : max !== null
          ? ` (at most ${format(max)})`
          : ''
  return `${format(inspection.measuredValue)}${unit}${limits}`
}
