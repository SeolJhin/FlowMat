import type { WorkOrderCrewDto } from '../../../entities/production/api/useWorkOrderCrew'

function hours(value: number): string {
  return `${Number(value.toFixed(2))} h`
}

/**
 * The crew in a line (docs/domain/worker-calendar.md WC15, WC40): "kim 16 h, lee 50% of 16 h, park (not working then)", or
 * each id alone without a planned window; "No crew named" when there is none.
 */
export function crewText(members: WorkOrderCrewDto['members']): string {
  if (members.length === 0) return 'No crew named'
  return members.map((member) => {
    const share = member.sharePercent ?? 100
    const name = share < 100 ? `${member.userId} ${share}%` : member.userId
    if (member.calendarSet === false) return `${name} (no shifts)`
    if (member.hoursInWindow == null) return name
    if (member.hoursInWindow <= 0) return `${name} (not working then)`
    return `${name}${share < 100 ? ' of' : ''} ${hours(member.hoursInWindow)}`
  }).join(', ')
}

/** Whether every share is a whole number from 1 to 100 (WC36). */
export function sharesValid(members: { sharePercent: number }[]): boolean {
  return members.every((member) => Number.isInteger(member.sharePercent) && member.sharePercent >= 1 && member.sharePercent <= 100)
}

/**
 * Why a suggestion starts later for its crew (docs/domain/worker-calendar.md WC26), e.g. " · waits for lee to be on shift ·
 * after WO-0007 (lee)"; empty when the crew did not move it.
 */
export function crewDelayNote(waitedFor: string[] | undefined,
  movedPast: { workOrderNumber: string; userIds: string[] }[] | undefined): string {
  const parts: string[] = []
  if (waitedFor && waitedFor.length > 0) parts.push(`waits for ${waitedFor.join(', ')} to be on shift`)
  if (movedPast && movedPast.length > 0) {
    parts.push(`after ${movedPast.map((booking) => `${booking.workOrderNumber} (${booking.userIds.join(', ')})`).join(', ')}`)
  }
  return parts.length > 0 ? ` · ${parts.join(' · ')}` : ''
}

/** Only the crew's problems in a suggested window, e.g. " · kim does not work then, lee has no shifts" (WC14). */
export function crewNote(crew: { userId: string; calendarSet: boolean; hours: number }[] | undefined): string {
  const problems = (crew ?? []).flatMap((member) => {
    if (!member.calendarSet) return [`${member.userId} has no shifts`]
    if (member.hours <= 0) return [`${member.userId} does not work then`]
    return []
  })
  return problems.length > 0 ? ` · ${problems.join(', ')}` : ''
}
