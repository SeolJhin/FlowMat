import { useState } from 'react'
import { useCurrentUserQuery } from '../../../entities/auth/api/useCurrentUserQuery'
import {
  useAddWorkerDayOffMutation, useRemoveWorkerDayMutation, useRemoveWorkerDayOffMutation, useSetWorkerDayMutation,
  useSetWorkerShiftsMutation, useWorkerCalendarsQuery,
  type WorkerCalendarDto, type WorkerShiftInput,
} from '../../../entities/workforce/api/useWorkerCalendars'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { DAY_NAMES, dayOffText, shiftText, weeklyText, workerDayText } from '../model/workerCalendarModel'
import { EMPTY_DAY_FORM, dayPayload, nextDayShift, type DayForm } from '../../inventory/model/equipmentScheduleModel'
import { WorkerLoadBoard } from './WorkerLoadBoard'

/**
 * When each person in the project works (docs/domain/worker-calendar.md WC9): weekly shifts and days off; project holidays
 * apply to everyone. The owner changes anyone's; a member changes their own.
 */
export function WorkerCalendarsPanel({ projectId }: { projectId: string }) {
  const me = useCurrentUserQuery().data?.userId
  const query = useWorkerCalendarsQuery(projectId)
  const workers = Array.isArray(query.data) ? query.data : []
  const iAmOwner = workers.some((worker) => worker.owner && worker.userId === me)
  const [loadOpen, setLoadOpen] = useState(false)

  return (
    <section aria-label="Workers" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <h2 style={{ margin: 0 }}>Workers</h2>
      <p className="inspector-hint">When each person in this project works. Project holidays apply to everyone.</p>
      {query.isError && <p role="alert">{errorMessage(query.error, 'Failed to load the workers.')}</p>}
      {workers.map((worker) => (
        <details key={worker.userId} aria-label={`Worker ${worker.userId}`} style={{ borderTop: '1px solid var(--border)', padding: '6px 0' }}>
          <summary style={{ cursor: 'pointer', fontSize: 13 }}>
            {worker.userId}{worker.owner ? ' (owner)' : ''} · {weeklyText(worker)}
            {worker.daysOff.length > 0 && ` · ${worker.daysOff.length} day${worker.daysOff.length === 1 ? '' : 's'} off listed`}
          </summary>
          <WorkerCalendarEditor projectId={projectId} worker={worker} editable={iAmOwner || worker.userId === me} />
        </details>
      ))}
      <details style={{ marginTop: 12 }} onToggle={(event) => setLoadOpen(event.currentTarget.open)}>
        <summary>Load by week</summary>
        {loadOpen && <WorkerLoadBoard projectId={projectId} />}
      </details>
    </section>
  )
}

type ShiftRow = { shiftStart: string; shiftEnd: string; workDays: number[] }

function WorkerCalendarEditor({ projectId, worker, editable }: { projectId: string; worker: WorkerCalendarDto; editable: boolean }) {
  const setShifts = useSetWorkerShiftsMutation(projectId)
  const addDayOff = useAddWorkerDayOffMutation(projectId)
  const removeDayOff = useRemoveWorkerDayOffMutation(projectId)
  const [rows, setRows] = useState<ShiftRow[]>(
    () => worker.shifts.map(({ shiftStart, shiftEnd, workDays }) => ({ shiftStart, shiftEnd, workDays })),
  )
  const [dayOff, setDayOff] = useState({ firstDay: '', lastDay: '', reason: '' })
  const { firstDay, lastDay, reason } = dayOff

  function update(index: number, patch: Partial<ShiftRow>) {
    setRows((current) => current.map((row, one) => (one === index ? { ...row, ...patch } : row)))
  }

  function toggleDay(index: number, day: number, on: boolean) {
    const days = rows[index].workDays
    update(index, { workDays: on ? [...days, day].sort((a, b) => a - b) : days.filter((one) => one !== day) })
  }

  function save() {
    const shifts: WorkerShiftInput[] = rows.map((row) => ({ shiftStart: row.shiftStart, shiftEnd: row.shiftEnd, workDays: row.workDays }))
    setShifts.mutate({ userId: worker.userId, shifts })
  }

  function addOff() {
    const submitted = dayOff
    addDayOff.mutate({ userId: worker.userId, firstDay, lastDay: lastDay || firstDay, reason: reason.trim() || undefined }, {
      onSuccess: () => setDayOff(current => current === submitted ? { firstDay: '', lastDay: '', reason: '' } : current),
    })
  }

  if (!editable) {
    return (
      <div style={{ fontSize: 12, padding: '4px 0 4px 12px' }}>
        {worker.shifts.length === 0
          ? <p>No shifts set.</p>
          : <ul>{worker.shifts.map((shift) => <li key={shift.shiftId}>{shiftText(shift)}</li>)}</ul>}
        {worker.daysOff.length > 0 && <ul>{worker.daysOff.map((off) => <li key={off.dayOffId}>Off {dayOffText(off)}</li>)}</ul>}
        {(worker.days ?? []).length > 0 && <ul>{(worker.days ?? []).map((day) => <li key={day.date}>{workerDayText(day)}</li>)}</ul>}
        <p className="inspector-hint">Only the project owner or {worker.userId} can change this calendar.</p>
      </div>
    )
  }
  return (
    <div style={{ fontSize: 12, padding: '4px 0 4px 12px', display: 'grid', gap: 8 }}>
      {rows.map((row, index) => (
        <div key={index} role="group" aria-label={`Shift ${index + 1}`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input aria-label={`Shift ${index + 1} start`} type="time" value={row.shiftStart}
            onChange={(event) => update(index, { shiftStart: event.target.value })} />
          <span>to</span>
          <input aria-label={`Shift ${index + 1} end`} type="time" value={row.shiftEnd}
            onChange={(event) => update(index, { shiftEnd: event.target.value })} />
          {DAY_NAMES.map((name, dayIndex) => (
            <label key={name}>
              <input type="checkbox" aria-label={`Shift ${index + 1} ${name}`} checked={row.workDays.includes(dayIndex + 1)}
                onChange={(event) => toggleDay(index, dayIndex + 1, event.target.checked)} />{name}
            </label>
          ))}
          <button type="button" onClick={() => setRows((current) => current.filter((_, one) => one !== index))}>Remove shift</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button"
          onClick={() => setRows((current) => [...current, { shiftStart: '09:00', shiftEnd: '17:00', workDays: [1, 2, 3, 4, 5] }])}>
          Add shift
        </button>
        <button type="button" onClick={save} disabled={setShifts.isPending}>{setShifts.isPending ? 'Saving...' : 'Save shifts'}</button>
      </div>
      {setShifts.isError && <p role="alert">{errorMessage(setShifts.error, 'Failed to save the shifts.')}</p>}
      {setShifts.isSuccess && <p role="status">Shifts saved: {weeklyText(setShifts.data)}.</p>}

      <div>
        <strong>Days off</strong>
        {worker.daysOff.length === 0 && <p className="inspector-hint">None listed.</p>}
        <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
          {worker.daysOff.map((off) => (
            <li key={off.dayOffId}>
              {dayOffText(off)}{' '}
              <button type="button" disabled={removeDayOff.isPending}
                onClick={() => removeDayOff.mutate({ userId: worker.userId, dayOffId: off.dayOffId })}>Remove</button>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input aria-label="First day off" type="date" value={firstDay} onChange={(event) => setDayOff(current => ({ ...current, firstDay: event.target.value }))} />
          <input aria-label="Last day off" type="date" value={lastDay} onChange={(event) => setDayOff(current => ({ ...current, lastDay: event.target.value }))} />
          <input aria-label="Day off reason" maxLength={200} placeholder="Reason" value={reason}
            onChange={(event) => setDayOff(current => ({ ...current, reason: event.target.value }))} />
          <button type="button" onClick={addOff} disabled={!firstDay || addDayOff.isPending}>Add day off</button>
        </div>
        {addDayOff.isError && <p role="alert">{errorMessage(addDayOff.error, 'Failed to add the day off.')}</p>}
        {removeDayOff.isError && <p role="alert">{errorMessage(removeDayOff.error, 'Failed to remove the day off.')}</p>}
      </div>
      <WorkerDayChanges projectId={projectId} worker={worker} />
    </div>
  )
}

/**
 * Dates with their own shifts in place of the weekly ones (docs/domain/worker-calendar.md WC33): overtime, a short day or
 * a day without work, for one date or a range.
 */
function WorkerDayChanges({ projectId, worker }: { projectId: string; worker: WorkerCalendarDto }) {
  const setDay = useSetWorkerDayMutation(projectId)
  const removeDay = useRemoveWorkerDayMutation(projectId)
  const [form, setForm] = useState<DayForm>(EMPTY_DAY_FORM)
  const [problem, setProblem] = useState<string | null>(null)
  const days = Array.isArray(worker.days) ? worker.days : []

  function updateShift(index: number, patch: Partial<DayForm['shifts'][number]>) {
    setForm((current) => ({ ...current, shifts: current.shifts.map((shift, one) => (one === index ? { ...shift, ...patch } : shift)) }))
  }

  function save() {
    const payload = dayPayload(form)
    setProblem(payload.error)
    if (!payload.input) return
    const submitted = form
    setDay.mutate({ userId: worker.userId, date: payload.date, input: payload.input }, {
      onSuccess: () => setForm((current) => (current === submitted ? EMPTY_DAY_FORM : current)),
    })
  }

  return (
    <div role="group" aria-label="Day changes">
      <strong>Day changes</strong>
      {!worker.calendarSet && <p className="inspector-hint">Set weekly shifts first; a date&apos;s shifts take their place.</p>}
      {days.length === 0 && <p className="inspector-hint">No day changes.</p>}
      <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
        {days.map((day) => (
          <li key={day.date}>
            {workerDayText(day)}{' '}
            <button type="button" disabled={removeDay.isPending}
              onClick={() => removeDay.mutate({ userId: worker.userId, date: day.date })}>Remove change</button>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input aria-label="Changed day" type="date" value={form.date}
          onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
        <input aria-label="Changed through" type="date" value={form.through}
          onChange={(event) => setForm((current) => ({ ...current, through: event.target.value }))} />
        <label>
          <input type="checkbox" checked={form.closed}
            onChange={(event) => setForm((current) => ({ ...current, closed: event.target.checked }))} /> Off that day
        </label>
        {!form.closed && form.shifts.map((shift, index) => (
          <span key={index} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <input aria-label={`Day shift ${index + 1} start`} type="time" value={shift.shiftStart}
              onChange={(event) => updateShift(index, { shiftStart: event.target.value })} />
            <span>to</span>
            <input aria-label={`Day shift ${index + 1} end`} type="time" value={shift.shiftEnd}
              onChange={(event) => updateShift(index, { shiftEnd: event.target.value })} />
            <button type="button"
              onClick={() => setForm((current) => ({ ...current, shifts: current.shifts.filter((_, one) => one !== index) }))}>
              Remove day shift
            </button>
          </span>
        ))}
        {!form.closed && (
          <button type="button" onClick={() => setForm((current) => ({ ...current, shifts: [...current.shifts, nextDayShift(current)] }))}>
            Add day shift
          </button>
        )}
        <input aria-label="Day change reason" maxLength={200} placeholder="Reason" value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
        <button type="button" onClick={save} disabled={setDay.isPending}>{setDay.isPending ? 'Saving...' : 'Save day'}</button>
      </div>
      {problem && <p role="alert">{problem}</p>}
      {setDay.isError && <p role="alert">{errorMessage(setDay.error, 'Failed to save the day.')}</p>}
      {removeDay.isError && <p role="alert">{errorMessage(removeDay.error, 'Failed to remove the day change.')}</p>}
    </div>
  )
}
