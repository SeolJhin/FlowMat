import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * A node's execution policy edited in the workflow editor (docs/domain/flow-run-execution-policy.md EP13) against a mocked
 * API: the inspector says the policy in a line, checks the form before sending, saves with the loaded version and says
 * that new runs follow it once a revision is published.
 */
test('the node inspector edits the execution policy', async ({ page }) => {
  const workflow = { workflowId: 'wf-pol', projectId: 'prj-e2e', workflowName: 'Pipeline', workflowDesc: null, workflowType: 'standard',
    workflowStatus: 'draft' }
  const process = { processId: 'proc-mix', projectId: 'prj-e2e', workflowId: 'wf-pol', processName: 'Mixer', processType: 'process',
    nodeType: 'process', processStatus: 'ready', colorScheme: 'slate', posX: 200, posY: 160, width: 180, height: 80, processDesc: null,
    version: 1, versionNonce: 1 }
  let policy = { processId: 'proc-mix', timeoutSeconds: null as number | null, retryLimit: null as number | null,
    retryDelaySeconds: null as number | null, retryBackoff: null as string | null, maxRetryDelaySeconds: null as number | null,
    concurrencyLimit: null as number | null, version: 0 }
  const sent: unknown[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'PUT' && pathname === '/api/processes/proc-mix/execution-policy') {
      const body = request.postDataJSON() as typeof policy & { expectedVersion: number }
      sent.push(body)
      const { expectedVersion, ...values } = body
      policy = { ...values, processId: 'proc-mix', version: expectedVersion + 1 }
      return ok(route, policy)
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/workflows/wf-pol/canvas') {
      return ok(route, { workflow, graphSeq: 0, processes: [process], processIos: [], connections: [], annotations: [],
        currentUserRole: 'owner' })
    }
    if (pathname === '/api/workflows/wf-pol/editor-document') {
      return ok(route, { schemaVersion: 1, camera: { x: 0, y: 0, z: 1 }, nextElementSeq: 1, version: 0, versionNonce: 0, elements: [] })
    }
    if (pathname === '/api/processes/proc-mix/execution-policy') return ok(route, policy)
    if (pathname === '/api/workflows') return ok(route, [workflow])
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/workflows/wf-pol')
  await page.locator('.react-flow__node').filter({ hasText: 'Mixer' }).click({ timeout: 15_000 })
  const section = page.getByRole('region', { name: 'Execution policy' })
  await expect(section.getByRole('status')).toHaveText('No time limit · 3 retries at once · no concurrency limit')

  await section.getByRole('button', { name: 'Edit policy' }).click()
  const form = section.getByRole('form', { name: 'Edit execution policy' })
  await form.getByLabel('Time limit (s)').fill('0')
  await form.getByRole('button', { name: 'Save policy' }).click()
  await expect(section.getByRole('alert')).toHaveText('The time limit is a whole number between 1 second and 7 days (604800 s).')
  expect(sent).toHaveLength(0)

  await form.getByLabel('Time limit (s)').fill('600')
  await form.getByLabel('Retry delay (s)').fill('30')
  await form.getByLabel('Delay growth').selectOption('exponential')
  await form.getByLabel('Delay cap (s)').fill('300')
  await form.getByLabel('At most at once').fill('2')
  await form.getByRole('button', { name: 'Save policy' }).click()
  await expect(section.getByRole('status')).toHaveText('Times out after 10 min · 3 retries, 30 s apart, doubling up to 5 min · at most 2 at once')
  await expect(section).toContainText('New runs follow it once a revision is published.')
  expect(sent[0]).toEqual({ timeoutSeconds: 600, retryLimit: null, retryDelaySeconds: 30, retryBackoff: 'exponential',
    maxRetryDelaySeconds: 300, concurrencyLimit: 2, expectedVersion: 0 })

  // Back to the default behavior, from the version just saved.
  await section.getByRole('button', { name: 'Edit policy' }).click()
  await form.getByRole('button', { name: 'Use defaults' }).click()
  await expect(section.getByRole('status')).toHaveText('No time limit · 3 retries at once · no concurrency limit')
  expect(sent[1]).toEqual({ timeoutSeconds: null, retryLimit: null, retryDelaySeconds: null, retryBackoff: null,
    maxRetryDelaySeconds: null, concurrencyLimit: null, expectedVersion: 1 })
})
