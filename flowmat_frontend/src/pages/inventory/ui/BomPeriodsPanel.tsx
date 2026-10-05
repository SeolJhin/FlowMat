import { useState, type FormEvent } from 'react'
import { useCurrentUserQuery } from '../../../entities/auth/api/useCurrentUserQuery'
import { useProjectMembersQuery } from '../../../entities/project/api/useProjectMembersQuery'
import { useBomEffectivityMutation, useBomEffectivityQuery, type BomEffectivity,
  type BomEffectivityInput } from '../../../entities/bom/api/useBomEffectivity'
import type { BomDto } from '../../../shared/types/api'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { validBomPeriod } from '../model/bomEffectivity'

const showPeriod = (from: string | null, to: string | null) => `${from ?? 'No start limit'} → ${to ?? 'No end limit'}`
export function BomPeriodsPanel({ projectId, boms }: { projectId: string; boms: BomDto[] }) {
  const [bomId, setBomId] = useState('')
  const current = useBomEffectivityQuery(projectId, bomId)
  const mutation = useBomEffectivityMutation(projectId)
  const members = useProjectMembersQuery(projectId)
  const me = useCurrentUserQuery().data?.userId
  const role = members.data?.find((member) => member.userId === me && member.memberStatus === 'active')?.projectRole
  const [base, setBase] = useState<BomEffectivity | null>(null)
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [unknown, setUnknown] = useState<{ bomId: string; input: BomEffectivityInput } | null>(null)
  const locked = mutation.isPending || Boolean(unknown)
  const dirty = Boolean(base) && (from !== (base?.effectiveFrom ?? '') || to !== (base?.effectiveTo ?? '') || Boolean(reason))
  const editable = current.data?.bomStatus === 'draft' ? role === 'editor' || role === 'owner'
    : current.data?.bomStatus === 'approved' && role === 'owner'
  function load(value: BomEffectivity) { setBase(value); setFrom(value.effectiveFrom ?? ''); setTo(value.effectiveTo ?? ''); setReason('') }
  async function save(event: FormEvent) {
    event.preventDefault()
    const problem = validBomPeriod(from, to)
    if (!unknown && (problem || !reason.trim() || !base)) { setMessage(problem ?? 'Load the current period and enter a reason.'); return }
    const command = unknown ?? { bomId, input: { effectiveFrom: from || null, effectiveTo: to || null,
      expectedPeriodVersion: base!.periodVersion, reason: reason.trim(), requestId: crypto.randomUUID() } }
    setMessage(null)
    try { const result = await mutation.mutateAsync(command); setUnknown(null); load(result); setMessage('Effective period saved.') }
    catch (error) {
      const status = error && typeof error === 'object' && 'httpStatus' in error ? Number(error.httpStatus) : 0
      if (!status || status >= 500) setUnknown(command)
      else { setUnknown(null); void current.refetch() }
      setMessage(errorMessage(error, 'Failed to change the effective period.'))
    }
  }
  return <section aria-label="BOM effective periods" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
    <h3>Effective periods</h3>
    <label>Revision <select value={bomId} disabled={locked || dirty} onChange={(event) => {
      setBomId(event.target.value); setBase(null); setFrom(''); setTo(''); setReason(''); setMessage(null); mutation.reset()
    }}><option value="">Choose a revision</option>{boms.map((bom) => <option key={bom.bomId} value={bom.bomId}>
      {bom.bomName} · v{bom.bomVersion} · {bom.bomStatus}</option>)}</select></label>
    {current.isLoading && <p>Loading effective period...</p>}
    {current.isError && <p role="alert">{errorMessage(current.error, 'Failed to load the effective period.')}</p>}
    {members.isError && <p role="alert">{errorMessage(members.error, 'Failed to check your project role.')}</p>}
    {current.data && <>
      <p>Current period: {showPeriod(current.data.effectiveFrom, current.data.effectiveTo)}</p>
      <p>Boundaries include the selected day. Leave a boundary empty for no limit.</p>
      {editable ? <form onSubmit={(event) => void save(event)} style={{ display: 'grid', gap: 8, maxWidth: 540 }}>
        <button type="button" disabled={locked} onClick={() => { load(current.data!); setMessage(null); mutation.reset() }}>
          {dirty ? 'Discard edits and load current period' : 'Load current period to edit'}</button>
        {base && <>
          <label>Effective from <input type="date" min="0001-01-01" max="9999-12-31" value={from} disabled={locked} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>Effective to <input type="date" min="0001-01-01" max="9999-12-31" value={to} disabled={locked} onChange={(event) => setTo(event.target.value)} /></label>
          <label>Period change reason * <textarea required maxLength={1000} value={reason} disabled={locked} onChange={(event) => setReason(event.target.value)} /></label>
          <button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving period...' : unknown ? 'Retry the same period change' : 'Save effective period'}</button>
        </>}
      </form> : <p>Draft dates can be edited by an editor or owner; approved dates require the project owner. Pending and retired periods are fixed.</p>}
      <h4>Period changes (latest 50)</h4>
      {current.data.history.length === 0 && <p>No period changes recorded.</p>}
      <ol>{current.data.history.map((change) => <li key={change.changeId}>
        <div>{change.changedAt} · {change.changedBy}: {change.reason}</div>
        <div>{showPeriod(change.previousEffectiveFrom, change.previousEffectiveTo)} → {showPeriod(change.effectiveFrom, change.effectiveTo)}</div>
      </li>)}</ol>
    </>}
    {message && <p role={mutation.isError ? 'alert' : 'status'}>{message}</p>}
    {unknown && <p role="alert">The result is unconfirmed. Retry the same period change before editing or selecting another revision.</p>}
  </section>
}
