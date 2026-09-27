import { useMemo, useState, type FormEvent } from 'react'
import {
  useEquipmentAvailabilityQuery,
  useEquipmentScheduleMutations,
  useEquipmentScheduleQuery,
  type DowntimeType,
} from '../../../entities/catalog/api/useEquipment'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { EquipmentDto } from '../../../shared/types/api'
import {
  DAYS,
  DOWNTIME_TYPES,
  EMPTY_DOWNTIME_FORM,
  availabilitySummary,
  calendarForm,
  calendarPayload,
  downtimePayload,
  formatHours,
  nextWeek,
  shiftSummary,
  splitDowntimes,
  toggleDay,
  type CalendarForm,
} from '../model/equipmentScheduleModel'
import { EquipmentChangeovers } from './EquipmentChangeovers'

const cell = { padding: '4px 6px' } as const

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * One equipment's shift and downtime (docs/domain/equipment-schedule.md). Work order readiness uses them to check whether
 * the equipment has the time an order needs in its planned window.
 */
export function EquipmentSchedulePanel({ equipment, onClose }: { equipment: EquipmentDto; onClose: () => void }) {
  const scheduleQuery = useEquipmentScheduleQuery(equipment.equipmentId)
  const week = useMemo(() => nextWeek(new Date()), [])
  const availabilityQuery = useEquipmentAvailabilityQuery(equipment.equipmentId, week.from, week.to)
  const { setCalendar, clearCalendar, addDowntime, removeDowntime } = useEquipmentScheduleMutations(equipment.equipmentId)
  // null: not edited, so the form follows the saved calendar.
  const [editedCalendar, setEditedCalendar] = useState<CalendarForm | null>(null)
  const [downtime, setDowntime] = useState(EMPTY_DOWNTIME_FORM)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [downtimeError, setDowntimeError] = useState<string | null>(null)
  const schedule = scheduleQuery.data
  const form = editedCalendar ?? calendarForm(schedule)
  const name = equipment.equipmentCode ?? equipment.equipmentName
  const { current, past } = splitDowntimes(schedule?.downtimes ?? [], new Date())
  const calendarProblem = calendarError
    ?? (setCalendar.isError ? errorMessage(setCalendar.error) : null)
    ?? (clearCalendar.isError ? errorMessage(clearCalendar.error) : null)
  const downtimeProblem = downtimeError ?? (addDowntime.isError ? errorMessage(addDowntime.error) : null)

  function saveCalendar(event: FormEvent) {
    event.preventDefault()
    const payload = calendarPayload(form)
    setCalendarError(payload.error)
    if (payload.input) setCalendar.mutate(payload.input, { onSuccess: () => setEditedCalendar(null) })
  }

  function saveDowntime(event: FormEvent) {
    event.preventDefault()
    const payload = downtimePayload(downtime)
    setDowntimeError(payload.error)
    if (payload.input) addDowntime.mutate(payload.input, { onSuccess: () => setDowntime(EMPTY_DOWNTIME_FORM) })
  }

  return (
    <section aria-label={`Schedule of ${name}`}
      style={{ marginTop: 16, border: '1px solid var(--border)', padding: 12, display: 'grid', gap: 12, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Schedule · {name}</h3>
        <button type="button" onClick={onClose}>Close</button>
      </div>
      {scheduleQuery.isPending && <p>Loading schedule...</p>}
      {scheduleQuery.isError && <p role="alert">{errorMessage(scheduleQuery.error)}</p>}
      {schedule && <>
        <div role="status" style={{ display: 'grid', gap: 2 }}>
          <strong>{shiftSummary(schedule.calendar)}</strong>
          {availabilityQuery.data && <span>{availabilitySummary(availabilityQuery.data)}</span>}
        </div>

        <form aria-label="Calendar" onSubmit={saveCalendar} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <label>Shift start<input type="time" value={form.shiftStart} required
            onChange={(event) => setEditedCalendar({ ...form, shiftStart: event.target.value })} /></label>
          <label>Shift end<input type="time" value={form.shiftEnd} required
            onChange={(event) => setEditedCalendar({ ...form, shiftEnd: event.target.value })} /></label>
          <fieldset style={{ display: 'flex', gap: 6, border: '1px solid var(--border)', padding: '2px 6px' }}>
            <legend>Work days</legend>
            {DAYS.map(([day, label]) => <label key={day} style={{ whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={form.workDays.includes(day)}
                onChange={() => setEditedCalendar({ ...form, workDays: toggleDay(form.workDays, day) })} />{label}
            </label>)}
          </fieldset>
          <button type="submit" disabled={setCalendar.isPending}>{setCalendar.isPending ? 'Saving...' : 'Save calendar'}</button>
          {schedule.calendar && <button type="button" disabled={clearCalendar.isPending}
            onClick={() => clearCalendar.mutate(undefined, { onSuccess: () => setEditedCalendar(null) })}>Remove calendar</button>}
          <span className="inspector-hint" style={{ flexBasis: '100%' }}>
            Times are in {schedule.timeZone}. A shift that ends at or before its start runs past midnight; the same time is all day.
          </span>
          {calendarProblem && <p role="alert" style={{ flexBasis: '100%', margin: 0 }}>{calendarProblem}</p>}
        </form>

        <form aria-label="Add downtime" onSubmit={saveDowntime} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <label>Type<select value={downtime.downtimeType}
            onChange={(event) => setDowntime({ ...downtime, downtimeType: event.target.value as DowntimeType })}>
            {DOWNTIME_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select></label>
          <label>Starts<input type="datetime-local" value={downtime.startsAt} required
            onChange={(event) => setDowntime({ ...downtime, startsAt: event.target.value })} /></label>
          <label>Ends<input type="datetime-local" value={downtime.endsAt} required
            onChange={(event) => setDowntime({ ...downtime, endsAt: event.target.value })} /></label>
          <label>Reason<input value={downtime.reason} maxLength={500}
            onChange={(event) => setDowntime({ ...downtime, reason: event.target.value })} /></label>
          <button type="submit" disabled={addDowntime.isPending}>{addDowntime.isPending ? 'Adding...' : 'Add downtime'}</button>
          {downtimeProblem && <p role="alert" style={{ flexBasis: '100%', margin: 0 }}>{downtimeProblem}</p>}
        </form>

        {removeDowntime.isError && <p role="alert">{errorMessage(removeDowntime.error)}</p>}
        {current.length + past.length === 0
          ? <p className="inspector-hint">No downtime recorded.</p>
          : <table aria-label="Downtime list" style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'left' }}>
            <thead><tr><th style={cell}>Type</th><th style={cell}>Starts</th><th style={cell}>Ends</th>
              <th style={{ ...cell, textAlign: 'right' }}>Hours</th><th style={cell}>Reason</th><th style={cell}>Actions</th></tr></thead>
            <tbody>{[...current, ...past].map((one) => <tr key={one.downtimeId}
              style={{ borderTop: '1px solid var(--border)', opacity: past.includes(one) ? 0.6 : 1 }}>
              <td style={cell}>{one.downtimeType}</td><td style={cell}>{when(one.startsAt)}</td><td style={cell}>{when(one.endsAt)}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{formatHours(one.hours)}</td><td style={cell}>{one.reason ?? '—'}</td>
              <td style={cell}><button type="button" disabled={removeDowntime.isPending} onClick={() => {
                if (window.confirm(`Remove this ${one.downtimeType} downtime?`)) removeDowntime.mutate(one.downtimeId)
              }}>Remove</button></td>
            </tr>)}</tbody>
          </table>}

        <EquipmentChangeovers equipment={equipment} />
      </>}
    </section>
  )
}
