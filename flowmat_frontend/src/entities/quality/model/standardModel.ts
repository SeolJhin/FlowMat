import type {
  InspectionStage,
  InspectionStandardDto,
  InspectionStandardInput,
  RunChecklistLine,
  RunQualityChecklistDto,
} from '../api/useInspectionStandards'
import type { QualityInspectionDto } from '../../../shared/types/api'

export const STAGES: InspectionStage[] = ['production', 'receipt', 'any']

export const STAGE_LABELS: Record<InspectionStage, string> = {
  production: 'Production',
  receipt: 'Receipt',
  any: 'Any time',
}

/** "10–12 %", "≤ 12 %", "≥ 10 %", or "pass/fail" when there is no limit. */
export function limitsText(min: number | null, max: number | null, unit: string | null): string {
  const suffix = unit ? ` ${unit}` : ''
  if (min !== null && max !== null) return `${min}–${max}${suffix}`
  if (max !== null) return `≤ ${max}${suffix}`
  if (min !== null) return `≥ ${min}${suffix}`
  return 'pass/fail'
}

/** The active standards an inspection of this item can follow, by check name. */
export function usableStandards(standards: InspectionStandardDto[], itemId: string | null | undefined): InspectionStandardDto[] {
  if (!itemId) return []
  return standards
    .filter((standard) => standard.active && standard.itemId === itemId)
    .sort((left, right) => left.inspectionType.localeCompare(right.inspectionType))
}

/** e.g. "Moisture · 10–12 %", with the stage when it is not a production check. */
export function standardLabel(standard: InspectionStandardDto): string {
  const stage = standard.stage === 'production' ? '' : ` (${STAGE_LABELS[standard.stage].toLowerCase()})`
  return `${standard.inspectionType} · ${limitsText(standard.standardMin, standard.standardMax, standard.unit)}${stage}`
}

/** The form as typed. */
export interface StandardForm {
  itemId: string
  inspectionType: string
  stage: InspectionStage
  standardMin: string
  standardMax: string
  unit: string
  required: boolean
  note: string
}

export const EMPTY_STANDARD_FORM: StandardForm = {
  itemId: '',
  inspectionType: '',
  stage: 'production',
  standardMin: '',
  standardMax: '',
  unit: '',
  required: false,
  note: '',
}

export function standardForm(standard: InspectionStandardDto): StandardForm {
  return {
    itemId: standard.itemId,
    inspectionType: standard.inspectionType,
    stage: standard.stage,
    standardMin: standard.standardMin === null ? '' : String(standard.standardMin),
    standardMax: standard.standardMax === null ? '' : String(standard.standardMax),
    unit: standard.unit ?? '',
    required: standard.required,
    note: standard.note ?? '',
  }
}

function number(text: string): number | null | undefined {
  if (!text.trim()) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : undefined
}

/** What to send, or what is wrong with the form. */
export function standardPayload(
  form: StandardForm,
): { input: InspectionStandardInput; error: null } | { input: null; error: string } {
  if (!form.itemId) return { input: null, error: 'Pick the item.' }
  const check = form.inspectionType.trim()
  if (!check) return { input: null, error: 'Say what is checked.' }
  if (check.length > 50) return { input: null, error: 'The check name is longer than 50 characters.' }
  if (form.unit.trim().length > 20) return { input: null, error: 'The unit is longer than 20 characters.' }
  if (form.note.trim().length > 500) return { input: null, error: 'The note is longer than 500 characters.' }
  const min = number(form.standardMin)
  const max = number(form.standardMax)
  if (min === undefined || max === undefined) return { input: null, error: 'Limits must be numbers.' }
  if (min !== null && max !== null && min > max) return { input: null, error: 'The lower limit is above the upper limit.' }
  return {
    input: {
      itemId: form.itemId,
      inspectionType: check,
      stage: form.stage,
      standardMin: min,
      standardMax: max,
      unit: form.unit.trim() || null,
      required: form.required,
      note: form.note.trim() || null,
    },
    error: null,
  }
}

/** e.g. "1 of 2 required checks passed · 1 missing · 1 failed"; empty when the run's items have no standards. */
/**
 * What finishing the run should warn about (docs/domain/inspection-standard.md): required checks with no inspection yet
 * and checks that failed, each named "ITEM check". Null when there is nothing to say or no checklist.
 */
export function finishQualityWarning(checklist: RunQualityChecklistDto | undefined): string | null {
  if (!checklist || checklist.lines.length === 0) return null
  const name = (line: RunChecklistLine) => `${line.itemCode ?? line.itemId} ${line.inspectionType}`
  const missing = checklist.lines.filter((line) => line.required && line.status === 'missing').map(name)
  const failed = checklist.lines.filter((line) => line.status === 'fail').map(name)
  const parts: string[] = []
  if (missing.length > 0) {
    parts.push(`${missing.length} required ${missing.length === 1 ? 'check is' : 'checks are'} not recorded (${missing.join(', ')})`)
  }
  if (failed.length > 0) parts.push(`${failed.length} ${failed.length === 1 ? 'check' : 'checks'} failed (${failed.join(', ')})`)
  return parts.length === 0 ? null : `Quality: ${parts.join('; ')}.`
}

/** The counts the run checklist comes with, worked out from lines (for checklists built here, such as a LOT's). */
export function checklistCounts(lines: RunChecklistLine[]): Omit<RunQualityChecklistDto, 'productionRunId'> {
  return {
    required: lines.filter((line) => line.required).length,
    requiredPassed: lines.filter((line) => line.required && line.status === 'pass').length,
    requiredMissing: lines.filter((line) => line.required && line.status === 'missing').length,
    failed: lines.filter((line) => line.status === 'fail').length,
    lines,
  }
}

/**
 * A LOT's receipt checks (docs/domain/inspection-standard.md): the active receipt and any-stage standards of its item,
 * each with the LOT's latest inspection that followed the standard or, following none, recorded the same check on the
 * item (the rule of the run checklist). Required first, then by check.
 */
export function receiptChecklist(
  standards: InspectionStandardDto[],
  itemId: string,
  inspections: QualityInspectionDto[],
): RunChecklistLine[] {
  const newestFirst = [...inspections].sort((left, right) => Date.parse(right.inspectedAt) - Date.parse(left.inspectedAt))
  return standards
    .filter((standard) => standard.active && standard.itemId === itemId && standard.stage !== 'production')
    .sort((left, right) => Number(right.required) - Number(left.required)
      || left.inspectionType.toLowerCase().localeCompare(right.inspectionType.toLowerCase()))
    .map((standard) => {
      const inspection = newestFirst.find((one) => one.standardId === standard.standardId
        || (!one.standardId && one.itemId === standard.itemId
          && one.inspectionType.toLowerCase() === standard.inspectionType.toLowerCase()))
      return {
        standardId: standard.standardId,
        itemId: standard.itemId,
        itemCode: standard.itemCode,
        itemName: standard.itemName,
        inspectionType: standard.inspectionType,
        stage: standard.stage,
        standardMin: standard.standardMin,
        standardMax: standard.standardMax,
        unit: standard.unit,
        required: standard.required,
        status: inspection ? inspection.resultStatus : 'missing',
        inspectionId: inspection?.inspectionId ?? null,
        measuredValue: inspection?.measuredValue ?? null,
        inspectedAt: inspection?.inspectedAt ?? null,
      }
    })
}

export function checklistSummary(
  checklist: Pick<RunQualityChecklistDto, 'required' | 'requiredPassed' | 'requiredMissing' | 'failed' | 'lines'> | undefined,
): string {
  if (!checklist || checklist.lines.length === 0) return ''
  const parts = [
    checklist.required === 0
      ? 'No required checks'
      : `${checklist.requiredPassed} of ${checklist.required} required ${checklist.required === 1 ? 'check' : 'checks'} passed`,
  ]
  if (checklist.requiredMissing > 0) parts.push(`${checklist.requiredMissing} missing`)
  if (checklist.failed > 0) parts.push(`${checklist.failed} failed`)
  return parts.join(' · ')
}

/** A LOT's receipt checks that are not done: required ones not recorded, and ones whose latest result failed. */
export interface ReceiptCheckCounts {
  missing: number
  failed: number
}

/**
 * The receipt checks each LOT still needs (docs/domain/inspection-standard.md), by the rule of the LOT's Receipt checks.
 * Only LOTs with a required check missing or a failed check are in the map; inspections without a LOT do not count.
 */
export function receiptCheckCounts(
  lots: { lotId: string; itemId: string }[],
  standards: InspectionStandardDto[],
  inspections: QualityInspectionDto[],
): Map<string, ReceiptCheckCounts> {
  const byLot = new Map<string, QualityInspectionDto[]>()
  for (const inspection of inspections) {
    if (!inspection.lotId) continue
    const found = byLot.get(inspection.lotId)
    if (found) {
      found.push(inspection)
    } else {
      byLot.set(inspection.lotId, [inspection])
    }
  }
  const counts = new Map<string, ReceiptCheckCounts>()
  for (const lot of lots) {
    const lines = receiptChecklist(standards, lot.itemId, byLot.get(lot.lotId) ?? [])
    const missing = lines.filter((line) => line.required && line.status === 'missing').length
    const failed = lines.filter((line) => line.status === 'fail').length
    if (missing > 0 || failed > 0) counts.set(lot.lotId, { missing, failed })
  }
  return counts
}

/** "1 required check missing · 1 failed". */
export function receiptCheckText(counts: ReceiptCheckCounts): string {
  const parts: string[] = []
  if (counts.missing > 0) parts.push(`${counts.missing} required ${counts.missing === 1 ? 'check' : 'checks'} missing`)
  if (counts.failed > 0) parts.push(`${counts.failed} failed`)
  return parts.join(' · ')
}
