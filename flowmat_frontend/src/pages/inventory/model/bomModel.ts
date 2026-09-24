import type { BomDto, BomStatus } from '../../../shared/types/api'
import type { BomAction } from '../../../entities/bom/api/useBoms'

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
