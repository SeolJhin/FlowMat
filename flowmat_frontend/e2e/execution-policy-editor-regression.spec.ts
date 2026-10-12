import { expect, test, type Page } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

async function policyCanvas(page: Page) {
  const policy = (processId: string, timeoutSeconds: number | null = null) => ({
    processId, timeoutSeconds, retryLimit: null, retryDelaySeconds: null, retryBackoff: null,
    maxRetryDelaySeconds: null, concurrencyLimit: null, version: 0,
  })
  const policies = new Map([['proc-a', policy('proc-a')], ['proc-b', policy('proc-b', 120)]])
  const sent: { processId: string; expectedVersion: number; timeoutSeconds: number | null }[] = []
  const workflow = { workflowId: 'wf-policy-race', projectId: 'prj-e2e', workflowName: 'Policy race', workflowStatus: 'draft' }
  const nodes = ['a', 'b'].map((letter, index) => ({
    processId: `proc-${letter}`, projectId: 'prj-e2e', workflowId: workflow.workflowId, processName: `Node ${letter.toUpperCase()}`,
    processType: 'process', nodeType: 'process', processStatus: 'ready', colorScheme: 'slate',
    posX: 200 + index * 300, posY: 160, width: 180, height: 80, version: 1, versionNonce: 1,
  }))
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    const match = /^\/api\/processes\/(proc-[ab])\/execution-policy$/.exec(pathname)
    if (match) {
      const current = policies.get(match[1])!
      if (request.method() === 'GET') return ok(route, current)
      if (request.method() === 'PUT') {
        const body = request.postDataJSON() as { expectedVersion: number; timeoutSeconds: number | null }
        sent.push({ processId: match[1], ...body })
        if (body.expectedVersion !== current.version) {
          return route.fulfill({ status: 409, contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Execution policy changed. Reload before saving.', data: null }) })
        }
        const { expectedVersion, ...values } = body
        const saved = { ...current, ...values, version: expectedVersion + 1 }
        policies.set(match[1], saved)
        return ok(route, saved)
      }
    }
    if (request.method() === 'GET') {
      if (pathname === `/api/workflows/${workflow.workflowId}/canvas`) {
        return ok(route, { workflow, graphSeq: 0, processes: nodes, processIos: [], connections: [], annotations: [], currentUserRole: 'owner' })
      }
      if (pathname === `/api/workflows/${workflow.workflowId}/editor-document`) {
        return ok(route, { schemaVersion: 1, camera: { x: 0, y: 0, z: 1 }, nextElementSeq: 1, version: 0, versionNonce: 0, elements: [] })
      }
      if (pathname === '/api/workflows') return ok(route, [workflow])
      return ok(route, [])
    }
    return route.fulfill({ status: 404, contentType: 'application/json',
      body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
  })
  await mockedLogin(page)
  await page.goto(`/projects/prj-e2e/workflows/${workflow.workflowId}`)
  return { policies, sent }
}

for (const action of ['Save policy', 'Use defaults']) {
test(`background policy refresh cannot upgrade an open edit when clicking ${action}`, async ({ page }) => {
  await page.clock.install()
  const { policies, sent } = await policyCanvas(page)
  await page.locator('.react-flow__node').filter({ hasText: 'Node A' }).click()
  const section = page.getByRole('region', { name: 'Execution policy', exact: true })
  await section.getByRole('button', { name: 'Edit policy', exact: true }).click()
  await section.getByLabel('Time limit (s)').fill('600')
  policies.set('proc-a', { ...policies.get('proc-a')!, timeoutSeconds: 900, version: 1 })
  await page.clock.fastForward(31_000)
  const refreshed = page.waitForResponse((reply) => reply.request().method() === 'GET'
    && new URL(reply.url()).pathname === '/api/processes/proc-a/execution-policy')
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
  await refreshed
  await expect(section.getByLabel('Time limit (s)')).toHaveValue('600')
  await section.getByRole('button', { name: action, exact: true }).click()
  await expect.poll(() => sent.length).toBe(1)
  expect(sent[0]).toMatchObject({ processId: 'proc-a', expectedVersion: 0, timeoutSeconds: action === 'Save policy' ? 600 : null })
  await expect(section.getByRole('alert')).toContainText('Execution policy changed.')
  expect(policies.get('proc-a')).toMatchObject({ timeoutSeconds: 900, version: 1 })

  // Explicitly reopening the form picks up the new version and lets the person edit it.
  await section.getByRole('button', { name: 'Cancel', exact: true }).click()
  await section.getByRole('button', { name: 'Edit policy', exact: true }).click()
  await expect(section.getByLabel('Time limit (s)')).toHaveValue('900')
  await section.getByLabel('Time limit (s)').fill('1200')
  await section.getByRole('button', { name: 'Save policy', exact: true }).click()
  await expect(section.getByRole('status')).toContainText('Times out after 20 min')
  expect(sent[1]).toMatchObject({ expectedVersion: 1, timeoutSeconds: 1200 })
  expect(policies.get('proc-a')).toMatchObject({ timeoutSeconds: 1200, version: 2 })
})
}

test('switching nodes discards the first nodes policy form', async ({ page }) => {
  const { policies, sent } = await policyCanvas(page)
  await page.locator('.react-flow__node').filter({ hasText: 'Node A' }).click()
  const section = page.getByRole('region', { name: 'Execution policy', exact: true })
  await section.getByRole('button', { name: 'Edit policy', exact: true }).click()
  await section.getByLabel('Time limit (s)').fill('600')
  await page.locator('.react-flow__node').filter({ hasText: 'Node B' }).click()
  await expect(section.getByRole('form', { name: 'Edit execution policy' })).toHaveCount(0)
  await expect(section.getByRole('status')).toContainText('Times out after 2 min')
  await section.getByRole('button', { name: 'Edit policy', exact: true }).click()
  await expect(section.getByLabel('Time limit (s)')).toHaveValue('120')
  expect(sent).toEqual([])
  expect(policies.get('proc-a')).toMatchObject({ timeoutSeconds: null, version: 0 })
})
