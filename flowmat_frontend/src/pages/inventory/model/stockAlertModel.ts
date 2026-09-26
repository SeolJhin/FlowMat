import type { ItemDto, MaterialRequirementDto, ReorderLineDto, StockAlertDto } from '../../../shared/types/api'
import { csvCell } from './ledgerModel'

const SEVERITY_ORDER: Record<StockAlertDto['severity'], number> = { critical: 0, warning: 1, info: 2 }

/** Open before closed, then the most severe first; newest first within each (the server's order). */
export function orderAlerts(alerts: StockAlertDto[]): StockAlertDto[] {
  return alerts
    .map((alert, index) => ({ alert, index }))
    .sort(
      (a, b) =>
        Number(a.alert.resolved) - Number(b.alert.resolved) ||
        (SEVERITY_ORDER[a.alert.severity] ?? 9) - (SEVERITY_ORDER[b.alert.severity] ?? 9) ||
        a.index - b.index,
    )
    .map(({ alert }) => alert)
}

/** "FLOUR · Flour at WH-A (LOT L1): 3 kg available, minimum 10 kg" */
export function describeAlert(alert: StockAlertDto, format: (value: number) => string = String): string {
  const item = [alert.itemCode ?? alert.itemId, alert.itemName].filter(Boolean).join(' · ')
  const place = [alert.location ? ` at ${alert.location}` : '', alert.lotNo ? ` (LOT ${alert.lotNo})` : ''].join('')
  const unit = alert.unit ? ` ${alert.unit}` : ''
  const numbers =
    alert.alertType === 'expiry'
      ? expiryText(alert.actualValue)
      : alert.alertType === 'low'
        ? `${format(alert.actualValue)}${unit} available, minimum ${format(alert.thresholdValue)}${unit}`
        : `${format(alert.actualValue)}${unit} on hand, maximum ${format(alert.thresholdValue)}${unit}`
  return `${item}${place}: ${numbers}`
}

/** From the days left until the LOT's expiry date. */
function expiryText(daysLeft: number): string {
  if (daysLeft < 0) return `expired ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago; scrap it, it cannot go into production`
  if (daysLeft === 0) return 'expires today'
  return `expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
}

/**
 * How much to order to get back to safety stock once the order arrives: the shortfall now plus what will be used
 * while waiting for it (daily use × lead time). Without a known daily use or lead time it is just the shortfall.
 */
export function suggestedOrder(
  line: Pick<ReorderLineDto, 'shortageQuantity' | 'leadTimeDays'>,
  dailyUse: number | null | undefined,
): number {
  const duringLeadTime = dailyUse && line.leadTimeDays ? dailyUse * line.leadTimeDays : 0
  return Math.max(0, line.shortageQuantity + duringLeadTime)
}

/** What an order costs at the item's unit cost; null when the cost is not known (none, or 0). */
export function orderValue(quantity: number, unitCost: number | null | undefined): number | null {
  return unitCost ? Math.round(quantity * unitCost * 10000) / 10000 : null
}

/**
 * Whole purchase units that hold at least {@code quantity} stock units (docs/domain/item-details.md "구매 단위"); null
 * when the item is bought in its stock unit.
 */
export function packsFor(quantity: number, purchaseUnitQty: number | null | undefined): number | null {
  if (!purchaseUnitQty || purchaseUnitQty <= 0) return null
  // A hair of tolerance so 50 / 25 stays 2 despite floating point.
  return Math.max(0, Math.ceil(quantity / purchaseUnitQty - 1e-9))
}

/** Stock units in a number of purchase units, e.g. 2 bags of 25 kg are 50 kg; null when either is missing. */
export function fromPacks(packs: number, purchaseUnitQty: number | null | undefined): number | null {
  if (!purchaseUnitQty || purchaseUnitQty <= 0 || !Number.isFinite(packs) || packs < 0) return null
  return Math.round(packs * purchaseUnitQty * 10000) / 10000
}

/** One reorder line with what the list shows next to it. */
export interface ReorderRow {
  line: ReorderLineDto
  dailyUse: number | null
  suggested: number
  unitCost: number | null
  purchaseUnit?: string | null
  purchaseUnitQty?: number | null
}

/** What would actually be ordered: whole purchase units when the item has one, otherwise the suggestion. */
export function orderQuantity(row: Pick<ReorderRow, 'suggested' | 'purchaseUnitQty'>): number {
  const packs = packsFor(row.suggested, row.purchaseUnitQty)
  return packs === null ? row.suggested : Math.round(packs * (row.purchaseUnitQty as number) * 10000) / 10000
}

/** The reorder list as a purchase list (CSV with a byte order mark, like the other stock exports). */
export function reorderCsv(rows: ReorderRow[]): string {
  const header = [
    'item_code', 'item_name', 'unit', 'usable', 'safety_stock', 'short', 'lead_time_days', 'daily_use', 'suggested_order',
    'purchase_unit', 'packs', 'order_quantity', 'unit_cost', 'order_value',
  ]
  const lines = rows.map((row) =>
    [
      row.line.itemCode, row.line.itemName, row.line.unit, row.line.availableQuantity, row.line.safetyStockQty, row.line.shortageQuantity,
      row.line.leadTimeDays, row.dailyUse, row.suggested, row.purchaseUnit ?? null, packsFor(row.suggested, row.purchaseUnitQty),
      orderQuantity(row), row.unitCost || null, orderValue(orderQuantity(row), row.unitCost),
    ]
      .map(csvCell)
      .join(','),
  )
  return '\ufeff' + [header.join(','), ...lines].join('\r\n') + '\r\n'
}

/**
 * What open work orders need, as a purchase list (docs/domain/material-requirements.md): every material, the biggest
 * shortfall first as the server sends them, with the shortage rounded up to the purchase unit and the item's status,
 * since an item that is not active is not reordered.
 */
export function needsCsv(lines: MaterialRequirementDto['lines'], items: Map<string, ItemDto>): string {
  const header = ['item_code', 'item_name', 'unit', 'needed', 'usable', 'short', 'purchase_unit', 'packs', 'item_status', 'work_orders']
  const rows = lines.map((line) => {
    const item = items.get(line.itemId)
    const packs = line.shortage > 0 && item?.purchaseUnit ? packsFor(line.shortage, item.purchaseUnitQty) : null
    return [
      line.itemCode, line.itemName, line.unit, line.required, line.usable, line.shortage, packs == null ? null : item?.purchaseUnit ?? null,
      packs, item?.itemStatus ?? null, line.orders.map((order) => `${order.workOrderTitle} ${order.required}`).join('; '),
    ]
      .map(csvCell)
      .join(',')
  })
  return '\ufeff' + [header.join(','), ...rows].join('\r\n') + '\r\n'
}
