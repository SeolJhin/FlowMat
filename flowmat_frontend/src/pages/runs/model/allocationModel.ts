import type { AllocationPlanLineDto, StockAllocationDto } from '../../../entities/production/api/useStockAllocations'

const qty = (value: number) => String(Number(value.toFixed(4)))

/** "Allocated FLOUR 8. Short: SALT 0.4.", or "Nothing more to allocate." */
export function planSummary(plan: AllocationPlanLineDto[]): string {
  const now = plan.filter((line) => line.allocatedNow > 0).map((line) => `${line.itemCode} ${qty(line.allocatedNow)}`)
  const short = plan.filter((line) => line.shortage > 0).map((line) => `${line.itemCode} ${qty(line.shortage)}`)
  const parts = [now.length > 0 ? `Allocated ${now.join(', ')}.` : 'Nothing more to allocate.']
  if (short.length > 0) parts.push(`Short: ${short.join(', ')}.`)
  return parts.join(' ')
}

/** Where the stock is: "LOT L-1 · SHELF-2", "SHELF-2", or "no place". */
export function allocationPlace(allocation: StockAllocationDto): string {
  const parts = [allocation.lotNo ? `LOT ${allocation.lotNo}` : null, allocation.location].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'no place'
}

export function hasOpen(allocations: StockAllocationDto[]): boolean {
  return allocations.some((allocation) => allocation.status === 'open')
}

/** Allocating asks the order's BOM, so only approved or running orders with a BOM can use the button. */
export function canAllocateFromBom(order: { workOrderStatus: string; bomId: string | null }): boolean {
  return Boolean(order.bomId) && (order.workOrderStatus === 'approved' || order.workOrderStatus === 'in_progress')
}
