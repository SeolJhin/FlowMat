import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { ApiEnvelope, WorkflowDto, WorkflowRevisionDetailDto, WorkflowRevisionDto } from '../../../shared/types/api'

type FlowRun = {
  flowRunId: string
  workflowRevisionId: string
  productionRunId: string | null
  runType: string
  status: string
  startedAt: string
  endedAt: string | null
}

type FlowRunStep = {
  stepId: string
  nodeId: string
  sequenceNo: number
  status: string
  errorCode: string | null
  inputSnapshot: unknown
  outputSnapshot: unknown
}

type FlowRunAttempt = {
  attemptId: string
  attemptNo: number
  status: string
  errorCode: string | null
}

type FlowRunEvent = {
  eventId: string
  eventType: string
  stepId: string | null
  occurredAt: string
  actorId: string
}

type NodeOption = { processId: string; processName: string }

function revisionNodes(snapshot: unknown): NodeOption[] {
  if (!snapshot || typeof snapshot !== 'object' || !('processes' in snapshot)) return []
  const processes = snapshot.processes
  if (!Array.isArray(processes)) return []
  return processes.flatMap((value: unknown) => {
    if (!value || typeof value !== 'object' || !('processId' in value) || typeof value.processId !== 'string') return []
    const name = 'processName' in value && typeof value.processName === 'string' ? value.processName : value.processId
    return [{ processId: value.processId, processName: name }]
  })
}

async function getData<T>(path: string): Promise<T> {
  return unwrapApiResponse(await httpClient.get<ApiEnvelope<T>>(path))
}

async function postData<T>(path: string, body?: unknown): Promise<T> {
  return unwrapApiResponse(await httpClient.post<ApiEnvelope<T>>(path, body))
}

export function FlowRunsPanel({
  projectId,
  workflowId,
  workflows,
  revisions,
  onSelectWorkflow,
}: {
  projectId: string
  workflowId: string
  workflows: WorkflowDto[]
  revisions: WorkflowRevisionDto[]
  onSelectWorkflow: (workflowId: string) => void
}) {
  const queryClient = useQueryClient()
  const [runId, setRunId] = useState('')
  const [revisionId, setRevisionId] = useState('')
  const [runType, setRunType] = useState('test')
  const [nodeId, setNodeId] = useState('')
  const [inputJson, setInputJson] = useState('{}')
  const [outputJson, setOutputJson] = useState('{}')
  const [errorCode, setErrorCode] = useState('MANUAL_FAILURE')
  const [runStopReason, setRunStopReason] = useState('')
  const [formError, setFormError] = useState('')

  const published = revisions.filter((revision) => revision.status === 'published')
  const selectedRevisionId = published.some((revision) => revision.workflowRevisionId === revisionId)
    ? revisionId : published[0]?.workflowRevisionId ?? ''
  const runsQuery = useQuery({
    queryKey: ['flow-runs', workflowId],
    queryFn: () => getData<FlowRun[]>(`/flow-runs?workflowId=${encodeURIComponent(workflowId)}`),
    enabled: Boolean(workflowId),
  })
  const runs = runsQuery.data ?? []
  const selectedRunId = runs.some((run) => run.flowRunId === runId) ? runId : runs[0]?.flowRunId ?? ''
  const selectedRun = runs.find((run) => run.flowRunId === selectedRunId)
  const basePath = `/flow-runs/${encodeURIComponent(selectedRunId)}`
  const stepsQuery = useQuery({
    queryKey: ['flow-run-steps', selectedRunId],
    queryFn: () => getData<FlowRunStep[]>(`${basePath}/steps`),
    enabled: Boolean(selectedRunId),
  })
  const eventsQuery = useQuery({
    queryKey: ['flow-run-events', selectedRunId],
    queryFn: () => getData<FlowRunEvent[]>(`${basePath}/events`),
    enabled: Boolean(selectedRunId),
  })
  const revisionQuery = useQuery({
    queryKey: ['workflow-revision', workflowId, selectedRun?.workflowRevisionId],
    queryFn: () => getData<WorkflowRevisionDetailDto>(
      `/workflows/${encodeURIComponent(workflowId)}/revisions/${encodeURIComponent(selectedRun!.workflowRevisionId)}`,
    ),
    enabled: Boolean(workflowId && selectedRun?.workflowRevisionId),
  })
  const nodes = revisionNodes(revisionQuery.data?.snapshot)
  const selectedNodeId = nodes.some((node) => node.processId === nodeId) ? nodeId : nodes[0]?.processId ?? ''
  const steps = stepsQuery.data ?? []
  const [expandedStepId, setExpandedStepId] = useState('')
  const attemptsQuery = useQuery({
    queryKey: ['flow-run-attempts', selectedRunId, expandedStepId],
    queryFn: () => getData<FlowRunAttempt[]>(`${basePath}/steps/${encodeURIComponent(expandedStepId)}/attempts`),
    enabled: Boolean(selectedRunId && expandedStepId),
  })

  async function refreshRun(id: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['flow-runs', workflowId] }),
      queryClient.invalidateQueries({ queryKey: ['flow-run-steps', id] }),
      queryClient.invalidateQueries({ queryKey: ['flow-run-events', id] }),
      queryClient.invalidateQueries({ queryKey: ['flow-run-attempts', id] }),
    ])
  }

  const startMutation = useMutation({
    mutationFn: () => postData<FlowRun>('/flow-runs', {
      workflowId, workflowRevisionId: selectedRevisionId, runType,
    }),
    onSuccess: async (run) => {
      setRunId(run.flowRunId)
      await refreshRun(run.flowRunId)
    },
  })
  const actionMutation = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => postData<unknown>(path, body),
    onSuccess: async () => { await refreshRun(selectedRunId) },
  })

  function parseJson(value: string): unknown {
    try {
      return JSON.parse(value) as unknown
    } catch {
      throw new Error('Enter valid JSON before recording the step.')
    }
  }

  async function createStep(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    try {
      const inputSnapshot = parseJson(inputJson)
      await actionMutation.mutateAsync({ path: `${basePath}/steps`, body: { nodeId: selectedNodeId, inputSnapshot } })
      setInputJson('{}')
    } catch (error) {
      setFormError(errorMessage(error, 'Could not create the step.'))
    }
  }

  async function act(path: string, body?: unknown) {
    setFormError('')
    try {
      await actionMutation.mutateAsync({ path, body })
    } catch (error) {
      setFormError(errorMessage(error, 'Could not update the run.'))
    }
  }

  async function completeStep(stepId: string) {
    try {
      await act(`${basePath}/steps/${encodeURIComponent(stepId)}/complete`, { outputSnapshot: parseJson(outputJson) })
    } catch (error) {
      setFormError(errorMessage(error, 'Enter valid JSON before completing the step.'))
    }
  }

  if (workflows.length === 0) return <p className="inspector-hint">Create a workflow before starting a Flow Run.</p>

  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <label style={{ display: 'grid', gap: 4, maxWidth: 360 }}>
        Workflow
        <select value={workflowId} onChange={(event) => onSelectWorkflow(event.target.value)}>
          {workflows.map((workflow) => (
            <option key={workflow.workflowId} value={workflow.workflowId}>{workflow.workflowName}</option>
          ))}
        </select>
      </label>

      <form onSubmit={(event) => { event.preventDefault(); void startMutation.mutateAsync().catch(() => undefined) }}
        style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 4 }}>Published revision
          <select value={selectedRevisionId} onChange={(event) => setRevisionId(event.target.value)}>
            {published.length === 0 && <option value="">None</option>}
            {published.map((revision) => (
              <option key={revision.workflowRevisionId} value={revision.workflowRevisionId}>v{revision.revisionNo}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>Run type
          <select value={runType} onChange={(event) => setRunType(event.target.value)}>
            {['test', 'simulation', 'dry_run', 'actual'].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <button type="submit" disabled={!selectedRevisionId || startMutation.isPending}>Start Flow Run</button>
      </form>
      {startMutation.isError && <p role="alert">{errorMessage(startMutation.error, 'Could not start the run.')}</p>}

      {runsQuery.isLoading && <p>Loading Flow Runs...</p>}
      {runsQuery.isError && <p role="alert">{errorMessage(runsQuery.error, 'Could not load Flow Runs.')}</p>}
      {runs.length === 0 && !runsQuery.isLoading && <p className="inspector-hint">No Flow Runs for this workflow.</p>}
      {runs.length > 0 && (
        <label style={{ display: 'grid', gap: 4, maxWidth: 480 }}>Flow Run
          <select value={selectedRunId} onChange={(event) => { setRunId(event.target.value); setExpandedStepId('') }}>
            {runs.map((run) => (
              <option key={run.flowRunId} value={run.flowRunId}>
                {run.flowRunId.slice(0, 8)} · {run.runType} · {run.status} · {new Date(run.startedAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedRun && (
        <>
          <div>Revision v{revisions.find((revision) => revision.workflowRevisionId === selectedRun.workflowRevisionId)?.revisionNo ?? '?'}
            {' · '}Status: {selectedRun.status}
            {selectedRun.productionRunId && (
              <> · <Link to={`/projects/${projectId}/runs/${selectedRun.productionRunId}`}>Open production run</Link></>
            )}
          </div>
          {selectedRun.status === 'running' && !selectedRun.productionRunId && (
            <>
              <form onSubmit={(event) => void createStep(event)} style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
                <label>Node in pinned revision
                  <select value={selectedNodeId} onChange={(event) => setNodeId(event.target.value)}>
                    {nodes.map((node) => <option key={node.processId} value={node.processId}>{node.processName}</option>)}
                  </select>
                </label>
                <label>Input snapshot (JSON)
                  <textarea value={inputJson} onChange={(event) => setInputJson(event.target.value)} rows={2} />
                </label>
                <button type="submit" disabled={!selectedNodeId || actionMutation.isPending}>Add planned step</button>
              </form>
              {revisionQuery.isError && <p role="alert">{errorMessage(revisionQuery.error, 'Could not load revision nodes.')}</p>}
              {nodes.length === 0 && !revisionQuery.isLoading && <p className="inspector-hint">This revision has no process nodes.</p>}
            </>
          )}

          <h3 style={{ marginBottom: 0 }}>Steps</h3>
          {stepsQuery.isLoading && <p>Loading steps...</p>}
          {stepsQuery.isError && <p role="alert">{errorMessage(stepsQuery.error, 'Could not load steps.')}</p>}
          {steps.length === 0 && !stepsQuery.isLoading && <p className="inspector-hint">No steps recorded.</p>}
          {steps.map((step) => (
            <div key={step.stepId} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>#{step.sequenceNo} {nodes.find((node) => node.processId === step.nodeId)?.processName ?? step.nodeId}</strong>
                <span>{step.status}</span>
                {step.errorCode && <span role="alert">{step.errorCode}</span>}
                <button type="button" onClick={() => setExpandedStepId(expandedStepId === step.stepId ? '' : step.stepId)}>
                  {expandedStepId === step.stepId ? 'Hide attempts' : 'Show attempts'}
                </button>
                {selectedRun.status === 'running' && !selectedRun.productionRunId && (
                  <>
                    {step.status === 'planned' && <button type="button" disabled={actionMutation.isPending}
                      onClick={() => void act(`${basePath}/steps/${encodeURIComponent(step.stepId)}/start`)}>Start</button>}
                    {step.status === 'failed' && <button type="button" disabled={actionMutation.isPending}
                      onClick={() => void act(`${basePath}/steps/${encodeURIComponent(step.stepId)}/retry`)}>Retry</button>}
                    {step.status === 'running' && <>
                      <button type="button" disabled={actionMutation.isPending} onClick={() => void completeStep(step.stepId)}>Complete</button>
                      <button type="button" disabled={actionMutation.isPending || !errorCode.trim()}
                        onClick={() => void act(`${basePath}/steps/${encodeURIComponent(step.stepId)}/fail`, { errorCode })}>Fail</button>
                    </>}
                  </>
                )}
              </div>
              {expandedStepId === step.stepId && (
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  {attemptsQuery.isLoading && <span>Loading attempts...</span>}
                  {(attemptsQuery.data ?? []).map((attempt) => (
                    <div key={attempt.attemptId}>Attempt {attempt.attemptNo}: {attempt.status}{attempt.errorCode ? ` (${attempt.errorCode})` : ''}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {selectedRun.status === 'running' && !selectedRun.productionRunId && (
            <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
              <label>Output snapshot for completion (JSON)
                <textarea value={outputJson} onChange={(event) => setOutputJson(event.target.value)} rows={2} />
              </label>
              <label>Failure code
                <input value={errorCode} onChange={(event) => setErrorCode(event.target.value)} maxLength={100} />
              </label>
              <button type="button" disabled={actionMutation.isPending || stepsQuery.isLoading || stepsQuery.isError
                || steps.some((step) => step.status !== 'completed')}
                onClick={() => void act(`${basePath}/finish`, {})}>Finish Flow Run</button>
              <label>Reason for ending this run
                <textarea value={runStopReason} onChange={(event) => setRunStopReason(event.target.value)}
                  maxLength={4000} rows={2} />
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" disabled={actionMutation.isPending || !runStopReason.trim()}
                  onClick={() => void act(`${basePath}/cancel`, { reason: runStopReason })}>Cancel Flow Run</button>
                <button type="button" disabled={actionMutation.isPending || !runStopReason.trim() || !errorCode.trim()}
                  onClick={() => void act(`${basePath}/fail`, { errorCode, errorMessage: runStopReason })}>
                  Mark Flow Run failed
                </button>
              </div>
            </div>
          )}
          {formError && <p role="alert">{formError}</p>}

          <h3 style={{ marginBottom: 0 }}>Events</h3>
          {eventsQuery.isLoading && <p>Loading events...</p>}
          {eventsQuery.isError && <p role="alert">{errorMessage(eventsQuery.error, 'Could not load events.')}</p>}
          <ol style={{ marginTop: 0 }}>
            {(eventsQuery.data ?? []).map((event) => (
              <li key={event.eventId}>{new Date(event.occurredAt).toLocaleString()} · {event.eventType}
                {event.stepId ? ` · step ${event.stepId.slice(0, 8)}` : ''} · {event.actorId}</li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
