import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * A graph Flow Run under a node execution policy, against a mocked API (docs/domain/flow-run-execution-policy.md EP10):
 * a step waiting out its retry delay says so, and a running attempt shows when it times out.
 */
test('a step waiting to retry and a running attempt with a time limit are shown', async ({ page }) => {
  const run = { flowRunId: 'run-wait', projectId: 'prj-wait', workflowId: 'wf-wait', workflowRevisionId: 'rev-wait',
    productionRunId: null, runType: 'test', executionMode: 'graph', status: 'running', inputPayload: {},
    outputPayload: null, startedAt: '2030-01-01T00:00:00Z', endedAt: null, requestedBy: 'demo-owner' }
  const step = (stepId: string, nodeId: string, sequenceNo: number, status: string, extra: Record<string, unknown> = {}) => ({
    stepId, flowRunId: 'run-wait', nodeId, sourceConnectionId: sequenceNo > 1 ? 'conn-wait' : null,
    sourceStepId: sequenceNo > 1 ? 'step-root' : null, status, sequenceNo, scheduledAt: null, startedAt: null, endedAt: null,
    inputSnapshot: {}, outputSnapshot: null, errorCode: null, errorMessage: null, ...extra })
  const steps = [
    step('step-root', 'node-root', 1, 'completed'),
    step('step-wait', 'node-target', 2, 'planned', { scheduledAt: '2030-01-01T00:10:00Z', errorCode: 'BUSY',
      errorMessage: 'Line busy' }),
    step('step-live', 'node-target', 3, 'running'),
  ]
  const attempts: Record<string, unknown[]> = {
    'step-wait': [{ attemptId: 'a-1', stepId: 'step-wait', attemptNo: 1, status: 'failed', startedAt: '2030-01-01T00:00:00Z',
      endedAt: '2030-01-01T00:09:00Z', retryAt: '2030-01-01T00:10:00Z', errorCode: 'BUSY', errorMessage: 'Line busy',
      timeoutAt: null }],
    'step-live': [{ attemptId: 'a-2', stepId: 'step-live', attemptNo: 1, status: 'running', startedAt: '2030-01-01T00:00:00Z',
      endedAt: null, retryAt: null, errorCode: null, errorMessage: null, timeoutAt: '2030-01-01T00:00:30Z' }],
  }

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() !== 'GET') throw new Error(`Unexpected write ${request.method()} ${pathname}`)
    if (pathname === '/api/workflows') return ok(route, [{ workflowId: 'wf-wait', projectId: 'prj-wait', workflowName: 'Retry flow' }])
    if (pathname === '/api/workflows/wf-wait/revisions') {
      return ok(route, [{ workflowRevisionId: 'rev-wait', workflowId: 'wf-wait', revisionNo: 1, status: 'published',
        publishedAt: '2030-01-01T00:00:00Z' }])
    }
    if (pathname === '/api/workflows/wf-wait/revisions/rev-wait') {
      return ok(route, { workflowRevisionId: 'rev-wait', revisionNo: 1, status: 'published', snapshot: {
        processes: [{ processId: 'node-root', processName: 'Root' }, { processId: 'node-target', processName: 'Target' }],
        connections: [{ connectionId: 'conn-wait', fromProcessId: 'node-root', toProcessId: 'node-target',
          failurePolicy: 'retry', label: 'Root to target' }],
        nodePolicies: [{ processId: 'node-target', retryDelaySeconds: 60, timeoutSeconds: 30 }] } })
    }
    if (pathname === '/api/flow-runs') return ok(route, [run])
    if (pathname === '/api/flow-runs/run-wait') return ok(route, run)
    if (pathname === '/api/flow-runs/run-wait/steps') return ok(route, steps)
    const lineagePath = pathname.match(/^\/api\/flow-runs\/run-wait\/steps\/([^/]+)\/lineage$/)
    if (lineagePath) {
      return ok(route, { step: steps.find((one) => one.stepId === lineagePath[1]), ancestors: [steps[0]], descendants: [] })
    }
    const attemptPath = pathname.match(/^\/api\/flow-runs\/run-wait\/steps\/([^/]+)\/attempts$/)
    if (attemptPath) return ok(route, attempts[attemptPath[1]] ?? [])
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-wait/runs?view=flow-runs')
  await expect(page.getByText('#2 Target')).toBeVisible()
  await expect(page.getByText('waiting to retry')).toHaveCount(1)
  await expect(page.getByText('BUSY', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Show attempts' }).nth(1).click()
  await expect(page.getByText('Attempt 1: failed (BUSY)')).toBeVisible()
  await expect(page.getByText(/Retry scheduled:/)).toBeVisible()
  await expect(page.getByText(/Times out:/)).toHaveCount(0)

  await page.getByRole('button', { name: 'Hide attempts' }).click()
  await page.getByRole('button', { name: 'Show attempts' }).nth(2).click()
  await expect(page.getByText('Attempt 1: running')).toBeVisible()
  await expect(page.getByText(/Times out:/)).toBeVisible()
})
