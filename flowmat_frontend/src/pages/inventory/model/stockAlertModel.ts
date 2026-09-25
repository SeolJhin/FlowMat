import type { ReorderLineDto, StockAlertDto } from '../../../shared/types/api'

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
