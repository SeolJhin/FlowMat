import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

test.skip(!process.env.REAL_API_E2E, 'Needs the real backend and demo seed')

/**
 * The storage location list through the real UI and API (docs/domain/storage-location.md). Uses its own project: once a
 * project lists a place, free-text stock locations stop working there, which would break other specs in the demo
 * project. The project is deleted at the end.
 */
const suffix = Date.now().toString(36).toUpperCase()
const LOOSE = `loose-${suffix}`
const WAREHOUSE = `WH-${suffix}`
const BIN = `B-${suffix}`

async function api(request: APIRequestContext) {
  const login = await request.post('/api/auth/login', { data: { userIdOrEmail: 'demo-owner', password: 'demo1234' } })
  expect(login.ok(), await login.text()).toBeTruthy()
  const headers = { Authorization: `Bearer ${(await login.json()).data.accessToken}` }
  return async (method: string, path: string, data?: unknown, expectOk = true) => {
    const response = await request.fetch('/api' + path, { method, headers, data })
    const body = await response.json()
    if (expectOk) expect(response.ok(), `${method} ${path}: ${body.message}`).toBeTruthy()
    return { status: response.status(), data: body.data, message: body.message as string }
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

test('a project lists its places and new stock only goes to listed ones', async ({ page, request }) => {
  const call = await api(request)
  const project = (await call('POST', '/projects', { projectName: `Locations E2E ${suffix}`, ownerId: 'demo-owner' })).data.projectId
  try {
    const item = (await call('POST', '/items', {
      projectId: project, itemCode: `LOC-${suffix}`, itemName: 'location e2e item', itemType: 'material', unitId: 'unit_kg',
    })).data
    await call('POST', '/inventories', { projectId: project, itemId: item.itemId, quantity: 5, location: LOOSE })

    await login(page)
    await page.goto(`/projects/${project}/inventory?tab=locations`)
    await expect(page.getByText('No places are listed')).toBeVisible({ timeout: 15_000 })

    // The place the stock already uses is offered, and listing it keeps that stock at a listed place.
    await expect(page.getByRole('status').filter({ hasText: LOOSE })).toBeVisible()
    await page.getByRole('button', { name: 'Add them as locations' }).click()
    const table = page.getByRole('table', { name: 'Storage locations' })
    await expect(table.getByRole('row', { name: new RegExp(LOOSE) })).toContainText('1 record, 1 item')

    const form = page.getByRole('form', { name: 'Add location' })
    await form.getByLabel('Code').fill(WAREHOUSE)
    await form.getByLabel('Kind').selectOption('warehouse')
    await form.getByRole('button', { name: 'Save' }).click()
    await expect(table.getByRole('row', { name: new RegExp(WAREHOUSE) })).toBeVisible()

    await form.getByLabel('Code').fill(BIN)
    await form.getByLabel('Kind').selectOption('bin')
    await form.getByLabel('Inside').selectOption({ label: WAREHOUSE })
    await form.getByRole('button', { name: 'Save' }).click()
    await expect(table.getByRole('row', { name: new RegExp(BIN) })).toContainText(`${WAREHOUSE} / ${BIN}`)

    // A place holding stock cannot be switched off.
    await table.getByRole('row', { name: new RegExp(LOOSE) }).getByRole('button', { name: 'Deactivate' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'still holds stock' })).toBeVisible()

    // New stock only at listed places, stored as spelled in the list; the stock form suggests them.
    const refused = await call('POST', '/inventories', { projectId: project, itemId: item.itemId, quantity: 1, location: 'nowhere' }, false)
    expect(refused.status).toBe(400)
    expect(refused.message).toContain("not in this project's location list")
    const placed = await call('POST', '/inventories', { projectId: project, itemId: item.itemId, quantity: 1, location: BIN.toLowerCase() })
    expect(placed.data.location).toBe(BIN)
    await page.getByRole('tab', { name: 'Stock' }).click()
    await expect(page.locator(`#storage-location-options option[value="${WAREHOUSE}"]`)).toHaveCount(1)
    await expect(page.locator(`#storage-location-options option[value="${BIN}"]`)).toHaveCount(1)

    // A place with places inside cannot be deleted.
    await page.getByRole('tab', { name: 'Locations' }).click()
    page.once('dialog', (dialog) => void dialog.accept())
    await table.getByRole('row', { name: new RegExp(WAREHOUSE) }).first().getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Delete or move the places inside' })).toBeVisible()
  } finally {
    await call('DELETE', `/projects/${project}`, undefined, false)
  }
})
