import { useState } from 'react'
import { useProjectTimeZone, type TimeZoneCommand } from '../../../entities/project/api/useProjectTimeZone'
import { useProjectMembersQuery } from '../../../entities/project/api/useProjectMembersQuery'
import { useCurrentUserQuery } from '../../../entities/auth/api/useCurrentUserQuery'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'
export function ProjectTimeZonePanel({ projectId }: { projectId: string }) {
  const { query, save } = useProjectTimeZone(projectId)
  const { data: members = [] } = useProjectMembersQuery(projectId)
  const { data: user } = useCurrentUserQuery()
  const owner = members.some((m) => m.userId === user?.userId && m.projectRole === 'owner')
  const [draft, setDraft] = useState<TimeZoneCommand | null>(null)
  const [pending, setPending] = useState<TimeZoneCommand | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const locked = save.isPending || pending !== null
  async function submit() {
    if (!query.data || !owner) return
    const command = pending ?? draft ?? { timeZone: query.data.timeZone, expectedVersion: query.data.version }
    setDraft(command); setMessage(null)
    try { await save.mutateAsync(command); setDraft(null); setPending(null) }
    catch (error) {
      const status = errorStatus(error)
      if (status === null || status >= 500) {
        setPending(command); setMessage('Time zone save is unconfirmed. Retry to recover the same change.')
      } else { setPending(null); setMessage(errorMessage(error, 'Time zone could not be saved.')) }
    }
  }
  async function reload() {
    const result = await query.refetch()
    if (result.data && !result.isError) { setDraft(null); setPending(null); setMessage(null) }
  }
  return <section aria-label="Project time zone" style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 24, minWidth: 0 }}>
    <h2>Project time zone</h2>
    <p>Calendar dates, LOT expiry and due dates use this zone. Stored timestamps stay in UTC.</p>
    {query.isLoading && <p>Loading time zone…</p>}
    {query.error && <p role="alert">{errorMessage(query.error, 'Time zone could not be loaded.')}</p>}
    {query.data && <p>Current zone: <strong>{query.data.timeZone}</strong></p>}
    {owner && query.data && <div style={{ display: 'grid', gap: 12 }}>
      <label>IANA time zone <input value={draft?.timeZone ?? query.data.timeZone} maxLength={100} disabled={locked} placeholder="Asia/Seoul"
        style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
        onChange={(event) => setDraft({ timeZone: event.target.value, expectedVersion: draft?.expectedVersion ?? query.data!.version })} /></label>
      <p style={{ margin: 0 }}>Changing the zone changes future date-based calculations. Existing dates and timestamps are retained.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" disabled={save.isPending || !(draft?.timeZone ?? query.data.timeZone)} onClick={() => void submit()}>{pending ? 'Retry time zone save' : 'Save time zone'}</button>
        <button type="button" disabled={locked || query.isFetching} onClick={() => void reload()}>Reload time zone</button>
      </div>
    </div>}
    {!owner && query.data && <p>Only the project owner can change the time zone.</p>}
    {message && <p role="alert">{message}</p>}
    {!query.data && !query.isLoading && <button type="button" onClick={() => void reload()}>Reload time zone</button>}
  </section>
}
