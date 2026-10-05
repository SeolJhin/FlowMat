import { useState, type FormEvent } from 'react'
import { useCurrentUserQuery } from '../../../entities/auth/api/useCurrentUserQuery'
import { useProjectMembersQuery } from '../../../entities/project/api/useProjectMembersQuery'
import { useRescheduleWorkOrderMutation, useWorkOrderReschedulesQuery,
  type WorkOrderRescheduleInput } from '../../../entities/production/api/useWorkOrderReschedule'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { WorkOrderDto } from '../../../shared/types/api'
import { localDateInput, rescheduleDates } from '../model/workOrderReschedule'

const showDate = (iso: string | null) => iso ? new Date(iso).toLocaleString() : 'Not planned'

export function WorkOrderReschedule({ order, projectId }: { order: WorkOrderDto; projectId: string }) {
  const me = useCurrentUserQuery().data?.userId
  const members = useProjectMembersQuery(projectId)
  const owner = members.data?.some((member) => member.userId === me && member.projectRole === 'owner' && member.memberStatus === 'active') ?? false
  const history = useWorkOrderReschedulesQuery(order.workOrderId)
  const mutation = useRescheduleWorkOrderMutation(projectId, order.workOrderId)
  const [base, setBase] = useState(order)
  const [start, setStart] = useState(localDateInput(order.plannedStartAt))
  const [end, setEnd] = useState(localDateInput(order.plannedEndAt))
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState<WorkOrderRescheduleInput | null>(null)
  const editable = owner && (order.workOrderStatus === 'approved' || order.workOrderStatus === 'in_progress')
  const startFixed = order.workOrderStatus === 'in_progress' || Boolean(order.actualStartAt)
  const locked = mutation.isPending || Boolean(unconfirmed)

  function loadPlan(current: WorkOrderDto) {
    setBase(current); setStart(localDateInput(current.plannedStartAt)); setEnd(localDateInput(current.plannedEndAt))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    let input: WorkOrderRescheduleInput
    try {
      input = unconfirmed ?? { ...rescheduleDates(base, start, end), reason: reason.trim() }
      if (!input.reason) throw new Error('A reason is required.')
    } catch (error) { setMessage(errorMessage(error)); return }
    setMessage(null)
    try {
      const result = await mutation.mutateAsync(input)
      setUnconfirmed(null); loadPlan(result.workOrder); setReason(''); setMessage('Schedule changed.')
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'httpStatus' in error ? Number(error.httpStatus) : 0
      if (!status || status >= 500) setUnconfirmed(input)
      else setUnconfirmed(null)
      setMessage(errorMessage(error, 'Failed to change schedule.'))
    }
  }
  return (
    <section aria-label={`Schedule ${order.workOrderNumber}`} style={{ fontSize: 12, padding: 12 }}>
      <h4 style={{ marginTop: 0 }}>Schedule and changes</h4>
      {editable ? (
        <form onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 8, maxWidth: 540 }}>
          <label>New planned start <input type="datetime-local" step="1" value={start} disabled={locked || startFixed}
            onChange={(event) => setStart(event.target.value)} /></label>
          {startFixed && <span>Execution has started; the planned start is fixed.</span>}
          <label>New planned end <input type="datetime-local" step="1" value={end} disabled={locked}
            onChange={(event) => setEnd(event.target.value)} /></label>
          <label>Reason * <textarea value={reason} required maxLength={1000} disabled={locked}
            onChange={(event) => setReason(event.target.value)} /></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : unconfirmed ? 'Retry schedule change' : 'Change schedule'}</button>
            <button type="button" disabled={locked} onClick={() => { loadPlan(order); setMessage(null); mutation.reset() }}>Reload current plan</button>
          </div>
        </form>
      ) : <p>Only the project owner can change an approved or running order's schedule.</p>}
      {members.isError && <p role="alert">{errorMessage(members.error, 'Failed to check your project role.')}</p>}
      {message && <p role={mutation.isError ? 'alert' : 'status'}>{message}</p>}
      {unconfirmed && <p role="alert">The result is unconfirmed. Retry the same schedule change before editing the plan.</p>}
      {history.isLoading && <p>Loading schedule history...</p>}
      {history.isError && <p role="alert">{errorMessage(history.error, 'Failed to load schedule history.')}</p>}
      {history.data?.length === 0 && <p>No schedule changes recorded.</p>}
      <ol style={{ paddingLeft: 18 }}>
        {history.data?.map((change) => <li key={change.changeId} style={{ marginTop: 8 }}>
          <div>{showDate(change.changedAt)} · {change.changedBy}: {change.reason}</div>
          <div>{showDate(change.previousPlannedStartAt)} → {showDate(change.previousPlannedEndAt)}</div>
          <div>Changed to: {showDate(change.plannedStartAt)} → {showDate(change.plannedEndAt)}</div>
        </li>)}
      </ol>
    </section>
  )
}
