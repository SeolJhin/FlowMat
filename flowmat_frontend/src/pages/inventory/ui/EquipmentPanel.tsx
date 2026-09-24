import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { ApiEnvelope } from '../../../shared/types/api'

interface Equipment {
  equipmentId: string
  projectId: string
  equipmentCode: string | null
  equipmentName: string
  equipmentType: string
  equipmentStatus: string
}

const emptyForm = { equipmentCode: '', equipmentName: '', equipmentType: '', equipmentStatus: 'active' }

export function EquipmentPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const queryKey = ['equipment', projectId]
  const equipmentQuery = useQuery({
    queryKey,
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<Equipment[]>>(
      `/equipments?projectId=${encodeURIComponent(projectId)}`,
    )),
    enabled: Boolean(projectId),
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const save = useMutation({
    mutationFn: async () => {
      const payload = editingId
        ? { equipmentName: form.equipmentName, equipmentType: form.equipmentType, equipmentStatus: form.equipmentStatus }
        : { projectId, equipmentCode: form.equipmentCode || null, equipmentName: form.equipmentName, equipmentType: form.equipmentType }
      const path = editingId ? `/equipments/${encodeURIComponent(editingId)}` : '/equipments'
      const response = editingId
        ? await httpClient.put<ApiEnvelope<Equipment>>(path, payload)
        : await httpClient.post<ApiEnvelope<Equipment>>(path, payload)
      return unwrapApiResponse(response)
    },
    onSuccess: () => {
      setEditingId(null)
      setForm(emptyForm)
      void queryClient.invalidateQueries({ queryKey })
    },
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      unwrapApiVoidResponse(await httpClient.delete<ApiEnvelope<null>>(`/equipments/${encodeURIComponent(id)}`))
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  })

  function edit(equipment: Equipment) {
    setEditingId(equipment.equipmentId)
    setForm({ equipmentCode: equipment.equipmentCode ?? '', equipmentName: equipment.equipmentName,
      equipmentType: equipment.equipmentType, equipmentStatus: equipment.equipmentStatus })
    save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24 }}>
    <section>
      <h2>Equipment</h2>
      {equipmentQuery.isPending && <p>Loading equipment...</p>}
      {equipmentQuery.isError && <p role="alert">{errorMessage(equipmentQuery.error)}</p>}
      {remove.isError && <p role="alert">{errorMessage(remove.error)}</p>}
      {equipmentQuery.data?.length === 0 && <p>No equipment has been added.</p>}
      <table style={{ width: '100%', textAlign: 'left' }}>
        <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{equipmentQuery.data?.map((equipment) => <tr key={equipment.equipmentId}>
          <td>{equipment.equipmentCode ?? '—'}</td><td>{equipment.equipmentName}</td>
          <td>{equipment.equipmentType}</td><td>{equipment.equipmentStatus}</td>
          <td><button type="button" onClick={() => edit(equipment)}>Edit</button>{' '}
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
      {save.isError && <p role="alert">{errorMessage(save.error)}</p>}
      <button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</button>
      {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); save.reset() }}>Cancel</button>}
    </form>
  </div>
}
