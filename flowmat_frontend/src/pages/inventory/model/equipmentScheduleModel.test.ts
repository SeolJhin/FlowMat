import { describe, expect, it } from 'vitest'
import type { EquipmentDowntimeDto, EquipmentScheduleDto } from '../../../entities/catalog/api/useEquipment'
import type { EquipmentDto } from '../../../shared/types/api'
import {
  DEFAULT_CALENDAR_FORM,
  availabilitySummary,
  calendarForm,
  calendarPayload,
  dayList,
  downtimePayload,
  equipmentChoices,
  equipmentLabel,
  nextWeek,
  shiftSummary,
  splitDowntimes,
  toggleDay,
} from './equipmentScheduleModel'

function calendar(shiftStart: string, shiftEnd: string, workDays: number[], shiftHours: number): EquipmentScheduleDto['calendar'] {
  return { shiftStart, shiftEnd, workDays, shiftHours, updatedBy: 'u', updatedAt: null }
}

function downtime(downtimeId: string, startsAt: string, endsAt: string): EquipmentDowntimeDto {
  return { downtimeId, downtimeType: 'maintenance', startsAt, endsAt, hours: 1, reason: null, createdBy: 'u', createdAt: null }
}

function equipment(equipmentId: string, equipmentStatus: string, equipmentCode: string | null = equipmentId.toUpperCase()): EquipmentDto {
  return {
    equipmentId, projectId: 'p', equipmentCode, equipmentName: `${equipmentId} name`, equipmentType: 'machine', equipmentStatus,
    details: { manufacturer: null, modelName: null, serialNo: null, capacityPerHour: null, powerKwh: null, waterLiter: null, location: null },
  }
}

describe('dayList and shiftSummary', () => {
  it('names runs of three or more days as a range', () => {
    expect(dayList([5, 1, 2, 3, 4])).toBe('Mon–Fri')
    expect(dayList([1, 3, 5])).toBe('Mon, Wed, Fri')
    expect(dayList([1, 2, 6, 7])).toBe('Mon, Tue, Sat, Sun')
    expect(dayList([1, 2, 3, 6])).toBe('Mon–Wed, Sat')
    expect(dayList([1, 2, 3, 4, 5, 6, 7])).toBe('Every day')
  })

  it('says when a shift runs past midnight or all day', () => {
    expect(shiftSummary(null)).toBe('No calendar: available around the clock.')
    expect(shiftSummary(calendar('09:00', '17:00', [1, 2, 3, 4, 5], 8))).toBe('09:00–17:00 · Mon–Fri · 8 h a shift')
    expect(shiftSummary(calendar('22:00', '06:00', [1], 8))).toBe('22:00–06:00 (ends next day) · Mon · 8 h a shift')
    expect(shiftSummary(calendar('00:00', '00:00', [6, 7], 24))).toBe('All day · Sat, Sun · 24 h a shift')
  })
})

describe('calendar form', () => {
  it('starts from the saved calendar or a weekday shift, and checks what is sent', () => {
    const schedule = { equipmentId: 'e', timeZone: 'Asia/Seoul', calendar: calendar('08:30:00', '17:30', [1, 3], 9), downtimes: [] }
    expect(calendarForm(schedule)).toEqual({ shiftStart: '08:30', shiftEnd: '17:30', workDays: [1, 3] })
    expect(calendarForm(undefined)).toEqual(DEFAULT_CALENDAR_FORM)
    expect(toggleDay([1, 3], 2)).toEqual([1, 2, 3])
    expect(toggleDay([1, 2, 3], 2)).toEqual([1, 3])
    expect(calendarPayload({ shiftStart: '08:00', shiftEnd: '17:00', workDays: [3, 1, 3] }))
      .toEqual({ input: { shiftStart: '08:00', shiftEnd: '17:00', workDays: [1, 3] }, error: null })
    expect(calendarPayload({ shiftStart: '', shiftEnd: '17:00', workDays: [1] }).error).toBe('Enter when the shift starts and ends.')
    expect(calendarPayload({ shiftStart: '08:00', shiftEnd: '17:00', workDays: [] }).error).toBe('Choose at least one work day.')
  })
})

describe('downtimePayload', () => {
  it('sends instants and refuses an end that is not after the start', () => {
    const payload = downtimePayload({ downtimeType: 'breakdown', startsAt: '2030-01-08T12:00', endsAt: '2030-01-08T20:00', reason: ' belt ' })
    expect(payload).toEqual({
      input: {
        downtimeType: 'breakdown',
        startsAt: new Date('2030-01-08T12:00').toISOString(),
        endsAt: new Date('2030-01-08T20:00').toISOString(),
        reason: 'belt',
      },
      error: null,
    })
    expect(downtimePayload({ downtimeType: 'other', startsAt: '2030-01-08T12:00', endsAt: '2030-01-08T12:00', reason: '' }).error)
      .toBe('The downtime must end after it starts.')
    expect(downtimePayload({ downtimeType: 'other', startsAt: '', endsAt: '2030-01-08T12:00', reason: '' }).error)
      .toBe('Enter when the downtime starts and ends.')
  })
})

describe('availability', () => {
  it('covers seven days from local midnight and sums up the hours', () => {
    const week = nextWeek(new Date(2030, 0, 7, 15, 30))
    expect(new Date(week.from).getHours()).toBe(0)
    expect(new Date(week.from).getDate()).toBe(7)
    expect(new Date(week.to).getDate()).toBe(14)
    expect(availabilitySummary({
      equipmentId: 'e', from: week.from, to: week.to, calendarSet: true, workingHours: 40, downtimeHours: 5, availableHours: 35,
      capacityPerHour: 10, capacity: 350,
    })).toBe('Next 7 days: 35 h available (5 h down) · can make 350.')
    expect(availabilitySummary({
      equipmentId: 'e', from: week.from, to: week.to, calendarSet: false, workingHours: 168, downtimeHours: 0, availableHours: 168,
      capacityPerHour: null, capacity: null,
    })).toBe('Next 7 days: 168 h available.')
  })

  it('splits downtime into what is still ahead and what is over', () => {
    const now = new Date('2030-01-08T00:00:00Z')
    const split = splitDowntimes([
      downtime('later', '2030-01-10T00:00:00Z', '2030-01-11T00:00:00Z'),
      downtime('now', '2030-01-07T00:00:00Z', '2030-01-09T00:00:00Z'),
      downtime('over', '2030-01-01T00:00:00Z', '2030-01-02T00:00:00Z'),
    ], now)
    expect(split.current.map((one) => one.downtimeId)).toEqual(['now', 'later'])
    expect(split.past.map((one) => one.downtimeId)).toEqual(['over'])
  })
})

describe('equipment for a work order', () => {
  it('leaves out inactive equipment unless the order is on it', () => {
    const list = [equipment('mix', 'active'), equipment('old', 'inactive'), equipment('oven', 'maintenance', null)]
    expect(equipmentChoices(list, null).map((one) => one.equipmentId)).toEqual(['mix', 'oven'])
    expect(equipmentChoices(list, 'old').map((one) => one.equipmentId)).toEqual(['mix', 'old', 'oven'])
    expect(equipmentLabel(list[0])).toBe('MIX · mix name')
    expect(equipmentLabel(list[2])).toBe('oven name (maintenance)')
  })
})
