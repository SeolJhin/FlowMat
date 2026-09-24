import type {
  ProductionRunItemDto,
  RunCorrectionLineDto,
  RunCorrectionLineRequest,
  RunCorrectionStatus,
} from '../../../shared/types/api'

/** A recording to add, as typed in the form (quantities stay strings until the request is built). */
export interface CorrectionAddDraft {
  direction: 'input' | 'output'
  itemId: string
  inventoryId: string
  qty: string
  unit: string
}

export interface CorrectionDraft {
  reason: string
  voidRunItemIds: string[]
  adds: CorrectionAddDraft[]
  /** Empty when the output quantity stays as it is. */
  outputQty: string
}

export type CorrectionRequestResult =
  | { ok: true; body: { reason: string; lines: RunCorrectionLineRequest[] } }
  | { ok: false; error: string }

/** Recordings a correction may void: they stand (not cancelled) and are not BOM plan lines. */
export function voidableRecordings(items: ProductionRunItemDto[]): ProductionRunItemDto[] {
  return items.filter((item) => item.quantitySource !== 'bom' && !item.cancelled)
}

/**
 * Turns the form into a correction request, or says what is missing. The server checks everything again; this only
 * catches what the form can know.
 */
export function buildCorrectionRequest(draft: CorrectionDraft, currentOutputQty: number | null): CorrectionRequestResult {
  const reason = draft.reason.trim()
  if (!reason) return { ok: false, error: 'Give a reason for the correction.' }

  const lines: RunCorrectionLineRequest[] = draft.voidRunItemIds.map((targetRunItemId) => ({
    kind: 'void_item',
    targetRunItemId,
  }))
  for (const [index, add] of draft.adds.entries()) {
    const qty = Number(add.qty)
    if (!add.itemId) return { ok: false, error: `Added recording ${index + 1}: choose the item.` }
    if (add.qty.trim() === '' || !Number.isFinite(qty) || qty <= 0) {
      return { ok: false, error: `Added recording ${index + 1}: the quantity must be greater than 0.` }
    }
    if (!add.unit.trim()) return { ok: false, error: `Added recording ${index + 1}: give the unit.` }
    lines.push({
      kind: 'add_item',
      direction: add.direction,
      itemId: add.itemId,
      inventoryId: add.inventoryId || null,
      qty,
      unit: add.unit.trim(),
    })
  }
  if (draft.outputQty.trim() !== '') {
    const afterQty = Number(draft.outputQty)
    if (!Number.isFinite(afterQty) || afterQty < 0) return { ok: false, error: 'The output quantity must be 0 or more.' }
    if (afterQty === Number(currentOutputQty ?? 0)) {
      return { ok: false, error: `The run's output is already ${afterQty}.` }
    }
    lines.push({ kind: 'set_output_qty', afterQty })
  }
  if (lines.length === 0) return { ok: false, error: 'Choose at least one change.' }
  return { ok: true, body: { reason, lines } }
}

/** One line of a correction in words, e.g. "Void input FLOUR · Flour 5 kg". */
export function describeCorrectionLine(
  line: RunCorrectionLineDto,
  runItems: ProductionRunItemDto[],
  itemLabel: (itemId: string) => string,
  formatQty: (value: number | null | undefined) => string,
): string {
  if (line.kind === 'set_output_qty') {
    return `Output ${formatQty(line.beforeQty)} → ${formatQty(line.afterQty)}`
  }
  if (line.kind === 'void_item') {
    const target = runItems.find((item) => item.productionRunItemId === line.targetRunItemId)
    if (!target) return 'Void a recording'
    return `Void ${target.direction} ${itemLabel(target.itemId)} ${formatQty(target.actualQty ?? target.plannedQty)} ${target.unit}`
  }
  return `Add ${line.direction ?? ''} ${line.itemId ? itemLabel(line.itemId) : ''} ${formatQty(line.qty)} ${line.unit ?? ''}`
    .replace(/\s+/g, ' ')
    .trim()
}

export function correctionStatusLabel(status: RunCorrectionStatus): string {
  switch (status) {
    case 'pending_approval':
      return 'waiting for approval'
    case 'applied':
      return 'applied'
    case 'rejected':
      return 'rejected'
  }
}
