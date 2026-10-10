import { useState, type FormEvent } from 'react'
import { useEffectiveBomQuery } from '../../../entities/bom/api/useBomEffectivity'
import type { BomDto } from '../../../shared/types/api'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { validBomPeriod } from '../model/bomEffectivity'

/** Preview an explicit project calendar day; this does not create or reselect a work order. */
export function BomEffectivePreview({ projectId, boms }: { projectId: string; boms: BomDto[] }) {
  const [target, setTarget] = useState(''); const [day, setDay] = useState('')
  const [search, setSearch] = useState<{ target: string; day: string } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const query = useEffectiveBomQuery(projectId, search?.target ?? '', search?.day ?? '')
  const products = new Map(boms.map((bom) => [bom.targetItemId, bom.bomName]))
  function submit(event: FormEvent) {
    event.preventDefault()
    const problem = validBomPeriod(day, day)
    if (!target || !day || problem) { setMessage(problem ?? 'Choose a product and project calendar day.'); return }
    setMessage(null)
    if (search?.target === target && search.day === day) void query.refetch()
    else setSearch({ target, day })
  }
  return <section aria-label="BOM effective revision preview" style={{ marginTop: 18 }}>
    <h4>Find revision for a date</h4>
    <p>This preview does not change a work order or execution. A work order without a chosen BOM gets the revision effective on its planned start.</p>
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
      <label>Preview product <select value={target} required onChange={(event) => { setTarget(event.target.value); setSearch(null); setMessage(null) }}>
        <option value="">Choose a product</option>{[...products.entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></label>
      <label>Project calendar day <input type="date" min="0001-01-01" max="9999-12-31" value={day} required
        onChange={(event) => { setDay(event.target.value); setSearch(null); setMessage(null) }} /></label>
      <button type="submit" disabled={query.isFetching}>Find effective revision</button>
    </form>
    {message && <p role="alert">{message}</p>}
    {search && query.isFetching && <p>Finding effective revision...</p>}
    {search && query.isError && <p role="alert">{errorMessage(query.error, 'Failed to find the effective revision.')}</p>}
    {search && !query.isFetching && !query.isError && query.data && <p role="status">On {search.day}: revision v{query.data.bomVersion}
      {' · '}{query.data.effectiveFrom ?? 'No start limit'} → {query.data.effectiveTo ?? 'No end limit'}</p>}
  </section>
}
