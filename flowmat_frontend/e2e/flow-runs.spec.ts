import { expect, test, type Route } from '@playwright/test'

type Step = { stepId: string; nodeId: string; sequenceNo: number; status: string; errorCode: string | null }
type Attempt = { attemptId: string; attemptNo: number; status: string; errorCode: string | null }

test('manual Flow Run records a failed attempt, retry, completion, and events', async ({ page }) => {
  const steps: Step[] = []
  const attempts: Attempt[] = []
  const events: { eventId: string; eventType: string; stepId: string | null; occurredAt: string; actorId: string }[] = []
  let run: Record<string, unknown> | null = null
  let nextEvent = 0
  const addEvent = (eventType: string, stepId: string | null = null) => {
    events.push({ eventId: `event-${++nextEvent}`, eventType, stepId,
      occurredAt: new Date(Date.now() + nextEvent).toISOString(), actorId: 'demo-owner' })
  }
  const ok = async (route: Route, data: unknown) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data, message: null }) })
  }

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const method = request.method()
    if (pathname === '/api/auth/csrf') return route.fulfill({
      status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'XSRF-TOKEN=test-csrf; Path=/' },
      body: JSON.stringify({ success: true, data: 'test-csrf', message: null }),
    })
    if (pathname === '/api/auth/login') return route.fulfill({
      status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'flowmat_rt=test-refresh; HttpOnly; Path=/api/auth' },
      body: JSON.stringify({ success: true, data: {
        accessToken: 'eyJ.fake.access', refreshToken: null, deviceId: 'device-1', additionalInfoRequired: false,
      }, message: null }),
    })
    if (pathname === '/api/auth/refresh') return ok(route, { accessToken: 'eyJ.fake.access', refreshToken: null })
    if (pathname === '/api/users/me') return ok(route, { userId: 'demo-owner', userName: 'Demo Owner' })
    if (pathname === '/api/users/me/permissions') return ok(route, { canManageUsers: false })
    if (pathname === '/api/projects') return ok(route, [])
    if (pathname === '/api/workflows' && method === 'GET') {
      return ok(route, [{ workflowId: 'wf-e2e', projectId: 'prj-e2e', workflowName: 'Flow test' }])
    }
    if (pathname === '/api/workflows/wf-e2e/revisions' && method === 'GET') {
      return ok(route, [{ workflowRevisionId: 'rev-e2e', workflowId: 'wf-e2e',
        revisionNo: 1, status: 'published', publishedAt: new Date().toISOString() }])
    }
    if (pathname === '/api/workflows/wf-e2e/revisions/rev-e2e') {
      return ok(route, { workflowRevisionId: 'rev-e2e', revisionNo: 1, status: 'published',
        snapshot: { processes: [{ processId: 'node-mix', processName: 'Mix' }] } })
    }
    if (pathname === '/api/flow-runs' && method === 'GET') return ok(route, run ? [run] : [])
    if (pathname === '/api/flow-runs' && method === 'POST') {
      run = { flowRunId: 'run-e2e', workflowRevisionId: 'rev-e2e', productionRunId: null,
        runType: 'test', status: 'running', startedAt: new Date().toISOString(), endedAt: null }
      addEvent('run_started')
      return ok(route, run)
    }
    if (pathname === '/api/flow-runs/run-e2e/steps' && method === 'GET') return ok(route, steps)
    if (pathname === '/api/flow-runs/run-e2e/steps' && method === 'POST') {
      steps.push({ stepId: 'step-e2e', nodeId: 'node-mix', sequenceNo: 1, status: 'planned', errorCode: null })
      addEvent('step_created', 'step-e2e')
      return ok(route, steps[0])
    }
    if (pathname === '/api/flow-runs/run-e2e/steps/step-e2e/start') {
      steps[0].status = 'running'
      attempts.push({ attemptId: 'attempt-1', attemptNo: 1, status: 'running', errorCode: null })
      addEvent('step_started', 'step-e2e')
      return ok(route, steps[0])
    }
    if (pathname === '/api/flow-runs/run-e2e/steps/step-e2e/fail') {
      steps[0].status = 'failed'
      steps[0].errorCode = 'MANUAL_FAILURE'
      attempts[0].status = 'failed'
      attempts[0].errorCode = 'MANUAL_FAILURE'
      addEvent('step_failed', 'step-e2e')
      return ok(route, steps[0])
    }
    if (pathname === '/api/flow-runs/run-e2e/steps/step-e2e/retry') {
      steps[0].status = 'running'
      steps[0].errorCode = null
      attempts.push({ attemptId: 'attempt-2', attemptNo: 2, status: 'running', errorCode: null })
      addEvent('step_retried', 'step-e2e')
      return ok(route, steps[0])
    }
    if (pathname === '/api/flow-runs/run-e2e/steps/step-e2e/complete') {
      steps[0].status = 'completed'
      attempts[1].status = 'completed'
      addEvent('step_completed', 'step-e2e')
      return ok(route, steps[0])
    }
    if (pathname === '/api/flow-runs/run-e2e/steps/step-e2e/attempts') return ok(route, attempts)
    if (pathname === '/api/flow-runs/run-e2e/events') return ok(route, events)
    if (pathname === '/api/flow-runs/run-e2e/finish') {
      run = { ...run, status: 'finished', endedAt: new Date().toISOString() }
      addEvent('run_finished')
      return ok(route, run)
    }
    if (method === 'GET' && ['/api/items', '/api/production-runs', '/api/work-orders', '/api/boms']
      .includes(pathname)) return ok(route, [])
    await route.fulfill({ status: 404, contentType: 'application/json',
      body: JSON.stringify({ success: false, data: null, message: `Unmocked ${method} ${pathname}` }) })
  })

  await page.goto('/')
  await page.locator('input').nth(0).fill('demo-owner')
  await page.locator('input[type="password"]').fill('demo1234')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.goto('/projects/prj-e2e/runs?view=flow-runs')

  await expect(page.getByRole('tab', { name: 'Flow executions' })).toBeVisible()
  await page.getByRole('button', { name: 'Start Flow Run' }).click()
  await expect(page.getByText('Status: running')).toBeVisible()
  await page.getByRole('button', { name: 'Add planned step' }).click()
  await expect(page.getByText('#1 Mix')).toBeVisible()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Fail', exact: true }).click()
  await expect(page.getByText('MANUAL_FAILURE', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retry' }).click()
  await page.getByRole('button', { name: 'Complete' }).click()
  await page.getByRole('button', { name: 'Show attempts' }).click()
  await expect(page.getByText('Attempt 1: failed (MANUAL_FAILURE)')).toBeVisible()
  await expect(page.getByText('Attempt 2: completed')).toBeVisible()
  await page.getByRole('button', { name: 'Finish Flow Run' }).click()
  await expect(page.getByText('Status: finished')).toBeVisible()
  await expect(page.getByText(/run_finished/)).toBeVisible()
})
