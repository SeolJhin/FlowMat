import { describe, expect, it } from 'vitest'
import type { EquipmentLoadOrderDto, EquipmentLoadRowDto } from '../../../entities/production/api/useEquipmentLoad'
import {
  dateInputValue,
  loadLabel,
  loadTone,
  orderLine,
  parseDateInput,
  shiftWeeks,
  weekRange,
  weekStart,
} from './equipmentLoadModel'

function row(patch: Partial<EquipmentLoadRowDto>): EquipmentLoadRowDto {
  return {
    equipmentId: 'e', equipmentCode: 'LINE', equipmentName: 'Line', equipmentStatus: 'active', capacityPerHour: 10,
    calendarSet: true, availableHours: 40, downtimeHours: 0, plannedHours: 10, draftHours: 0, loadPercent: 25, overloaded: false,
    unplannedOrders: 0, unmeasuredOrders: 0, orders: [], ...patch,
  }
}

function order(patch: Partial<EquipmentLoadOrderDto>): EquipmentLoadOrderDto {
  return {
    workOrderId: 'w', workOrderNumber: 'WO-1', workOrderTitle: 'Red', workOrderStatus: 'approved', targetItemId: 'i',
    targetItemCode: 'RED', plannedStartAt: '2030-01-07T00:00:00Z', plannedEndAt: '2030-01-08T00:00:00Z', remainingQuantity: 100,
    changeoverMinutes: null, neededHours: 10, hoursInWindow: 10, ...patch,
  }
}

describe('weeks', () => {
  it('starts on Monday at local midnight and moves by whole weeks', () => {
    const wednesday = new Date(2030, 0, 9, 15, 30)
    const monday = weekStart(wednesday)
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate(), monday.getHours()]).toEqual([2030, 0, 7, 0])
    expect(weekStart(new Date(2030, 0, 13)).getDate()).toBe(7)
    expect(weekStart(new Date(2030, 0, 14)).getDate()).toBe(14)
    expect(dateInputValue(shiftWeeks(monday, -1))).toBe('2029-12-31')
    const range = weekRange(monday)
    expect(new Date(range.to).getTime() - new Date(range.from).getTime()).toBe(7 * 24 * 3600 * 1000)
    expect(dateInputValue(parseDateInput('2030-01-09')!)).toBe('2030-01-09')
    expect(parseDateInput('next week')).toBeNull()
  })
})

describe('load display', () => {
  it('tells an overloaded, busy, normal and idle equipment apart', () => {
    expect(loadTone(row({ overloaded: true, loadPercent: 113.8 }))).toBe('over')
    expect(loadTone(row({ loadPercent: 90 }))).toBe('high')
    expect(loadTone(row({}))).toBe('ok')
    expect(loadTone(row({ plannedHours: 0, loadPercent: 0 }))).toBe('idle')
    expect(loadLabel(row({ loadPercent: 63.8 }))).toBe('63.8%')
    expect(loadLabel(row({ loadPercent: null }))).toBe('—')
  })

  it('writes each order with its hours in the window', () => {
    expect(orderLine(order({}))).toBe('WO-1 · RED · 10 h')
    expect(orderLine(order({ workOrderStatus: 'draft', targetItemCode: null, neededHours: 5, hoursInWindow: 5 }))).toBe('WO-1 · draft · 5 h')
    expect(orderLine(order({ neededHours: 31, hoursInWindow: 15.5, changeoverMinutes: 60 })))
      .toBe('WO-1 · RED · 15.5 of 31 h · incl. 60 min changeover')
    expect(orderLine(order({ neededHours: null, hoursInWindow: null }))).toBe('WO-1 · RED · hours unknown')
  })
})
