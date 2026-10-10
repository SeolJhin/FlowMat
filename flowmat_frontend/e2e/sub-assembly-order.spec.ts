import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

// Planned dates are shown in the planning zone (Asia/Seoul by default).
test.use({ timezoneId: 'Asia/Seoul' })

/**
 * A short sub-assembly in work order readiness (docs/domain/multi-level-bom.md) against a mocked API, so no BOM is written
 * to a real database: the cake order is short of 17 sponges, an approved order already makes 5, and "Make" fills in a
 * new work order for the other 12, due when the cake order starts.
 */
test('a short sub-assembly fills in a work order for what open orders do not make', async ({ page }) => {
  const item = (itemId: string, itemCode: string, unitId: string) => ({
    itemId, projectId: 'prj-e2e', itemCode, itemName: itemCode.toLowerCase(), itemType: 'material', resourceCategory: null,
    resourceType: null, unitId, itemStatus: 'active', lotManageYn: 'N', unitCost: null,
  })
  const items = [item('cake', 'CAKE', 'unit_ea'), item('sponge', 'SPONGE', 'unit_ea'), item('flour', 'FLOUR', 'unit_kg')]
  const line = (bomLineId: string, childItemId: string, quantity: number, unit: string) => ({
    bomLineId, childItemId, quantity, unit, scrapRate: null, optionalYn: 'N', substituteGroup: null, sortOrder: 1, note: null,
  })
  const bom = (bomId: string, targetItemId: string, bomName: string, lines: unknown[]) => ({
    bomId, projectId: 'prj-e2e', targetItemId, bomName, bomVersion: 1, baseQuantity: 1, baseUnit: 'ea', bomStatus: 'approved',
    approvedBy: 'demo-owner', approvedAt: '2026-09-27T00:00:00Z', note: null, lines,
  })
  const boms = [
    bom('sponge-bom', 'sponge', 'Sponge', [line('s1', 'flour', 0.2, 'kg')]),
    bom('cake-bom', 'cake', 'Cake', [line('c1', 'sponge', 2, 'ea'), line('c2', 'flour', 0.4, 'kg')]),
  ]
  const order = (workOrderId: string, workOrderNumber: string, workOrderTitle: string, targetItemId: string,
    targetQuantity: number, bomId: string, plannedStartAt: string | null) => ({
    workOrderId, projectId: 'prj-e2e', workflowId: null, workOrderNumber, workOrderTitle, workOrderStatus: 'approved',
    priority: 'normal', targetItemId, targetQuantity, plannedStartAt, plannedEndAt: null, actualStartAt: null, actualEndAt: null,
    instruction: null, assignedTo: null, approvedBy: 'demo-owner', approvedAt: '2026-10-01T00:00:00Z', producedQuantity: 0,
    runCount: 0, bomId, instructionUrl: null, equipmentId: null,
  })
  const orders = [
    order('wo-cake', 'WO-0001', 'Cakes', 'cake', 10, 'cake-bom', '2030-01-07T00:00:00Z'),
    order('wo-sponge', 'WO-0002', 'Sponges', 'sponge', 5, 'sponge-bom', null),
  ]
  const material = (itemId: string, itemCode: string, unit: string, requiredQuantity: number, availableQuantity: number) => ({
    itemId, itemCode, itemName: itemCode.toLowerCase(), requiredQuantity, unit, availableQuantity,
    shortageQuantity: Math.max(0, requiredQuantity - availableQuantity), lotTracked: false, usableLots: 0,
  })

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const method = request.method()
    if (await answerAuth(route, pathname)) return
    if (method !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${method} ${pathname}` }) })
    }
    if (pathname === '/api/items') return ok(route, items)
    if (pathname === '/api/units') {
      return ok(route, [
        { unitId: 'unit_ea', unitCode: 'ea', unitName: 'each', unitType: 'count', activeYn: 'Y' },
        { unitId: 'unit_kg', unitCode: 'kg', unitName: 'kilogram', unitType: 'mass', activeYn: 'Y' },
      ])
    }
    if (pathname === '/api/boms') return ok(route, boms)
    if (pathname === '/api/work-orders') return ok(route, orders)
    if (pathname === '/api/work-orders/wo-cake/readiness') {
      // 10 cakes need 20 sponges (3 in stock) and 4 kg flour (1 in stock); flour is bought, not made.
      return ok(route, { workOrderId: 'wo-cake', ready: false, remainingQuantity: 10,
        checks: [{ code: 'materials', status: 'fail', message: '2 materials are short.' }],
        materials: [material('sponge', 'SPONGE', 'ea', 20, 3), material('flour', 'FLOUR', 'kg', 4, 1)] })
    }
    if (pathname === '/api/work-orders/wo-cake/waste-disposal-estimate') {
      // Waste still to come at today's disposal costs (docs/domain/bom-by-products.md WD8-WD9).
      return ok(route, { workOrderId: 'wo-cake', bomId: 'cake-bom', quantity: 10, disposalCost: 2, costComplete: true,
        lines: [{ itemId: 'crumb', itemCode: 'CRUMB', itemName: 'crumb', quantity: 0.5, unit: 'kg', unitDisposalCost: 4, cost: 2 }],
        problem: null })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/runs?view=work-orders')

  await page.getByRole('row', { name: /Cakes/ }).getByRole('button', { name: 'Readiness' }).click()
  const readiness = page.locator('[aria-label="Readiness"]')
  const waste = page.getByRole('region', { name: 'Waste disposal estimate' })
  await expect(waste).toContainText('CRUMB: 0.5 kg · 2')
  await expect(waste).toContainText('Estimated disposal cost: 2')
  const sponge = readiness.getByRole('row', { name: /SPONGE/ })
  // 17 short, 5 already planned by WO-0002: make 12.
  await expect(sponge).toContainText('Make 12')
  await expect(sponge).toContainText('(5 already planned)')
  await expect(readiness.getByRole('row', { name: /FLOUR/ }).getByRole('button')).toHaveCount(0)
  await sponge.getByRole('button', { name: 'Make SPONGE with a work order' }).click()

  await expect(page.getByRole('note')).toContainText("Filled in from WO-0001's readiness")
  await expect(page.getByPlaceholder('e.g. October batch — widget A')).toHaveValue('SPONGE for WO-0001')
  await expect(page.getByLabel('Target item')).toHaveValue('sponge')
  await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('12')
  await expect(page.getByLabel('BOM', { exact: false })).toHaveValue('sponge-bom')
  await expect(page.getByLabel('Planned end')).toHaveValue('2030-01-07T09:00')
})
