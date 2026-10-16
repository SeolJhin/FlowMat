import { describe, expect, it } from 'vitest'
import { dayOffText, daysText, rotaProblem, rotaShiftText, rotaText, shiftText, weeklyText, workerDayText } from './workerCalendarModel'

describe('rota', () => {
  const rota = { weeks: 2, startsOn: '2041-09-02', currentWeek: 1 }

  it('reads the rota, its weeks and the average week (WC47)', () => {
    expect(rotaText(rota)).toBe('2-week rota from 2041-09-02 · week 1 now')
    expect(rotaShiftText({ shiftStart: '22:00', shiftEnd: '06:00', workDays: [1, 2, 3, 4], rotaWeek: 2 }, rota))
      .toBe('Week 2: Mon–Thu 22:00–06:00')
    expect(rotaShiftText({ shiftStart: '09:00', shiftEnd: '17:00', workDays: [1, 2, 3, 4, 5] }, null)).toBe('Mon–Fri 09:00–17:00')
    expect(weeklyText({ calendarSet: true, weeklyHours: 40, rota })).toBe('40 h a week on average')
  })

  it('checks the start week and each shift\'s week before sending (WC48)', () => {
    expect(rotaProblem(1, '', [1, 3])).toBeNull()
    expect(rotaProblem(2, '', [1, 2])).toBe('Choose the week the rota starts.')
    expect(rotaProblem(2, '2041-09-02', [1, 3])).toBe('Shift 2 is in week 3, but the rota has 2 weeks.')
    expect(rotaProblem(3, '2041-09-02', [1, 3])).toBeNull()
  })
})

describe('a date\'s own shifts', () => {
  it('reads as off or as its shifts and hours', () => {
    expect(workerDayText({ date: '2041-06-05', shifts: [], off: true, hours: 0, reason: 'Stocktaking' }))
      .toBe('Wed 2041-06-05 · Off · Stocktaking')
    expect(workerDayText({ date: '2041-06-04', off: false, hours: 12, reason: null, shifts: [
      { shiftStart: '06:00', shiftEnd: '14:00', hours: 8 }, { shiftStart: '14:00', shiftEnd: '18:00', hours: 4 }] }))
      .toBe('Tue 2041-06-04 · 06:00–14:00, 14:00–18:00 · 12 h')
    expect(workerDayText({ date: '2041-06-07', off: false, hours: 8, reason: null, shifts: [
      { shiftStart: '22:00', shiftEnd: '06:00', hours: 8 }] }))
      .toBe('Fri 2041-06-07 · 22:00–06:00 (ends next day) · 8 h')
  })
})

describe('worker calendar text', () => {
  it('writes days as runs or lists', () => {
    expect(daysText([1, 2, 3, 4, 5])).toBe('Mon–Fri')
    expect(daysText([5, 1, 3])).toBe('Mon, Wed, Fri')
    expect(daysText([6, 7])).toBe('Sat, Sun')
    expect(daysText([1, 2, 3, 6, 7])).toBe('Mon–Wed, Sat, Sun')
    expect(daysText([])).toBe('')
  })

  it('writes a shift, the week and days off', () => {
    expect(shiftText({ shiftStart: '22:00', shiftEnd: '06:00', workDays: [5] })).toBe('Fri 22:00–06:00')
    expect(weeklyText({ calendarSet: true, weeklyHours: 47.5 })).toBe('47.5 h a week')
    expect(weeklyText({ calendarSet: false, weeklyHours: 0 })).toBe('No shifts set')
    expect(dayOffText({ firstDay: '2041-03-06', lastDay: '2041-03-06', reason: 'Training' })).toBe('2041-03-06 · Training')
    expect(dayOffText({ firstDay: '2041-03-06', lastDay: '2041-03-08', reason: null })).toBe('2041-03-06 – 2041-03-08')
  })
})
