import { expect, test } from '@playwright/test'

test.skip(!process.env.REAL_API_E2E, 'Needs the real backend and demo seed')

// A port's item is an optional binding (V42, docs/architecture/adr/ADR-003-resource-port-contract.md): a project with
// no catalog items can still describe a data flow. The spec makes its own empty project and deletes it afterwards.
test('a project without items can add an item-less data port', async ({ page }) => {
  test.setTimeout(60_000)
  page.setDefaultTimeout(10_000)
  await page.goto('/')
  await page.locator('input').nth(0).fill('demo-owner')
  await page.locator('input').nth(1).fill('demo1234')
  const loginResponse = page.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/auth/login')
  await page.getByRole('button', { name: 'Log in' }).click()
  const login = await loginResponse
  expect(login.ok()).toBe(true)
  const token = (await login.json()).data.accessToken as string
  const headers = { Authorization: `Bearer ${token}` }
  await page.waitForLoadState('networkidle')

  async function create(path: string, data: Record<string, unknown>): Promise<Record<string, string>> {
    const response = await page.request.post(`/api${path}`, { headers, data })
    expect(response.ok(), `${path}: ${response.status()}`).toBe(true)
    return (await response.json()).data as Record<string, string>
  }
  const field = (label: string) =>
    page.locator('label').filter({ has: page.locator('span', { hasText: new RegExp(`^${label}$`) }) })

  const project = await create('/projects', { projectName: `Data ports E2E ${Date.now()}`, ownerId: 'demo-owner' })
  const projectId = project.projectId
  try {
    const workflow = await create('/workflows', { projectId, workflowName: 'CSV import' })
    const parse = await create('/processes', {
      workflowId: workflow.workflowId, processName: 'Parse CSV', posX: 200, posY: 180,
    })

    await page.goto(`/projects/${projectId}/workflows/${workflow.workflowId}`)
    await page.locator(`.react-flow__node[data-id="${parse.processId}"]`).click({ position: { x: 24, y: 18 } })
    await page.getByRole('button', { name: 'Add Output' }).click()
    await expect(page.getByText('This project has no catalog items')).toBeVisible()
    await expect(field('Item').locator('select')).toHaveValue('')
    await field('Port Name').locator('input').fill('Parsed rows')
    await field('Resource Type').locator('input').fill('data')
    await field('Unit').locator('input').fill('ea')
    await page.getByRole('button', { name: 'Create Port' }).click()
    await expect(page.locator('.inspector__port-name', { hasText: 'Parsed rows' })).toBeVisible()

    const ports = await page.request.get(`/api/process-ios?processId=${parse.processId}`, { headers })
    expect(ports.ok()).toBe(true)
    const [created] = (await ports.json()).data as Array<Record<string, unknown>>
    expect(created).toMatchObject({ ioName: 'Parsed rows', resourceType: 'data', unit: 'ea', itemId: null })
  } finally {
    await page.request.delete(`/api/projects/${projectId}`, { headers })
  }
})
