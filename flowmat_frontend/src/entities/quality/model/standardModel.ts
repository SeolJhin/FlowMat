import type {
  InspectionStage,
  InspectionStandardDto,
  InspectionStandardInput,
  RunQualityChecklistDto,
} from '../api/useInspectionStandards'

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
export function checklistSummary(checklist: RunQualityChecklistDto | undefined): string {
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
