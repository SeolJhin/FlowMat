import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

test.skip(!process.env.REAL_API_E2E, 'Needs the real backend and demo seed')

/**
 * Putaway and pick tasks through the real UI (docs/domain/warehouse-task.md): a planned putaway moves nothing until it is
 * done, and a pick list for given items plans picks from free stock and says what is short. Codes get a fresh suffix;
 * tasks still open at the end are cancelled.
 */
const PROJECT = 'prj_demo_main'
const suffix = Date.now().toString(36).toUpperCase()
const ITEM = `WT-E2E-${suffix}`
const DOCK = `DOCK-${suffix}`
const SHELF = `SHELF-${suffix}`
const LINE = `LINE-${suffix}`

async function api(request: APIRequestContext) {
  const login = await request.post('/api/auth/login', { data: { userIdOrEmail: 'demo-owner', password: 'demo1234' } })
  expect(login.ok(), await login.text()).toBeTruthy()
  const headers = { Authorization: `Bearer ${(await login.json()).data.accessToken}` }
  return async (method: string, path: string, data?: unknown) => {
    const response = await request.fetch('/api' + path, { method, headers, data })
    const body = await response.json()
    expect(response.ok(), `${method} ${path}: ${body.message}`).toBeTruthy()
    return body.data
  }
}

async function login(page: Page) {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'demo-owner' }).fill('demo-owner')
  await page.getByRole('textbox', { name: '••••••••' }).fill('demo1234')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('안녕하세요, Demo Owner님')).toBeVisible({ timeout: 15_000 })
  await page.waitForLoadState('networkidle')
}

test('a putaway moves stock only when done, and a pick list plans from free stock', async ({ page, request }) => {
  const call = await api(request)
  const item = await call('POST', '/items', {
    projectId: PROJECT, itemCode: ITEM, itemName: `task e2e ${suffix}`, itemType: 'material', unitId: 'unit_ea',
  })
  const stock = await call('POST', '/inventories', { projectId: PROJECT, itemId: item.itemId, quantity: 10, location: DOCK })
  try {
    await login(page)
    await page.goto(`/projects/${PROJECT}/inventory?tab=tasks`)

    const putaway = page.getByRole('form', { name: 'New putaway' })
    await putaway.getByLabel('Stock record').selectOption({ label: `${ITEM} · ${DOCK} · 10 free` }, { timeout: 15_000 })
    await putaway.getByLabel('Quantity').fill('6')
    await putaway.getByLabel('To', { exact: true }).fill(SHELF)
    await putaway.getByRole('button', { name: 'Plan putaway' }).click()

    const tasks = page.getByRole('table', { name: 'Task list' })
    const row = tasks.getByRole('row', { name: new RegExp(`${ITEM}.*${SHELF}`) })
    await expect(row).toContainText('open')
    expect((await call('GET', `/inventories/${stock.inventoryId}`)).quantity).toBe(10)

    await row.getByRole('button', { name: 'Done' }).click()
    await expect(row).toHaveCount(0)
    expect((await call('GET', `/inventories/${stock.inventoryId}`)).quantity).toBe(4)
    await page.getByLabel('Task status').selectOption('done')
    await expect(tasks.getByRole('row', { name: new RegExp(`${ITEM}.*${SHELF}`) })).toContainText('done')

    // 12 needed at the line: 4 free at the dock and 6 on the shelf can be planned, 2 are short.
    const pick = page.getByRole('form', { name: 'Pick list' })
    await pick.getByRole('radio', { name: 'Items' }).check()
    await pick.getByLabel('Item 1').selectOption({ label: `${ITEM} · task e2e ${suffix}` })
    await pick.getByLabel('Quantity 1').fill('12')
    await pick.getByLabel('Pick to').fill(LINE)
    await pick.getByRole('button', { name: 'Plan picks' }).click()
    await expect(pick.getByRole('status')).toContainText('2 picks planned.')
    await expect(pick.getByRole('status')).toContainText(`Short: ${ITEM} 2`)
    await page.getByLabel('Task status').selectOption('open')
    await expect(tasks.getByRole('row', { name: new RegExp(`${ITEM}.*${LINE}`) })).toHaveCount(2)
  } finally {
    const open = await call('GET', `/warehouse-tasks?projectId=${PROJECT}&status=open`)
    for (const task of open.filter((one: { itemId: string }) => one.itemId === item.itemId)) {
      await call('POST', `/warehouse-tasks/${task.taskId}/cancel`, { reason: 'e2e cleanup' })
    }
  }
})
