import { expect, test, type Route } from '@playwright/test'

/**
 * Multi-level BOM screens (docs/domain/multi-level-bom.md) against a mocked API, so no BOM is written to a real database:
 * a material with its own approved BOM is marked, the BOM explodes through it with the bought materials' cost, and open
 * order needs show the sub-assembly's materials "via" it. The server side is covered by MultiLevelBomIntegrationTest.
 */
test('a sub-assembly is marked, exploded and shown in open order needs', async ({ page }) => {
  const ok = async (route: Route, data: unknown) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, message: null }) })
  }
  const item = (itemId: string, itemCode: string, unitId: string, unitCost: number | null) => ({
    itemId, projectId: 'prj-e2e', itemCode, itemName: itemCode.toLowerCase(), itemType: 'material', resourceCategory: null,
    resourceType: null, unitId, itemStatus: 'active', lotManageYn: 'N', unitCost,
  })
  const items = [
    item('cake', 'CAKE', 'unit_ea', null), item('sponge', 'SPONGE', 'unit_ea', null),
    item('flour', 'FLOUR', 'unit_kg', 2), item('egg', 'EGG', 'unit_ea', 0.5),
  ]
  const line = (bomLineId: string, childItemId: string, quantity: number, unit: string) => ({
    bomLineId, childItemId, quantity, unit, scrapRate: null, optionalYn: 'N', substituteGroup: null, sortOrder: 1, note: null,
  })
  const bom = (bomId: string, targetItemId: string, bomName: string, lines: unknown[]) => ({
    bomId, projectId: 'prj-e2e', targetItemId, bomName, bomVersion: 1, baseQuantity: 1, baseUnit: 'ea', bomStatus: 'approved',
    approvedBy: 'demo-owner', approvedAt: '2026-09-27T00:00:00Z', note: null, lines,
  })
  const boms = [
    bom('sponge-bom', 'sponge', 'Sponge', [line('s1', 'flour', 0.2, 'kg'), line('s2', 'egg', 2, 'ea')]),
    bom('cake-bom', 'cake', 'Cake', [line('c1', 'sponge', 2, 'ea')]),
  ]

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url
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
    if (pathname === '/api/boms/cake-bom/requirements') {
      const quantity = Number(url.searchParams.get('quantity'))
      return ok(route, { bomId: 'cake-bom', bomVersion: 1, targetItemId: 'cake', productionQuantity: quantity, baseQuantity: 1,
        lines: [{ bomLineId: 'c1', childItemId: 'sponge', lineQuantity: 2, lineUnit: 'ea', requiredQuantity: 2 * quantity,
          itemUnit: 'ea', requiredItemQuantity: 2 * quantity, conversionRate: 1, unitCost: null, lineCost: null }],
        materialCost: 0, costComplete: false })
    }
    if (pathname === '/api/boms/cake-bom/buildable') {
      return ok(route, { bomId: 'cake-bom', targetItemId: 'cake', targetUnit: 'ea', baseQuantity: 1, buildable: 0,
        limitingItemId: 'sponge', lines: [{ childItemId: 'sponge', itemUnit: 'ea', perBatch: 2, usable: 0, buildable: 0 }] })
    }
    if (pathname === '/api/boms/cake-bom/explosion') {
      // A cake is 2 sponges; a sponge is 0.2 kg flour (at 2) and 2 eggs (at 0.5).
      const cakes = Number(url.searchParams.get('quantity'))
      return ok(route, {
        bomId: 'cake-bom', bomVersion: 1, targetItemId: 'cake', targetItemCode: 'CAKE', quantity: cakes, levels: 2,
        lines: [
          { level: 1, parentItemId: 'cake', itemId: 'sponge', itemCode: 'SPONGE', itemName: 'sponge', quantity: 2 * cakes, unit: 'ea',
            bomId: 'sponge-bom', bomVersion: 1 },
          { level: 2, parentItemId: 'sponge', itemId: 'flour', itemCode: 'FLOUR', itemName: 'flour', quantity: 0.4 * cakes, unit: 'kg',
            bomId: null, bomVersion: null },
          { level: 2, parentItemId: 'sponge', itemId: 'egg', itemCode: 'EGG', itemName: 'egg', quantity: 4 * cakes, unit: 'ea',
            bomId: null, bomVersion: null },
        ],
        materials: [
          { itemId: 'egg', itemCode: 'EGG', itemName: 'egg', quantity: 4 * cakes, unit: 'ea', unitCost: 0.5, cost: 2 * cakes },
          { itemId: 'flour', itemCode: 'FLOUR', itemName: 'flour', quantity: 0.4 * cakes, unit: 'kg', unitCost: 2, cost: 0.8 * cakes },
        ],
        materialCost: 2.8 * cakes, costComplete: true, problems: [],
      })
    }
    if (pathname === '/api/material-requirements') {
      return ok(route, { orders: 1, problems: [], lines: [
        { itemId: 'sponge', itemCode: 'SPONGE', itemName: 'sponge', unit: 'ea', required: 20, usable: 0, shortage: 20,
          plannedSupply: 0, madeHere: true, orders: [{ workOrderId: 'wo-1', workOrderTitle: 'Cakes', required: 20 }] },
        { itemId: 'egg', itemCode: 'EGG', itemName: 'egg', unit: 'ea', required: 40, usable: 0, shortage: 40, plannedSupply: 0,
          madeHere: false, orders: [{ workOrderId: null, workOrderTitle: null, required: 40, viaItemId: 'sponge', viaItemCode: 'SPONGE' }] },
        { itemId: 'flour', itemCode: 'FLOUR', itemName: 'flour', unit: 'kg', required: 4, usable: 0, shortage: 4, plannedSupply: 0,
          madeHere: false, orders: [{ workOrderId: null, workOrderTitle: null, required: 4, viaItemId: 'sponge', viaItemCode: 'SPONGE' }] },
      ] })
    }
    return ok(route, [])
  })

  await page.goto('/')
  await page.locator('input').nth(0).fill('demo-owner')
  await page.locator('input[type="password"]').fill('demo1234')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.goto('/projects/prj-e2e/inventory?tab=boms')

  await page.getByRole('row', { name: /Cake/ }).click()
  await expect(page.getByRole('cell', { name: /SPONGE.*has its own BOM/ })).toBeVisible()
  await page.getByRole('spinbutton', { name: 'Materials needed to make' }).fill('10')
  await page.getByText('Through sub-assemblies (all levels)').click()
  const explosion = page.getByRole('region', { name: 'BOM explosion' })
  await expect(explosion).toContainText('2 levels · 2 bought materials · cost 28')
  await expect(explosion.getByRole('table', { name: 'Exploded materials' }).getByRole('row', { name: /SPONGE/ })).toContainText('own BOM v1')
  const bought = explosion.getByRole('table', { name: 'Bought materials' })
  await expect(bought.getByRole('row', { name: /FLOUR/ })).toContainText('4 kg')
  await expect(bought.getByRole('row', { name: /EGG/ })).toContainText('40 ea')

  await page.goto('/projects/prj-e2e/inventory?tab=stock')
  const needs = page.getByRole('region', { name: 'Open work order needs' })
  await expect(needs.getByRole('row', { name: /^SPONGE ·/ })).toContainText('made here · own BOM')
  await expect(needs.getByRole('row', { name: /^FLOUR ·/ })).toContainText('via SPONGE 4')
  await expect(needs.getByRole('row', { name: /^EGG ·/ })).toContainText('via SPONGE 40')
})
