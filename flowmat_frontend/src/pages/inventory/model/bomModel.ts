import type { BomDto, BomLineImportRowDto, BomStatus } from '../../../shared/types/api'
import type { BomAction } from '../../../entities/bom/api/useBoms'
import { parseCsv } from './itemCsvModel'

/**
 * Buttons each BOM status offers (docs/domain/inventory-bom-lot-contract.md §5). The server enforces the same rules and
 * the owner-only steps (approve / reject / retire); this only avoids offering moves that cannot succeed.
 */
export function bomActions(status: BomStatus): BomAction[] {
  switch (status) {
    case 'draft':
      return ['submit']
    case 'pending_approval':
      return ['approve', 'reject']
    case 'approved':
      return ['revisions', 'retire']
    case 'retired':
      return ['revisions']
  }
}

export const BOM_ACTION_LABELS: Record<BomAction, string> = {
  submit: 'Submit for approval',
  approve: 'Approve',
  reject: 'Reject',
  retire: 'Retire',
  revisions: 'New revision',
}

/** Only drafts accept line changes. */
export function isEditable(bom: BomDto): boolean {
  return bom.bomStatus === 'draft'
}

/** Revisions grouped by the item they produce, newest revision first. */
export function groupByTarget(boms: BomDto[]): Map<string, BomDto[]> {
  const groups = new Map<string, BomDto[]>()
  for (const bom of boms) {
    const list = groups.get(bom.targetItemId) ?? []
    list.push(bom)
    groups.set(bom.targetItemId, list)
  }
  for (const list of groups.values()) list.sort((a, b) => b.bomVersion - a.bomVersion)
  return groups
}

/** The approved revision production would use for an item, if any. */
export function approvedRevision(boms: BomDto[], targetItemId: string): BomDto | undefined {
  return boms.find((bom) => bom.targetItemId === targetItemId && bom.bomStatus === 'approved')
}

export type BomLineChange = 'added' | 'removed' | 'changed' | 'same'

export interface BomLineComparison {
  childItemId: string
  before: { quantity: number; unit: string } | null
  after: { quantity: number; unit: string } | null
  change: BomLineChange
}

/** Materials keyed by item; lines of one item in one unit are added up, another unit gets its own entry. */
function materials(bom: BomDto): Map<string, { childItemId: string; quantity: number; unit: string }> {
  const byKey = new Map<string, { childItemId: string; quantity: number; unit: string }>()
  for (const line of bom.lines) {
    const existing = byKey.get(line.childItemId)
    if (existing && existing.unit === line.unit) existing.quantity += line.quantity
    else if (existing) byKey.set(`${line.childItemId}|${line.unit}`, { childItemId: line.childItemId, quantity: line.quantity, unit: line.unit })
    else byKey.set(line.childItemId, { childItemId: line.childItemId, quantity: line.quantity, unit: line.unit })
  }
  return byKey
}

/**
 * What changed from one revision to another, material by material, in the newer revision's order and then what was
 * dropped. Quantities are compared per unit of product, so halving the base and every quantity is no change; when the
 * base unit itself changed they are compared as written.
 */
export function compareBoms(from: BomDto, to: BomDto): { baseChanged: boolean; lines: BomLineComparison[] } {
  const sameBaseUnit = from.baseUnit === to.baseUnit
  const perBase = (quantity: number, bom: BomDto) => (sameBaseUnit ? quantity / bom.baseQuantity : quantity)
  const before = materials(from)
  const after = materials(to)
  const lines: BomLineComparison[] = []
  for (const [key, now] of after) {
    const was = before.get(key)
    const change: BomLineChange = !was
      ? 'added'
      : was.unit !== now.unit || Math.abs(perBase(was.quantity, from) - perBase(now.quantity, to)) > 1e-9
        ? 'changed'
        : 'same'
    lines.push({
      childItemId: now.childItemId,
      before: was ? { quantity: was.quantity, unit: was.unit } : null,
      after: { quantity: now.quantity, unit: now.unit },
      change,
    })
  }
  for (const [key, was] of before) {
    if (!after.has(key)) {
      lines.push({ childItemId: was.childItemId, before: { quantity: was.quantity, unit: was.unit }, after: null, change: 'removed' })
    }
  }
  return { baseChanged: from.baseQuantity !== to.baseQuantity || !sameBaseUnit, lines }
}

const BOM_LINE_COLUMNS: Record<string, keyof BomLineImportRowDto> = {
  item_code: 'itemCode',
  code: 'itemCode',
  material: 'itemCode',
  quantity: 'quantity',
  qty: 'quantity',
  unit: 'unit',
  unit_code: 'unit',
  note: 'note',
}

/** A draft's material lines from CSV text: item_code, quantity and unit columns by name, in any order. */
export function bomLinesFromCsv(text: string): { ok: true; rows: BomLineImportRowDto[] } | { ok: false; error: string } {
  const [header, ...data] = parseCsv(text)
  if (!header) return { ok: false, error: 'The file is empty.' }
  const fields = header.map((name) => BOM_LINE_COLUMNS[name.trim().toLowerCase().replace(/[\s-]+/g, '_')] ?? null)
  for (const [needed, label] of [['itemCode', 'item_code'], ['quantity', 'quantity'], ['unit', 'unit']] as const) {
    if (!fields.includes(needed)) return { ok: false, error: `The first line must name the columns, with a ${label} column.` }
  }
  if (data.length === 0) return { ok: false, error: 'The file has no materials under its header.' }
  return {
    ok: true,
    rows: data.map((cells) => {
      const row: BomLineImportRowDto = { itemCode: '' }
      fields.forEach((field, index) => {
        if (field) row[field] = (cells[index] ?? '').trim()
      })
      return row
    }),
  }
}

/** How much a revision's material cost moved: the difference and, when there was a cost before, the percentage. */
export function costChange(before: number, after: number): { delta: number; percent: number | null } {
  const delta = Math.round((after - before) * 10000) / 10000
  return { delta, percent: before === 0 ? null : Math.round((delta / before) * 1000) / 10 }
}
