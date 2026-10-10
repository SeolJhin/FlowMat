import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * Waste disposal cost against a mocked API (docs/domain/bom-by-products.md WD5-WD6): a run shows it apart from material
 * cost, and an item's disposal cost is saved with its loaded version and kept after a stale-version refusal.
 */
test('a run shows waste disposal apart from material cost', async ({ page }) => {
  const run = { productionRunId: 'run-waste', projectId: 'prj-waste', workflowId: null, workflowRevisionId: null,
    runNumber: 'RUN-WASTE', runType: 'simulation', runStatus: 'finished', targetItemId: null, plannedOutputQty: 2,
    actualOutputQty: 2, workOrderId: null, bomId: 'bom', bomVersion: 1 }
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const { pathname } = new URL(route.request().url())
    if (await answerAuth(route, pathname)) return
    if (route.request().method() !== 'GET') throw new Error(`Unexpected write to ${pathname}`)
    if (pathname === '/api/production-runs/run-waste') return ok(route, run)
    if (pathname === '/api/production-runs/run-waste/cost') return ok(route, { productionRunId: 'run-waste', materialCost: 6,
      costComplete: true, outputQuantity: 2, costPerUnit: 3, costBasis: 'CURRENT', costBasisAt: null, estimated: false,
      lines: [{ itemId: 'material', itemCode: 'MATERIAL', itemName: 'Material', quantity: 3, unit: 'kg', unitCost: 2, cost: 6, costBasis: 'CURRENT' }] })
    if (pathname === '/api/production-runs/run-waste/waste-disposal-cost') return ok(route, { productionRunId: 'run-waste',
      disposalCost: 15, costComplete: false, costBasis: 'HISTORICAL', costBasisAt: '2030-01-01T00:00:00Z', estimated: false,
      lines: [{ itemId: 'peel', itemCode: 'PEEL', itemName: 'Peel', quantity: 5, unit: 'kg', unitDisposalCost: 3, cost: 15, costBasis: 'HISTORICAL' },
        { itemId: 'mystery', itemCode: 'MYSTERY', itemName: null, quantity: 1, unit: 'kg', unitDisposalCost: null, cost: null, costBasis: 'HISTORICAL' }] })
    if (pathname.endsWith('/instruction')) return ok(route, { open: false, instruction: null, checks: [], ready: true })
    if (pathname.endsWith('/quality-checklist')) return ok(route, { required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
    if (pathname.endsWith('/material-usage')) return ok(route, { bomId: null, lines: [] })
    return ok(route, [])
  })
  await mockedLogin(page)
  await page.goto('/projects/prj-waste/runs/run-waste')
  await expect(page.getByRole('region', { name: 'Material cost', exact: true })).toContainText('Per unit made: 3 (2 made)')
  const waste = page.getByRole('region', { name: 'Waste disposal cost', exact: true })
  await expect(waste).toContainText('Displayed separately; not added to material cost.')
  await expect(waste.getByRole('row', { name: /PEEL/ })).toContainText('15')
  await expect(waste.getByRole('row', { name: /MYSTERY/ })).toContainText('no disposal cost')
  await expect(waste).toContainText('Known disposal cost subtotal: 15')
  await expect(waste.getByLabel('Disposal cost basis')).toContainText('at original finish')
})

test('an item disposal cost is saved with its version and kept after a stale refusal', async ({ page }) => {
  const projectId = 'prj-dispose'
  const item = { itemId: 'peel', projectId, itemCode: 'PEEL', itemName: 'Peel', itemType: 'material', itemStatus: 'active',
    resourceCategory: 'material', unitId: 'kg', unit: 'kg', lotManageYn: 'N', details: {} }
  let saved = { itemId: 'peel', disposalCost: null as number | null, version: 0, updatedBy: null, updatedAt: null }
  const commands: { disposalCost: number | null; expectedVersion: number }[] = []
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/items/peel/disposal-cost' && request.method() === 'PUT') {
      const input = request.postDataJSON() as { disposalCost: number | null; expectedVersion: number }
      commands.push(input)
      if (commands.length === 1) {
        // Someone else saved first.
        saved = { ...saved, disposalCost: 9, version: 1 }
        return route.fulfill({ status: 409, contentType: 'application/json',
          body: JSON.stringify({ success: false, data: null, message: 'expectedVersion changed; reload the current disposalCost before saving a different one.' }) })
      }
      saved = { ...saved, disposalCost: input.disposalCost, version: saved.version + 1 }
      return ok(route, saved)
    }
    if (request.method() !== 'GET') throw new Error(`Unexpected write ${request.method()} ${pathname}`)
    if (pathname === '/api/items/peel/disposal-cost') return ok(route, saved)
    if (pathname === '/api/items') return ok(route, [item])
    if (pathname === '/api/units') return ok(route, [{ unitId: 'kg', unitCode: 'kg', unitName: 'Kilogram' }])
    if (pathname === '/api/stock-analysis' || pathname === '/api/stock-waste') return ok(route, { lines: [] })
    if (pathname === '/api/inventory-ledger') return ok(route, { items: [], hasMore: false, nextCursor: null })
    if (pathname === '/api/items/peel/setup-attributes') return ok(route, { itemId: 'peel', attributes: {}, version: 0 })
    return ok(route, [])
  })
  await mockedLogin(page)
  await page.goto(`/projects/${projectId}/inventory?tab=items`)
  await page.getByRole('row', { name: /PEEL.*Peel/ }).getByRole('button', { name: 'Details', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Item disposal cost', exact: true })
  await expect(panel).toContainText('Current disposal cost: not set')
  await panel.getByLabel('Disposal cost per kg').fill('3.5')
  await panel.getByRole('button', { name: 'Save disposal cost', exact: true }).click()
  await expect(panel.getByRole('alert')).toContainText('expectedVersion changed')
  await expect(panel.getByLabel('Disposal cost per kg')).toHaveValue('3.5')
  expect(commands[0]).toEqual({ disposalCost: 3.5, expectedVersion: 0 })
  await panel.getByRole('button', { name: 'Reload current disposal cost', exact: true }).click()
  await expect(panel).toContainText('Current disposal cost: 9 per kg')
  await panel.getByLabel('Disposal cost per kg').fill('3.5')
  await panel.getByRole('button', { name: 'Save disposal cost', exact: true }).click()
  await expect(panel).toContainText('Current disposal cost: 3.5 per kg')
  expect(commands[1]).toEqual({ disposalCost: 3.5, expectedVersion: 1 })
})
