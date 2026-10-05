import { describe, expect, it } from 'vitest'
import type { BomDto, ItemDto, MaterialRequirementDto, ReorderLineDto } from '../../../shared/types/api'
import type { StockAlertDto } from '../../../shared/types/api'
import {
  alertsWithin, describeAlert, fromPacks, leftAfterOrders, needsCsv, orderAlerts, orderQuantity, orderValue, packsFor, reorderCsv,
  subAssemblyDrafts, suggestedOrder,
} from './stockAlertModel'

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

describe('orderValue', () => {
  it('prices the order at the unit cost, or not at all without one', () => {
    expect(orderValue(25, 1.2)).toBe(30)
    expect(orderValue(25, 0)).toBeNull()
    expect(orderValue(25, null)).toBeNull()
  })
})

describe('reorderCsv', () => {
  it('writes the purchase list with the order value', () => {
    const line = {
      itemId: 'f', itemCode: 'FLR', itemName: 'Flour, fine', unit: 'kg', safetyStockQty: 50, availableQuantity: 20,
      shortageQuantity: 30, leadTimeDays: 7,
    } as ReorderLineDto
    expect(
      reorderCsv([
        { line, dailyUse: 2, suggested: 44, unitCost: 1.5, purchaseUnit: 'bag', purchaseUnitQty: 25 },
        { line: { ...line, itemCode: 'SLT' }, dailyUse: null, suggested: 30, unitCost: null },
      ]),
    ).toBe(
      '\ufeffitem_code,item_name,unit,usable,safety_stock,short,lead_time_days,daily_use,suggested_order,purchase_unit,packs,order_quantity,unit_cost,order_value\r\n'
        + 'FLR,"Flour, fine",kg,20,50,30,7,2,44,bag,2,50,1.5,75\r\n'
        + 'SLT,"Flour, fine",kg,20,50,30,7,,30,,,30,,\r\n',
    )
  })
})

describe('packsFor', () => {
  it('rounds up to whole purchase units, exactly on a boundary', () => {
    expect(packsFor(44, 25)).toBe(2)
    expect(packsFor(50, 25)).toBe(2)
    expect(packsFor(0.3 * 3, 0.3)).toBe(3)
    expect(packsFor(0, 25)).toBe(0)
    expect(packsFor(44, null)).toBeNull()
    expect(orderQuantity({ suggested: 44, purchaseUnitQty: 25 })).toBe(50)
    expect(orderQuantity({ suggested: 44, purchaseUnitQty: null })).toBe(44)
  })
})

describe('fromPacks', () => {
  it('turns purchase units into stock units', () => {
    expect(fromPacks(2, 25)).toBe(50)
    expect(fromPacks(1.5, 0.3)).toBe(0.45)
    expect(fromPacks(2, null)).toBeNull()
    expect(fromPacks(-1, 25)).toBeNull()
  })
})

describe('needsCsv', () => {
  const lines: MaterialRequirementDto['lines'] = [
    {
      itemId: 'flour', itemCode: 'FL', itemName: 'Flour, fine', unit: 'kg', required: 40, usable: 12, shortage: 28,
      orders: [{ workOrderId: 'w1', workOrderTitle: 'Bread', required: 30 }, { workOrderId: 'w2', workOrderTitle: 'Buns', required: 10 }],
    },
    { itemId: 'salt', itemCode: 'SA', itemName: 'Salt', unit: 'kg', required: 1, usable: 5, shortage: 0, orders: [] },
    {
      itemId: 'dough', itemCode: 'DO', itemName: 'Dough', unit: 'kg', required: 8, usable: 2, shortage: 1, plannedSupply: 5, madeHere: true,
      orders: [{ workOrderId: null, workOrderTitle: null, required: 8, viaItemId: 'loaf', viaItemCode: 'LOAF' }],
    },
  ]
  const items = new Map<string, ItemDto>([
    ['flour', { itemId: 'flour', purchaseUnit: 'bag', purchaseUnitQty: 25, itemStatus: 'active' } as ItemDto],
    ['salt', { itemId: 'salt', purchaseUnit: 'box', purchaseUnitQty: 1, itemStatus: 'discontinued', safetyStockQty: 6 } as ItemDto],
  ])

  it('lists every material with the shortage in purchase units and the orders that need it', () => {
    const rows = needsCsv(lines, items).replace('\ufeff', '').trim().split('\r\n')
    expect(rows[0]).toBe(
      'item_code,item_name,unit,needed,usable,short,purchase_unit,packs,item_status,work_orders,being_made,made_here,left_after,safety_stock,under_safety',
    )
    expect(rows[1]).toBe('FL,"Flour, fine",kg,40,12,28,bag,2,active,Bread 30; Buns 10,0,no,0,,0')
    // Covered: no packs to buy, but the 4 left are 2 under the safety stock of 6.
    expect(rows[2]).toBe('SA,Salt,kg,1,5,0,,,discontinued,,0,no,4,6,2')
    // A sub-assembly: its need comes from making a short item above it, and open orders already make 5.
    expect(rows[3]).toBe('DO,Dough,kg,8,2,1,,,,via LOAF 8,5,yes,0,,0')
  })
})

describe('alertsWithin', () => {
  it('keeps the alerts of records at the chosen places, ignoring case', () => {
    const bin = alert('a', { location: 'bin-1' })
    const shelf = alert('b', { location: 'SHELF' })
    const nowhere = alert('c', { location: null })
    expect(alertsWithin([bin, shelf, nowhere], new Set(['wh-a', 'bin-1']))).toEqual([bin])
    expect(alertsWithin([bin, shelf, nowhere], null)).toHaveLength(3)
  })
})

describe('leftAfterOrders', () => {
  it('leaves usable stock and what is being made after the open orders, against the safety stock', () => {
    expect(leftAfterOrders({ required: 6, usable: 10 }, 8)).toEqual({ left: 4, underSafety: 4 })
    expect(leftAfterOrders({ required: 6, usable: 10, plannedSupply: 5 }, 8)).toEqual({ left: 9, underSafety: 0 })
    // Short: nothing left, so the whole safety stock is missing on top of the shortage.
    expect(leftAfterOrders({ required: 12, usable: 10 }, 8)).toEqual({ left: 0, underSafety: 8 })
    expect(leftAfterOrders({ required: 0.3, usable: 0.5 }, 0.4)).toEqual({ left: 0.2, underSafety: 0.2 })
    expect(leftAfterOrders({ required: 6, usable: 10 }, null)).toEqual({ left: 4, underSafety: 0 })
    expect(leftAfterOrders({ required: 6, usable: 10 }, 0)).toEqual({ left: 4, underSafety: 0 })
  })
})

describe('subAssemblyDrafts', () => {
  const line = (itemId: string, shortage: number, madeHere: boolean) => ({ itemId, itemCode: itemId.toUpperCase(), shortage, madeHere })
  const bom = (bomId: string, targetItemId: string, bomStatus: BomDto['bomStatus']) => ({ bomId, targetItemId, bomStatus })

  it('drafts every short made-here material with its approved BOM, all levels at once', () => {
    const items = new Map<string, ItemDto>([['old', { itemId: 'old', itemStatus: 'discontinued' } as ItemDto]])
    const { drafts, skipped } = subAssemblyDrafts(
      [line('sponge', 20, true), line('cream', 4, true), line('flour', 3, false), line('jam', 0, true), line('glaze', 2, true),
        line('icing', 1, true), line('old', 5, true)],
      [bom('b1', 'sponge', 'approved'), bom('b2', 'cream', 'approved'), bom('b3', 'glaze', 'draft'), bom('b4', 'icing', 'approved'),
        bom('b5', 'old', 'approved')],
      [{ workOrderNumber: 'WO-0007', workOrderStatus: 'draft', targetItemId: 'icing' },
        { workOrderNumber: 'WO-0003', workOrderStatus: 'approved', targetItemId: 'cream' }],
      items,
    )
    expect(drafts).toEqual([
      { itemId: 'sponge', itemCode: 'SPONGE', quantity: 20, bomId: 'b1' },
      // An approved order is already counted in the needs; only a draft stops another.
      { itemId: 'cream', itemCode: 'CREAM', quantity: 4, bomId: 'b2' },
    ])
    expect(skipped).toEqual(['GLAZE has no approved BOM', 'ICING already has draft WO-0007', 'OLD is discontinued'])
  })
})
