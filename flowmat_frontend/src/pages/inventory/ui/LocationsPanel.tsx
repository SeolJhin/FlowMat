import { useState, type FormEvent } from 'react'
import { useInventoriesQuery } from '../../../entities/inventory/api/useInventoriesQuery'
import {
  useStorageLocationMutations,
  useStorageLocationsQuery,
  type StorageLocationDto,
  type StorageLocationType,
} from '../../../entities/inventory/api/useStorageLocations'
import { errorMessage } from '../../../shared/lib/errorMessage'
import {
  EMPTY_LOCATION_FORM,
  LOCATION_TYPES,
  LOCATION_TYPE_LABELS,
  createPayload,
  filterLocations,
  locationForm,
  parentOptions,
  unlistedPlaces,
  updatePayload,
} from '../model/locationModel'

/**
 * The project's places to keep stock (docs/domain/storage-location.md): sites, warehouses, zones, locations and bins as
 * a tree. Once it lists a place, new stock, moves and imports go only to an active listed place.
 */
export function LocationsPanel({ projectId }: { projectId: string }) {
  const locationsQuery = useStorageLocationsQuery(projectId)
  const inventoriesQuery = useInventoriesQuery(projectId)
  const { create, update, toggle, remove, adopt } = useStorageLocationMutations(projectId)
  const [editing, setEditing] = useState<StorageLocationDto | null>(null)
  const [form, setForm] = useState(EMPTY_LOCATION_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const all = locationsQuery.data ?? []
  const shown = filterLocations(all, search, showInactive)
  const unlisted = unlistedPlaces(all, (inventoriesQuery.data ?? []).map((row) => row.location))
  const parents = parentOptions(all, form.locationType, editing)
  const saving = create.isPending || update.isPending
  const saveError = formError
    ?? (create.isError ? errorMessage(create.error) : null)
    ?? (update.isError ? errorMessage(update.error) : null)

  function reset() {
    setEditing(null)
    setForm(EMPTY_LOCATION_FORM)
    setFormError(null)
    create.reset()
    update.reset()
  }

  function startEdit(location: StorageLocationDto) {
    reset()
    setEditing(location)
    setForm(locationForm(location))
  }

  // A parent that cannot hold the new kind is dropped rather than sent and refused.
  function changeType(type: StorageLocationType) {
    const allowed = parentOptions(all, type, editing)
    setForm((current) => ({
      ...current,
      locationType: type,
      parentLocationId: allowed.some((one) => one.locationId === current.parentLocationId) ? current.parentLocationId : '',
    }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (editing) {
      const payload = updatePayload(form, editing)
      setFormError(payload.error)
      if (payload.input) update.mutate({ locationId: editing.locationId, input: payload.input }, { onSuccess: reset })
      return
    }
    const payload = createPayload(projectId, form)
    setFormError(payload.error)
    // Keep the kind and parent so the next place of a row of bins is quick to add.
    if (payload.input) {
      create.mutate(payload.input, {
        onSuccess: () => setForm({ ...EMPTY_LOCATION_FORM, locationType: form.locationType, parentLocationId: form.parentLocationId }),
      })
    }
  }

  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24 }}>
    <section style={{ overflowX: 'auto' }}>
      <h2>Locations</h2>
      <p className="inspector-hint">
        {all.length === 0
          ? 'No places are listed, so stock locations are free text. Once you add a place, new stock, moves and imports can only go to an active place on this list.'
          : 'New stock, moves and imports can only go to an active place on this list. Places nest as site > warehouse > zone > location > bin.'}
      </p>
      {unlisted.length > 0 && <p role="status" style={{ fontSize: 13 }}>
        Stock records name {unlisted.length} {unlisted.length === 1 ? 'place' : 'places'} not on the list:{' '}
        {unlisted.slice(0, 5).join(', ')}{unlisted.length > 5 ? ', ...' : ''}{' '}
        <button type="button" disabled={adopt.isPending} onClick={() => adopt.mutate()}>
          {adopt.isPending ? 'Adding...' : 'Add them as locations'}
        </button>
      </p>}
      {adopt.isError && <p role="alert">{errorMessage(adopt.error)}</p>}
      {locationsQuery.isPending && <p>Loading locations...</p>}
      {locationsQuery.isError && <p role="alert">{errorMessage(locationsQuery.error)}</p>}
      {toggle.isError && <p role="alert">{errorMessage(toggle.error)}</p>}
      {remove.isError && <p role="alert">{errorMessage(remove.error)}</p>}
      {all.length > 0 && <div role="search" aria-label="Filter locations"
        style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8, fontSize: 12 }}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search locations"
          placeholder="code, name or path" style={{ minWidth: 220 }} />
        <label><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Show inactive</label>
        {shown.length !== all.length && <span className="inspector-hint">{shown.length} of {all.length}</span>}
      </div>}
      {all.length > 0 && <table aria-label="Storage locations" style={{ width: '100%', textAlign: 'left' }}>
        <thead><tr><th>Code</th><th>Name</th><th>Kind</th><th>Path</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{shown.map((location) => <tr key={location.locationId} style={{ opacity: location.active ? 1 : 0.6 }}>
          <td style={{ paddingLeft: 6 + location.depth * 16 }}>{location.locationCode}</td>
          <td>{location.locationName ?? '—'}</td>
          <td>{LOCATION_TYPE_LABELS[location.locationType]}</td>
          <td className="inspector-hint">{location.path}</td>
          <td>{location.stockRecords === 0 ? 'empty'
            : `${location.stockRecords} ${location.stockRecords === 1 ? 'record' : 'records'}, ${location.itemCount} ${location.itemCount === 1 ? 'item' : 'items'}`}</td>
          <td>{location.active ? 'active' : 'inactive'}</td>
          <td style={{ whiteSpace: 'nowrap' }}>
            <button type="button" onClick={() => startEdit(location)}>Edit</button>{' '}
            <button type="button" disabled={toggle.isPending}
              onClick={() => toggle.mutate({ locationId: location.locationId, active: !location.active })}>
              {location.active ? 'Deactivate' : 'Activate'}
            </button>{' '}
            <button type="button" disabled={remove.isPending} onClick={() => {
              if (window.confirm(`Delete ${location.locationCode}?`)) remove.mutate(location.locationId)
            }}>Delete</button>
          </td>
        </tr>)}</tbody>
      </table>}
    </section>
    <form onSubmit={submit} aria-label={editing ? 'Edit location' : 'Add location'}
      style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
      <h2>{editing ? `Edit ${editing.locationCode}` : 'Add location'}</h2>
      <label>Code<input value={form.locationCode} required maxLength={100}
        onChange={(event) => setForm({ ...form, locationCode: event.target.value })} /></label>
      {editing && editing.stockRecords > 0 && <small className="inspector-hint">The code cannot change while stock is here.</small>}
      <label>Name<input value={form.locationName} maxLength={100}
        onChange={(event) => setForm({ ...form, locationName: event.target.value })} /></label>
      <label>Kind<select value={form.locationType} onChange={(event) => changeType(event.target.value as StorageLocationType)}>
        {LOCATION_TYPES.map((type) => <option key={type} value={type}>{LOCATION_TYPE_LABELS[type]}</option>)}
      </select></label>
      <label>Inside<select value={form.parentLocationId}
        onChange={(event) => setForm({ ...form, parentLocationId: event.target.value })}>
        <option value="">(top level)</option>
        {parents.map((one) => <option key={one.locationId} value={one.locationId}>{one.path}</option>)}
      </select></label>
      <label>Note<input value={form.note} maxLength={500}
        onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
      {saveError && <p role="alert">{saveError}</p>}
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      {editing && <button type="button" onClick={reset}>Cancel</button>}
    </form>
  </div>
}
