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
    const label = cost.getByLabel('Price basis')
    if (basis === 'CURRENT') await expect(label).toHaveText('Current item prices.')
    if (basis === 'HISTORICAL') await expect(label).toContainText('Prices at original finish:')
    if (basis === 'ESTIMATED') {
      await expect(label).toContainText('original finish time is unknown')
      await expect(cost.getByRole('row', { name: /MATERIAL/ })).toContainText('estimated price')
    }
  })
}
