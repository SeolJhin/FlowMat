import { expect, test } from '@playwright/test'

test.skip(!process.env.REAL_API_E2E || process.env.FLOWMAT_NOTIFICATION_E2E_DISPOSABLE !== '1',
  'Needs the disposable notification project/viewer fixture')
test.use({ trace: 'off' })

test('the real policy editor saves versions and shows a viewer the server refusal', async ({ page, request }) => {
  test.setTimeout(60_000)
  const projectId = 'prj_notification_e2e'
  const login = await request.post('/api/auth/login', { data: { userIdOrEmail: 'demo-owner', password: 'demo1234' } })
  expect(login.ok()).toBe(true)
  const headers = { Authorization: `Bearer ${(await login.json()).data.accessToken}` }
  const api = async (method: string, path: string, data?: unknown) => {
    const reply = await request.fetch(`/api${path}`, { method, headers, data, timeout: 10_000 })
    const envelope = await reply.json()
    expect(reply.ok(), `${method} ${path}: ${envelope.message}`).toBe(true)
    return envelope.data
  }
  const workflow = await api('POST', '/workflows', { projectId, workflowName: `Policy API ${Date.now()}` })
  try {
    const process = await api('POST', '/processes', { workflowId: workflow.workflowId, processName: 'Policy node', posX: 200, posY: 160 })
    const path = `/processes/${process.processId}/execution-policy`
    const uiLogin = async (user: string) => {
      await page.goto('/')
      await page.getByRole('textbox', { name: 'demo-owner' }).fill(user)
      await page.getByRole('textbox', { name: '••••••••' }).fill('demo1234')
      await page.getByRole('button', { name: 'Log in', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible()
      await page.goto(`/projects/${projectId}/workflows/${workflow.workflowId}`)
      await page.locator('.react-flow__node').filter({ hasText: 'Policy node' }).click()
    }
    await uiLogin('demo-owner')
    const section = page.getByRole('region', { name: 'Execution policy', exact: true })
    await section.getByRole('button', { name: 'Edit policy', exact: true }).click()
    await section.getByLabel('Time limit (s)').fill('600')
    await section.getByLabel('Retries', { exact: true }).fill('2')
    await section.getByLabel('Retry delay (s)').fill('30')
    await section.getByLabel('Delay growth').selectOption('exponential')
    await section.getByLabel('Delay cap (s)').fill('300')
    await section.getByLabel('At most at once').fill('2')
    await section.getByRole('button', { name: 'Save policy', exact: true }).click()
    await expect(section.getByRole('status')).toContainText('Times out after 10 min')
    expect(await api('GET', path)).toMatchObject({
      timeoutSeconds: 600, retryLimit: 2, retryDelaySeconds: 30, retryBackoff: 'exponential',
      maxRetryDelaySeconds: 300, concurrencyLimit: 2, version: 1,
    })
    await section.getByRole('button', { name: 'Edit policy', exact: true }).click()
    await section.getByRole('button', { name: 'Use defaults', exact: true }).click()
    await expect(section.getByRole('status')).toHaveText('No time limit · 3 retries at once · no concurrency limit')
    const defaults = await api('GET', path)
    expect(defaults).toMatchObject({ timeoutSeconds: null, retryLimit: null, retryDelaySeconds: null, retryBackoff: null,
      maxRetryDelaySeconds: null, concurrencyLimit: null, version: 2 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Logout', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
    await uiLogin('notification-e2e-member')
    await expect(section.getByRole('status')).toHaveText('No time limit · 3 retries at once · no concurrency limit')
    await section.getByRole('button', { name: 'Edit policy', exact: true }).click()
    await section.getByLabel('Time limit (s)').fill('1200')
    const rejected = page.waitForResponse((reply) => reply.request().method() === 'PUT'
      && new URL(reply.url()).pathname === `/api${path}`)
    await section.getByRole('button', { name: 'Save policy', exact: true }).click()
    expect((await rejected).status()).toBe(403)
    await expect(section.getByRole('alert')).toBeVisible()
    expect(await api('GET', path)).toEqual(defaults)
  } finally {
    await api('DELETE', `/workflows/${workflow.workflowId}`)
  }
})
