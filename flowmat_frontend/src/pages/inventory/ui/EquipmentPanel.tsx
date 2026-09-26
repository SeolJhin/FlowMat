import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ApiEnvelope, EquipmentDto } from '../../../shared/types/api'
import {
  EMPTY_DETAILS_FORM, detailsForm, detailsPayload, equipmentCsv, filterEquipment, makerModel, perHour, type EquipmentDetailsForm,
} from '../model/equipmentModel'

const emptyForm = { equipmentCode: '', equipmentName: '', equipmentType: '', equipmentStatus: 'active' }

const DETAIL_FIELDS: { key: keyof EquipmentDetailsForm; label: string; number?: boolean }[] = [
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'modelName', label: 'Model' },
  { key: 'serialNo', label: 'Serial no.' },
  { key: 'location', label: 'Location' },
  { key: 'capacityPerHour', label: 'Capacity / hour', number: true },
  { key: 'powerKwh', label: 'Power kWh', number: true },
  { key: 'waterLiter', label: 'Water L', number: true },
]

export function EquipmentPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const queryKey = ['equipment', projectId]
  const equipmentQuery = useQuery({
    queryKey,
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<EquipmentDto[]>>(
      `/equipments?projectId=${encodeURIComponent(projectId)}`,
    )),
    enabled: Boolean(projectId),
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [details, setDetails] = useState(EMPTY_DETAILS_FORM)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const all = equipmentQuery.data ?? []
  const shown = filterEquipment(all, search, statusFilter)

  function download() {
    const url = URL.createObjectURL(new Blob([equipmentCsv(shown)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `equipment-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const save = useMutation({
    mutationFn: async () => {
      const parsed = detailsPayload(details)
      if (parsed.error !== null) throw new Error(parsed.error)
      const payload = editingId
        ? { equipmentName: form.equipmentName, equipmentType: form.equipmentType, equipmentStatus: form.equipmentStatus, details: parsed.details }
        : { projectId, equipmentCode: form.equipmentCode || null, equipmentName: form.equipmentName, equipmentType: form.equipmentType,
            details: parsed.details }
      const path = editingId ? `/equipments/${encodeURIComponent(editingId)}` : '/equipments'
      const response = editingId
        ? await httpClient.put<ApiEnvelope<EquipmentDto>>(path, payload)
        : await httpClient.post<ApiEnvelope<EquipmentDto>>(path, payload)
      return unwrapApiResponse(response)
    },
    onSuccess: () => {
      setEditingId(null)
      setForm(emptyForm)
      setDetails(EMPTY_DETAILS_FORM)
      void queryClient.invalidateQueries({ queryKey })
    },
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      unwrapApiVoidResponse(await httpClient.delete<ApiEnvelope<null>>(`/equipments/${encodeURIComponent(id)}`))
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  })

  function edit(equipment: EquipmentDto) {
    setEditingId(equipment.equipmentId)
    setForm({ equipmentCode: equipment.equipmentCode ?? '', equipmentName: equipment.equipmentName,
      equipmentType: equipment.equipmentType, equipmentStatus: equipment.equipmentStatus })
    setDetails(detailsForm(equipment.details))
    save.reset()
  }

  function cancel() {
    setEditingId(null)
    setForm(emptyForm)
    setDetails(EMPTY_DETAILS_FORM)
    save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24 }}>
    <section style={{ overflowX: 'auto' }}>
      <h2>Equipment</h2>
      {equipmentQuery.isPending && <p>Loading equipment...</p>}
      {equipmentQuery.isError && <p role="alert">{errorMessage(equipmentQuery.error)}</p>}
      {remove.isError && <p role="alert">{errorMessage(remove.error)}</p>}
      {equipmentQuery.data?.length === 0 && <p>No equipment has been added.</p>}
      {all.length > 0 && <div role="search" aria-label="Filter equipment"
        style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8, fontSize: 12 }}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search equipment"
          placeholder="code, name, maker, model, serial or location" style={{ minWidth: 260 }} />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Equipment status">
          <option value="">any status</option><option value="active">active</option>
          <option value="inactive">inactive</option><option value="maintenance">maintenance</option>
        </select>
        {shown.length !== all.length && <span className="inspector-hint">{shown.length} of {all.length}</span>}
        <button type="button" disabled={shown.length === 0} style={{ fontSize: 11 }} onClick={download}>Download CSV</button>
      </div>}
      <table style={{ width: '100%', textAlign: 'left' }}>
        <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th>Maker / model</th><th>Location</th>
          <th>Per hour</th><th>Actions</th></tr></thead>
        <tbody>{shown.map((equipment) => <tr key={equipment.equipmentId}>
          <td>{equipment.equipmentCode ?? '—'}</td><td>{equipment.equipmentName}</td>
          <td>{equipment.equipmentType}</td><td>{equipment.equipmentStatus}</td>
          <td>{makerModel(equipment.details) || '—'}
            {equipment.details?.serialNo && <div className="inspector-hint">S/N {equipment.details.serialNo}</div>}</td>
          <td>{equipment.details?.location ?? '—'}</td>
          <td>{perHour(equipment.details, formatQty) || '—'}</td>
          <td style={{ whiteSpace: 'nowrap' }}><button type="button" onClick={() => edit(equipment)}>Edit</button>{' '}
            <button type="button" disabled={remove.isPending} onClick={() => {
              if (window.confirm(`Delete ${equipment.equipmentName}?`)) remove.mutate(equipment.equipmentId)
            }}>Delete</button></td>
        </tr>)}</tbody>
      </table>
    </section>
    <form onSubmit={submit} style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
      <h2>{editingId ? 'Edit equipment' : 'Add equipment'}</h2>
      <label>Code<input value={form.equipmentCode} disabled={Boolean(editingId)} maxLength={50}
        onChange={(event) => setForm({ ...form, equipmentCode: event.target.value })} /></label>
      <label>Name<input value={form.equipmentName} required maxLength={100}
        onChange={(event) => setForm({ ...form, equipmentName: event.target.value })} /></label>
      <label>Type<input value={form.equipmentType} required maxLength={50}
        onChange={(event) => setForm({ ...form, equipmentType: event.target.value })} /></label>
      {editingId && <label>Status<select value={form.equipmentStatus}
        onChange={(event) => setForm({ ...form, equipmentStatus: event.target.value })}>
        <option value="active">Active</option><option value="inactive">Inactive</option>
        <option value="maintenance">Maintenance</option>
      </select></label>}
      <fieldset style={{ display: 'grid', gap: 8, border: '1px solid var(--border)', padding: 8 }}>
        <legend style={{ fontSize: 12 }}>Details (optional)</legend>
        {DETAIL_FIELDS.map((field) => <label key={field.key}>{field.label}<input
          value={details[field.key]}
          {...(field.number ? { type: 'number', min: 0, step: 'any', inputMode: 'decimal' as const } : { maxLength: 100 })}
          onChange={(event) => setDetails({ ...details, [field.key]: event.target.value })} /></label>)}
      </fieldset>
      {save.isError && <p role="alert">{errorMessage(save.error)}</p>}
      <button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</button>
      {editingId && <button type="button" onClick={cancel}>Cancel</button>}
    </form>
  </div>
}
