import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const basis of ['CURRENT', 'HISTORICAL', 'ESTIMATED'] as const) {
  test(`material cost explains ${basis.toLowerCase()} prices without changing recordings`, async ({ page }) => {
    const run = { productionRunId: 'run-cost', projectId: 'prj-cost', workflowId: null, workflowRevisionId: null,
      runNumber: 'RUN-COST', runType: 'simulation', runStatus: basis === 'CURRENT' ? 'running' : 'finished',
      targetItemId: null, plannedOutputQty: 2, actualOutputQty: 2, workOrderId: null, bomId: null, bomVersion: null }
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const { pathname } = new URL(route.request().url())
      if (await answerAuth(route, pathname)) return
      if (route.request().method() !== 'GET') throw new Error(`Unexpected write to ${pathname}`)
      if (pathname === '/api/production-runs/run-cost') return ok(route, run)
      if (pathname === '/api/production-runs/run-cost/cost') return ok(route, {
        productionRunId: 'run-cost', materialCost: 6, costComplete: true, outputQuantity: 2, costPerUnit: 3,
        costBasis: basis, costBasisAt: basis === 'HISTORICAL' ? '2030-01-01T00:00:00Z' : null, estimated: basis === 'ESTIMATED',
        lines: [{ itemId: 'material', itemCode: 'MATERIAL', itemName: 'Material', quantity: 3, unit: 'kg', unitCost: 2, cost: 6, costBasis: basis }],
      })
      if (pathname === '/api/production-runs/run-cost/by-product-value') return ok(route, {
        productionRunId: 'run-cost', byProductValue: 8, valueComplete: basis !== 'ESTIMATED', costBasis: basis,
        costBasisAt: basis === 'HISTORICAL' ? '2030-01-01T00:00:00Z' : null, estimated: basis === 'ESTIMATED',
        lines: [{ itemId: 'bran', itemCode: 'BRAN', itemName: 'Bran', quantity: 2, unit: 'kg', unitCost: 4, value: 8, costBasis: basis },
          ...(basis === 'ESTIMATED' ? [{ itemId: 'unknown', itemCode: 'UNKNOWN', itemName: null, quantity: null, unit: 'kg', unitCost: null, value: null, costBasis: basis }] : [])],
      })
      if (pathname === '/api/production-runs/run-cost/material-usage') return ok(route, { bomId: null, lines: [] })
      if (pathname === '/api/production-runs/run-cost/instruction') return ok(route, {
        productionRunId: 'run-cost', open: false, instruction: null, checks: [], requiredSteps: 0, requiredDone: 0, ready: true,
      })
      if (pathname === '/api/production-runs/run-cost/quality-checklist') return ok(route, { productionRunId: 'run-cost', required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
      return ok(route, [])
    })
    await mockedLogin(page)
    await page.goto('/projects/prj-cost/runs/run-cost')
    const cost = page.getByRole('region', { name: 'Material cost', exact: true })
    await expect(cost).toContainText('Per unit made: 3 (2 made)')
    const byProducts = page.getByRole('region', { name: 'By-product value', exact: true })
    await expect(byProducts.getByRole('row', { name: /BRAN/ })).toContainText('2 kg')
    await expect(byProducts.getByRole('row', { name: /BRAN/ })).toContainText('8')
    await expect(byProducts).toContainText('Displayed separately; material cost is not reduced.')
    if (basis === 'ESTIMATED') {
      await expect(byProducts).toContainText('Known value subtotal: 8')
      await expect(byProducts.getByRole('row', { name: /UNKNOWN/ })).toContainText('unknown quantity')
      await expect(byProducts.getByRole('row', { name: /UNKNOWN/ })).toContainText('unknown value')
    } else await expect(byProducts).toContainText('Total value: 8')
    const label = cost.getByLabel('Price basis', { exact: true })
    if (basis === 'CURRENT') await expect(label).toHaveText('Current item prices.')
    if (basis === 'HISTORICAL') await expect(label).toContainText('Prices at original finish:')
    if (basis === 'ESTIMATED') {
      await expect(label).toContainText('original finish time is unknown')
      await expect(cost.getByRole('row', { name: /MATERIAL/ })).toContainText('estimated price')
    }
  })
}

test('a failed by-product value lookup can be retried without changing material cost or recordings', async ({ page }) => {
  let reads = 0; let available = false
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const { pathname } = new URL(route.request().url())
    if (await answerAuth(route, pathname)) return
    if (route.request().method() !== 'GET') throw new Error(`Unexpected write: ${pathname}`)
    if (pathname === '/api/production-runs/value-retry') return ok(route, { productionRunId: 'value-retry', projectId: 'prj-cost',
      runNumber: 'VALUE-RETRY', runType: 'simulation', runStatus: 'finished', workflowId: null, targetItemId: null,
      plannedOutputQty: 2, actualOutputQty: 2, workOrderId: null, bomId: null, bomVersion: null })
    if (pathname === '/api/production-runs/value-retry/cost') return ok(route, { materialCost: 6, costComplete: true,
      outputQuantity: 2, costPerUnit: 3, costBasis: 'CURRENT', lines: [{ itemId: 'material', itemCode: 'MATERIAL', quantity: 3, unit: 'kg', cost: 6 }] })
    if (pathname === '/api/production-runs/value-retry/by-product-value') {
      reads++
      if (!available) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Value temporarily unavailable.' }) })
      return ok(route, { byProductValue: 8, valueComplete: true, costBasis: 'CURRENT', costBasisAt: null,
        lines: [{ itemId: 'bran', itemCode: 'BRAN', quantity: 2, unit: 'kg', value: 8, costBasis: 'CURRENT' }] })
    }
    if (pathname.endsWith('/instruction')) return ok(route, { open: false, instruction: null, checks: [], ready: true })
    if (pathname.endsWith('/quality-checklist')) return ok(route, { required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
    return ok(route, [])
  })
  await mockedLogin(page); await page.goto('/projects/prj-cost/runs/value-retry')
  const values = page.getByRole('region', { name: 'By-product value', exact: true })
  await expect(values.getByRole('alert')).toHaveText('Value temporarily unavailable.', { timeout: 15000 })
  available = true
  await expect(values.getByRole('button', { name: 'Retry value lookup' })).toBeVisible()
  await values.getByRole('button', { name: 'Retry value lookup' }).click()
  await expect(values).toContainText('Total value: 8')
  await expect(values.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Material cost', exact: true })).toContainText('Per unit made: 3 (2 made)')
  expect(reads).toBe(2)
})
