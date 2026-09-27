import { describe, expect, it } from 'vitest'
import type { EquipmentChangeoverDto } from '../../../entities/catalog/api/useEquipmentChangeovers'
import { EMPTY_CHANGEOVER_FORM, changeoverPayload, changeoverSide, formatMinutes, parseMinutes } from './changeoverModel'

function rule(fromItemId: string | null, toItemId: string | null): EquipmentChangeoverDto {
  return {
    changeoverId: `${fromItemId}-${toItemId}`, equipmentId: 'e', fromItemId, fromItemCode: fromItemId?.toUpperCase() ?? null,
    fromItemName: null, toItemId, toItemCode: toItemId?.toUpperCase() ?? null, toItemName: null, minutes: 30, note: null,
  }
}

describe('changeover labels', () => {
  it('writes minutes as hours and minutes, and an open side as any item', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(120)).toBe('2 h')
    expect(formatMinutes(90)).toBe('1 h 30 min')
    expect(changeoverSide(null, null)).toBe('Any item')
    expect(changeoverSide('RED', 'Red paint')).toBe('RED · Red paint')
    expect(changeoverSide('RED', null)).toBe('RED')
  })
})

describe('changeoverPayload', () => {
  it('takes whole minutes up to a week and refuses a pair that is already set', () => {
    expect(parseMinutes(' 90 ')).toBe(90)
    expect(parseMinutes('0')).toBeNull()
    expect(parseMinutes('1.5')).toBeNull()
    expect(parseMinutes('10081')).toBeNull()
    expect(changeoverPayload({ ...EMPTY_CHANGEOVER_FORM, fromItemId: 'red', minutes: '90', note: ' clean ' }, [rule(null, null)]))
      .toEqual({ input: { fromItemId: 'red', toItemId: null, minutes: 90, note: 'clean' }, error: null })
    expect(changeoverPayload({ ...EMPTY_CHANGEOVER_FORM, minutes: '' }, []).error).toBe('Minutes must be a whole number from 1 to 10080.')
    expect(changeoverPayload({ ...EMPTY_CHANGEOVER_FORM, minutes: '10' }, [rule(null, null)]).error)
      .toBe('This pair already has a changeover; change its time instead.')
    expect(changeoverPayload({ fromItemId: 'red', toItemId: 'white', minutes: '10', note: '' }, [rule('red', 'white')]).error)
      .toBe('This pair already has a changeover; change its time instead.')
  })
})
