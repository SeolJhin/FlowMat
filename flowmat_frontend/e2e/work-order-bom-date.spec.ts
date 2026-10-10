import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

test.use({ timezoneId: 'Asia/Seoul', locale: 'en-US' })
for (const scenario of ['automatic', 'explicit-error'] as const) {
  test(`work order planned BOM: ${scenario}`, async ({ page }) => {
    const projectId = 'prj-dated-order'
    const requests: Record<string, unknown>[] = [], orders: Record<string, unknown>[] = []
    const boms = [{ bomId: 'bom-january', projectId, targetItemId: 'item-dated', bomName: 'Dated formula',
      bomVersion: 1, bomStatus: 'approved', baseQuantity: 1, baseUnit: 'ea', effectiveFrom: '2030-01-01',
      effectiveTo: '2030-01-31', lines: [] }, { bomId: 'bom-february', projectId, targetItemId: 'item-dated',
      bomName: 'Dated formula', bomVersion: 2, bomStatus: 'approved', baseQuantity: 1, baseUnit: 'ea',
      effectiveFrom: '2030-02-01', effectiveTo: '2030-02-28', lines: [] }]
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request(), { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (pathname === '/api/project-members') return ok(route, [{ projectMemberId: 'pm', projectId,
        userId: 'demo-owner', projectRole: 'owner', memberStatus: 'active' }])
      if (pathname === `/api/projects/${projectId}/time-zone`) return ok(route, { projectId, timeZone: 'Asia/Seoul', version: 0 })
      if (pathname === '/api/items') return ok(route, [{ itemId: 'item-dated', projectId, itemCode: 'DATED',
        itemName: 'Dated product', itemStatus: 'active', itemType: 'product', unitId: 'unit_ea' }])
      if (pathname === '/api/boms') return ok(route, boms)
      if (pathname === '/api/work-orders') {
        if (request.method() === 'GET') return ok(route, orders)
        const body = request.postDataJSON() as Record<string, unknown>; requests.push(body)
        if (scenario === 'explicit-error') return route.fulfill({ status: 400, contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'bomId does not cover plannedStartAt in the project time zone.', data: null }) })
        const order = { ...body, workOrderId: 'wo-dated', workOrderNumber: 'WO-DATED', workOrderStatus: 'draft',
          bomId: 'bom-february', targetQuantity: 1, producedQuantity: 0, runCount: 0, actualStartAt: null,
          actualEndAt: null, plannedEndAt: null, instruction: null, assignedTo: null }
        orders.push(order); return ok(route, order)
      }
      if (request.method() !== 'GET') throw new Error(`Unexpected write ${request.method()} ${pathname}`)
      return ok(route, [])
    })
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/runs?view=work-orders`)
    await page.getByLabel('Title *', { exact: true }).fill('Dated work order')
    await page.getByLabel('Target item', { exact: true }).selectOption('item-dated')
    await page.getByLabel('Planned start', { exact: true }).fill('2030-02-01T09:00')
    const bom = page.getByLabel('BOM', { exact: true })
    if (scenario === 'automatic') {
      await expect(bom).toHaveValue('')
      await expect(bom.locator('option:checked')).toHaveText('Select by planned start')
      await expect(page.getByText('The server selects the approved revision for the planned start in the project time zone.')).toBeVisible()
    } else await bom.selectOption('bom-january')
    await page.getByRole('button', { name: 'Create draft', exact: true }).click()
    await expect.poll(() => requests.length).toBe(1)
    expect(requests[0].plannedStartAt).toBe('2030-02-01T00:00:00.000Z')
    if (scenario === 'automatic') {
      expect(requests[0].bomId).toBeUndefined()
      await expect(page.getByRole('row', { name: /Dated work order/ })).toContainText('BOM v2')
    } else {
      expect(requests[0].bomId).toBe('bom-january')
      await expect(page.getByText('bomId does not cover plannedStartAt in the project time zone.', { exact: true })).toBeVisible()
      await expect(page.getByLabel('Title *', { exact: true })).toHaveValue('Dated work order')
    }
  })
}
