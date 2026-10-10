import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * Phantom BOM lines against a mocked API (docs/domain/multi-level-bom.md P1-P2), so no BOM is written to a real
 * database: a phantom line is tagged, requirements show its materials "via" it, and only a material with its own
 * approved BOM offers the phantom choice. The server side is covered by BomPhantomIntegrationTest.
 */
test('a phantom line is tagged, expanded in requirements and offered only for sub-assemblies', async ({ page }) => {
  const item = (itemId: string, itemCode: string, unitId: string) => ({
    itemId, projectId: 'prj-e2e', itemCode, itemName: itemCode.toLowerCase(), itemType: 'material', resourceCategory: null,
    resourceType: null, unitId, itemStatus: 'active', lotManageYn: 'N', unitCost: null,
  })
  const items = [item('bread', 'BREAD', 'unit_ea'), item('roll', 'ROLL', 'unit_ea'), item('dough', 'DOUGH', 'unit_kg'),
    item('flour', 'FLOUR', 'unit_kg')]
  const line = (bomLineId: string, childItemId: string, quantity: number, unit: string, phantom = false) => ({
    bomLineId, childItemId, quantity, unit, scrapRate: null, optionalYn: 'N', substituteGroup: null, sortOrder: 1, note: null,
    lineType: 'material', phantom,
  })
  const bom = (bomId: string, targetItemId: string, bomName: string, bomStatus: string, lines: unknown[]) => ({
    bomId, projectId: 'prj-e2e', targetItemId, bomName, bomVersion: 1, baseQuantity: 1, baseUnit: 'ea', bomStatus,
    approvedBy: null, approvedAt: null, note: null, lines,
  })
  const boms = [
    bom('dough-bom', 'dough', 'Dough', 'approved', [line('d1', 'flour', 1, 'kg')]),
    bom('bread-bom', 'bread', 'Bread', 'approved', [line('b1', 'dough', 2, 'kg', true)]),
    bom('roll-draft', 'roll', 'Roll draft', 'draft', []),
  ]
  const added: Record<string, unknown>[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'POST' && pathname === '/api/boms/roll-draft/lines') {
      const body = request.postDataJSON() as Record<string, unknown>
      added.push(body)
      return ok(route, { ...boms[2], lines: [line('r1', String(body.childItemId), Number(body.quantity), String(body.unit),
        body.phantom === true)] })
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/items') return ok(route, items)
    if (pathname === '/api/units') {
      return ok(route, [
        { unitId: 'unit_ea', unitCode: 'ea', unitName: 'each', unitType: 'count', activeYn: 'Y' },
        { unitId: 'unit_kg', unitCode: 'kg', unitName: 'kilogram', unitType: 'mass', activeYn: 'Y' },
      ])
    }
    if (pathname === '/api/boms') return ok(route, boms)
    if (pathname === '/api/boms/bread-bom/buildable') {
      return ok(route, { bomId: 'bread-bom', targetItemId: 'bread', targetUnit: 'ea', baseQuantity: 1, buildable: 0,
        limitingItemId: 'flour', lines: [{ childItemId: 'flour', itemUnit: 'kg', perBatch: 2, usable: 0, buildable: 0 }] })
    }
    if (pathname === '/api/boms/bread-bom/explosion') {
      const quantity = Number(url.searchParams.get('quantity'))
      return ok(route, { bomId: 'bread-bom', bomVersion: 1, targetItemId: 'bread', targetItemCode: 'BREAD', quantity, levels: 1,
        lines: [{ level: 1, parentItemId: 'bread', itemId: 'flour', itemCode: 'FLOUR', itemName: 'flour', quantity: 2 * quantity,
          unit: 'kg', bomId: null, bomVersion: null }],
        materials: [{ itemId: 'flour', itemCode: 'FLOUR', itemName: 'flour', quantity: 2 * quantity, unit: 'kg', unitCost: null, cost: null }],
        materialCost: 0, costComplete: false, problems: [] })
    }
    if (pathname === '/api/boms/bread-bom/requirements') {
      const quantity = Number(url.searchParams.get('quantity'))
      return ok(route, { bomId: 'bread-bom', bomVersion: 1, targetItemId: 'bread', productionQuantity: quantity, baseQuantity: 1,
        lines: [{ bomLineId: 'd1', childItemId: 'flour', lineQuantity: 1, lineUnit: 'kg', requiredQuantity: 2 * quantity,
          itemUnit: 'kg', requiredItemQuantity: 2 * quantity, conversionRate: 1, unitCost: null, lineCost: null, viaItemId: 'dough' }],
        materialCost: 0, costComplete: false, outputs: [] })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/inventory?tab=boms')

  await page.getByRole('row', { name: /Bread/ }).first().click()
  await expect(page.getByRole('cell', { name: /DOUGH.*phantom: its own BOM's materials are used/ })).toBeVisible()
  await page.getByRole('spinbutton', { name: 'Materials needed to make' }).fill('3')
  await expect(page.getByRole('row', { name: /FLOUR.*via DOUGH/ })).toContainText('6 kg')

  await page.getByRole('row', { name: /Roll draft/ }).click()
  const phantom = page.getByRole('checkbox', { name: /Phantom: use its own BOM's materials/ })
  await page.getByLabel('Material', { exact: true }).selectOption('flour')
  await expect(phantom).toHaveCount(0)
  await page.getByLabel('Material', { exact: true }).selectOption('dough')
  await phantom.check()
  await page.getByLabel('Material quantity').fill('1')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect.poll(() => added.length).toBe(1)
  expect(added[0]).toMatchObject({ childItemId: 'dough', quantity: 1, unit: 'kg', lineType: 'material', phantom: true })
})

test('a run line expanded through a phantom says via which sub-assembly', async ({ page }) => {
  const items = [
    { itemId: 'bread', itemCode: 'BREAD', itemName: 'bread' }, { itemId: 'dough', itemCode: 'DOUGH', itemName: 'dough' },
    { itemId: 'flour', itemCode: 'FLOUR', itemName: 'flour' }, { itemId: 'salt', itemCode: 'SALT', itemName: 'salt' },
  ].map((one) => ({ ...one, projectId: 'prj-ph', itemType: 'material', unitId: 'unit_kg', itemStatus: 'active' }))
  const run = { productionRunId: 'run-ph', projectId: 'prj-ph', workflowId: null, workflowRevisionId: null, runNumber: 'RUN-PH',
    runType: 'simulation', runStatus: 'running', targetItemId: 'bread', plannedOutputQty: 1, actualOutputQty: null,
    workOrderId: null, bomId: 'bom-bread', bomVersion: 1 }
  const line = (id: string, itemId: string, viaItemId: string | null) => ({ productionRunItemId: id, productionRunId: 'run-ph',
    processId: null, processIoId: null, inventoryId: null, itemId, direction: 'input', plannedQty: 2, actualQty: null, unit: 'kg',
    quantitySource: 'bom', conversionRate: 1, lotId: null, cancelled: false, cancelledBy: null, cancelledAt: null,
    cancelReason: null, viaItemId })
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() !== 'GET') throw new Error(`Unexpected write ${request.method()} ${pathname}`)
    if (pathname === '/api/production-runs/run-ph') return ok(route, run)
    if (pathname === '/api/production-runs/run-ph/items') return ok(route, [line('l1', 'flour', 'dough'), line('l2', 'salt', null)])
    if (pathname === '/api/items') return ok(route, items)
    if (pathname === '/api/production-runs/run-ph/cost') {
      return ok(route, { productionRunId: 'run-ph', materialCost: 0, costComplete: true, outputQuantity: null, costPerUnit: null,
        costBasis: 'CURRENT', costBasisAt: null, estimated: false, lines: [] })
    }
    if (pathname === '/api/production-runs/run-ph/setups') {
      return ok(route, { productionRunId: 'run-ph', defaultEquipmentId: null, setupMinutes: 0, setupCost: 0, costComplete: true, lines: [] })
    }
    if (pathname.endsWith('/instruction')) return ok(route, { open: false, instruction: null, checks: [], ready: true })
    if (pathname.endsWith('/quality-checklist')) {
      return ok(route, { required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
    }
    if (pathname.endsWith('/material-usage')) return ok(route, { bomId: null, lines: [] })
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-ph/runs/run-ph')
  const flour = page.getByRole('row').filter({ hasText: 'FLOUR · flour' })
  await expect(flour).toContainText('via DOUGH · dough')
  await expect(page.getByRole('row').filter({ hasText: 'SALT · salt' })).not.toContainText('via')
})
