import { describe, expect, it } from 'vitest'
import { crewDelayNote, crewNote, crewText, sharesValid } from './crewModel'

describe('crew', () => {
  it('reads the crew with their time in the window', () => {
    expect(crewText([])).toBe('No crew named')
    expect(crewText([
      { userId: 'kim', calendarSet: true, hoursInWindow: 16 },
      { userId: 'lee', calendarSet: false, hoursInWindow: 0 },
      { userId: 'park', calendarSet: true, hoursInWindow: 0 },
      { userId: 'choi', calendarSet: null, hoursInWindow: null },
    ])).toBe('kim 16 h, lee (no shifts), park (not working then), choi')
  })

  it('says each person\'s share when it is less than all', () => {
    expect(crewText([
      { userId: 'kim', sharePercent: 50, calendarSet: true, hoursInWindow: 16 },
      { userId: 'lee', sharePercent: 25, calendarSet: false, hoursInWindow: 0 },
      { userId: 'park', sharePercent: 100, calendarSet: true, hoursInWindow: 8 },
    ])).toBe('kim 50% of 16 h, lee 25% (no shifts), park 8 h')
    expect(sharesValid([{ sharePercent: 1 }, { sharePercent: 100 }])).toBe(true)
    expect(sharesValid([{ sharePercent: 0 }])).toBe(false)
    expect(sharesValid([{ sharePercent: 50.5 }])).toBe(false)
  })

  it('says who moved a suggestion later', () => {
    expect(crewDelayNote(undefined, undefined)).toBe('')
    expect(crewDelayNote([], [])).toBe('')
    expect(crewDelayNote(['lee'], [{ workOrderNumber: 'WO-0007', userIds: ['lee', 'kim'] }]))
      .toBe(' · waits for lee to be on shift · after WO-0007 (lee, kim)')
  })

  it('notes only the problems of a suggestion', () => {
    expect(crewNote(undefined)).toBe('')
    expect(crewNote([{ userId: 'kim', calendarSet: true, hours: 1 }])).toBe('')
    expect(crewNote([{ userId: 'kim', calendarSet: true, hours: 0 }, { userId: 'lee', calendarSet: false, hours: 0 }]))
      .toBe(' · kim does not work then, lee has no shifts')
  })
})
