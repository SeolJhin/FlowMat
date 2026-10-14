import { useState } from 'react'
import {
  useSetWorkOrderCrewMutation, useWorkOrderCrewQuery, type WorkOrderCrewInput,
} from '../../../entities/production/api/useWorkOrderCrew'
import { useWorkerCalendarsQuery } from '../../../entities/workforce/api/useWorkerCalendars'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { WorkOrderDto } from '../../../shared/types/api'
import { weeklyText } from '../../project-settings/model/workerCalendarModel'
import { crewText, sharesValid } from '../model/crewModel'

/**
 * The people a work order needs and their time in its planned window (docs/domain/worker-calendar.md WC15). Changed until the
 * order is completed or cancelled; readiness then checks that they work in the window.
 */
export function WorkOrderCrewPicker({ order, projectId }: { order: WorkOrderDto; projectId: string }) {
  const crew = useWorkOrderCrewQuery(order.workOrderId)
  const workers = useWorkerCalendarsQuery(projectId)
  const save = useSetWorkOrderCrewMutation(order.workOrderId)
  // Null until something is changed: the boxes show the saved crew and shares.
  const [picked, setPicked] = useState<WorkOrderCrewInput | null>(null)
  const members = Array.isArray(crew.data?.members) ? crew.data.members : []
  const saved: WorkOrderCrewInput = members.map((member) => ({ userId: member.userId, sharePercent: member.sharePercent ?? 100 }))
  const chosen = picked ?? saved
  const people = Array.isArray(workers.data) ? workers.data : []
  const closed = order.workOrderStatus === 'completed' || order.workOrderStatus === 'cancelled'
  const changed = picked !== null && (picked.length !== saved.length
    || picked.some((one, index) => one.userId !== saved[index]?.userId || one.sharePercent !== saved[index]?.sharePercent))
  const valid = sharesValid(chosen)

  function toggle(userId: string, on: boolean) {
    setPicked((current) => {
      const base = current ?? saved
      return on ? [...base, { userId, sharePercent: 100 }] : base.filter((one) => one.userId !== userId)
    })
  }

  function setShare(userId: string, sharePercent: number) {
    setPicked((current) => (current ?? saved).map((one) => (one.userId === userId ? { ...one, sharePercent } : one)))
  }

  return (
    <div role="group" aria-label="Crew" style={{ fontSize: 12, marginBottom: 8 }}>
      <strong>Crew</strong>{' '}
      <span>{crewText(members)}</span>
      {crew.isError && <p role="alert">{errorMessage(crew.error, 'Failed to load the crew.')}</p>}
      {!closed && (
        <details style={{ marginTop: 4 }}>
          <summary>Choose crew</summary>
          {people.map((person) => {
            const mine = chosen.find((one) => one.userId === person.userId)
            return (
              <div key={person.userId} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <label>
                  <input type="checkbox" checked={Boolean(mine)}
                    onChange={(event) => toggle(person.userId, event.target.checked)} />{' '}
                  {person.userId} · {weeklyText(person)}
                </label>
                {mine && (
                  <label>
                    <input aria-label={`${person.userId} share`} type="number" min={1} max={100} step={1} style={{ width: 56 }}
                      value={Number.isNaN(mine.sharePercent) ? '' : mine.sharePercent}
                      onChange={(event) => setShare(person.userId, event.target.valueAsNumber)} /> %
                  </label>
                )}
              </div>
            )
          })}
          {!valid && <p role="alert">Each share must be a whole number from 1 to 100.</p>}
          <button type="button" disabled={!changed || !valid || save.isPending}
            onClick={() => {
              const submitted = chosen
              save.mutate(submitted, { onSuccess: () => setPicked(current => current === submitted ? null : current) })
            }}>
            {save.isPending ? 'Saving...' : 'Save crew'}
          </button>
        </details>
      )}
      {save.isError && <p role="alert">{errorMessage(save.error, 'Failed to save the crew.')}</p>}
    </div>
  )
}
