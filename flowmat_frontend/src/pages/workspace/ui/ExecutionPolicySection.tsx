import { useState, type FormEvent } from 'react'
import { useExecutionPolicyQuery, useSaveExecutionPolicyMutation } from '../../../entities/workflow/api/useExecutionPolicy'
import {
  DEFAULT_POLICY_FORM,
  policyForm,
  policyPayload,
  policySummary,
  type PolicyForm,
} from '../../../entities/workflow/model/executionPolicyModel'
import { errorMessage } from '../../../shared/lib/errorMessage'

const field = { display: 'grid', gap: '4px' } as const
type PolicyDraft = PolicyForm & { expectedVersion: number }

/**
 * A node's execution policy (docs/domain/flow-run-execution-policy.md EP13): how long a step may run, how often and how
 * soon it is retried, and how many run at once. Saved policies reach new runs once a revision is published (EP3).
 */
export function ExecutionPolicySection({ processId }: { processId: string }) {
  const query = useExecutionPolicyQuery(processId)
  const save = useSaveExecutionPolicyMutation(processId)
  const [form, setForm] = useState<PolicyDraft | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const policy = query.data
  const failure = problem ?? (save.isError ? errorMessage(save.error) : query.isError ? errorMessage(query.error) : null)

  function send(next: PolicyForm) {
    if (!policy || !form) return
    const payload = policyPayload(next, form.expectedVersion)
    setProblem(payload.error)
    if (!payload.input) return
    save.mutate(payload.input, {
      onSuccess: () => {
        setForm(null)
        setSaved(true)
      },
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (form) send(form)
  }

  const set = (patch: Partial<PolicyForm>) => setForm((current) => current ? { ...current, ...patch } : null)

  return (
    <section aria-label="Execution policy" className="inspector__section" style={{ marginTop: '16px' }}>
      <h4 style={{ marginTop: 0 }}>Execution policy</h4>
      {query.isPending && <p>Loading...</p>}
      {policy && !form && (
        <>
          <p role="status" style={{ margin: '0 0 8px' }}>{policySummary(policy)}</p>
          <button type="button" onClick={() => {
            setForm({ ...policyForm(policy), expectedVersion: policy.version })
            setProblem(null)
            setSaved(false)
            save.reset()
          }}>Edit policy</button>
        </>
      )}
      {saved && !form && (
        <p className="inspector-hint" style={{ margin: '8px 0 0' }}>Saved. New runs follow it once a revision is published.</p>
      )}
      {form && (
        <form aria-label="Edit execution policy" onSubmit={submit} style={{ display: 'grid', gap: '8px' }}>
          <label style={field}><span>Time limit (s)</span>
            <input inputMode="numeric" value={form.timeoutSeconds} placeholder="none" onChange={(event) => set({ timeoutSeconds: event.target.value })} />
          </label>
          <label style={field}><span>Retries</span>
            <input inputMode="numeric" value={form.retryLimit} placeholder="3" onChange={(event) => set({ retryLimit: event.target.value })} />
          </label>
          <label style={field}><span>Retry delay (s)</span>
            <input inputMode="numeric" value={form.retryDelaySeconds} placeholder="0" onChange={(event) => set({ retryDelaySeconds: event.target.value })} />
          </label>
          <label style={field}><span>Delay growth</span>
            <select value={form.retryBackoff} onChange={(event) => set({
              retryBackoff: event.target.value as PolicyForm['retryBackoff'],
              ...(event.target.value === 'exponential' ? {} : { maxRetryDelaySeconds: '' }),
            })}>
              <option value="">Default (same each time)</option>
              <option value="fixed">Same each time</option>
              <option value="exponential">Doubling</option>
            </select>
          </label>
          {form.retryBackoff === 'exponential' && (
            <label style={field}><span>Delay cap (s)</span>
              <input inputMode="numeric" value={form.maxRetryDelaySeconds} placeholder="none"
                onChange={(event) => set({ maxRetryDelaySeconds: event.target.value })} />
            </label>
          )}
          <label style={field}><span>At most at once</span>
            <input inputMode="numeric" value={form.concurrencyLimit} placeholder="no limit" onChange={(event) => set({ concurrencyLimit: event.target.value })} />
          </label>
          <p className="inspector-hint" style={{ margin: 0 }}>
            Empty uses the default. Manual runs and production runs do not follow it; new runs follow it once a revision is published.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save policy'}</button>
            <button type="button" disabled={save.isPending} onClick={() => send(DEFAULT_POLICY_FORM)}>Use defaults</button>
            <button type="button" onClick={() => { setForm(null); setProblem(null) }}>Cancel</button>
          </div>
        </form>
      )}
      {failure && <p role="alert" style={{ color: '#991b1b', margin: '8px 0 0' }}>{failure}</p>}
    </section>
  )
}
