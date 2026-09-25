import { describe, expect, it } from 'vitest'
import type { StockAlertDto } from '../../../shared/types/api'
import { describeAlert, orderAlerts, suggestedOrder } from './stockAlertModel'

function alert(id: string, patch: Partial<StockAlertDto> = {}): StockAlertDto {
  return {
    stockAlertId: id,
    projectId: 'p',
    inventoryId: `inv-${id}`,
    itemId: 'flour',
    itemCode: 'FLOUR',
    itemName: 'Flour',
    location: 'WH-A',
    lotNo: null,
    alertType: 'low',
    severity: 'warning',
    thresholdValue: 10,
    actualValue: 3,
    unit: 'kg',
    message: null,
    resolved: false,
    triggeredAt: '2026-09-24T10:00:00Z',
    resolvedAt: null,
    ...patch,
  }
}

describe('stock alerts', () => {
  it('puts open alerts first, the most severe first, keeping the server order otherwise', () => {
    const ordered = orderAlerts([
      alert('a', { resolved: true, severity: 'critical' }),
      alert('b', { severity: 'info', alertType: 'over' }),
      alert('c'),
      alert('d', { severity: 'critical' }),
      alert('e'),
    ])
    expect(ordered.map((a) => a.stockAlertId)).toEqual(['d', 'c', 'e', 'b', 'a'])
  })

  it('says what is wrong and where', () => {
    expect(describeAlert(alert('a'))).toBe('FLOUR · Flour at WH-A: 3 kg available, minimum 10 kg')
    expect(
      describeAlert(alert('b', { alertType: 'over', actualValue: 120, thresholdValue: 100, lotNo: 'L1', location: null })),
    ).toBe('FLOUR · Flour (LOT L1): 120 kg on hand, maximum 100 kg')
    const expiry = { alertType: 'expiry' as const, thresholdValue: 7, lotNo: 'L2', location: null }
    expect(describeAlert(alert('c', { ...expiry, actualValue: 3 }))).toBe('FLOUR · Flour (LOT L2): expires in 3 days')
    expect(describeAlert(alert('d', { ...expiry, actualValue: 0 }))).toBe('FLOUR · Flour (LOT L2): expires today')
    expect(describeAlert(alert('e', { ...expiry, actualValue: -1 }))).toBe(
      'FLOUR · Flour (LOT L2): expired 1 day ago; scrap it, it cannot go into production',
    )
  })
})

describe('suggestedOrder', () => {
  it('adds what is used during the lead time to the shortfall', () => {
    expect(suggestedOrder({ shortageQuantity: 5, leadTimeDays: 10 }, 2)).toBe(25)
  })

  it('is the shortfall without a daily use or a lead time', () => {
    expect(suggestedOrder({ shortageQuantity: 5, leadTimeDays: null }, 2)).toBe(5)
    expect(suggestedOrder({ shortageQuantity: 5, leadTimeDays: 10 }, 0)).toBe(5)
    expect(suggestedOrder({ shortageQuantity: 5, leadTimeDays: 10 }, undefined)).toBe(5)
  })
})
