import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * Equipment running time on run detail (docs/domain/equipment-setup-cost.md ER1-ER7) against a mocked API: the minutes
 * start from the run's time less recorded setups, the record keeps the rate it was made at, and the cost stays apart from
 * material cost.
 */
test('running time is suggested from the run and recorded at the equipment rate', async ({ page }) => {
  const run = { productionRunId: 'run-et', projectId: 'prj-e2e', workflowId: null, workflowRevisionId: null, runNumber: 'RUN-ET',
    runType: 'production', runStatus: 'running', targetItemId: null, plannedOutputQty: 1, actualOutputQty: null, workOrderId: 'wo-1',
    bomId: null, bomVersion: null }
  let times = { productionRunId: 'run-et', defaultEquipmentId: 'eq-oven', suggestedMinutes: 100 as number | null, runningMinutes: 0,
    runningCost: 0, costComplete: true, lines: [] as unknown[] }
  const sent: unknown[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'POST' && pathname === '/api/production-runs/run-et/equipment-time') {
      const body = request.postDataJSON() as { requestId: string; equipmentId?: string; runningMinutes: number }
      sent.push(body)
      times = { ...times, suggestedMinutes: null, runningMinutes: body.runningMinutes, runningCost: body.runningMinutes / 2,
        lines: [{ runEquipmentTimeId: 'et-1', equipmentId: 'eq-oven', equipmentLabel: 'OVEN-1', runningMinutes: body.runningMinutes,
          hourlyCost: 30, hourlyCostVersion: 1, runningCost: body.runningMinutes / 2, note: null, recordedBy: 'demo-owner',
          recordedAt: '2026-10-12T00:00:00Z', cancelled: false, cancelledBy: null, cancelledAt: null, cancelReason: null }] }
      return ok(route, times)
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/production-runs/run-et') return ok(route, run)
    if (pathname === '/api/production-runs/run-et/equipment-time') return ok(route, times)
    if (pathname === '/api/production-runs/run-et/setups') {
      return ok(route, { productionRunId: 'run-et', defaultEquipmentId: 'eq-oven', setupMinutes: 20, setupCost: 10, costComplete: true,
        lines: [] })
    }
    if (pathname === '/api/equipments') {
      return ok(route, [{ equipmentId: 'eq-oven', projectId: 'prj-e2e', equipmentCode: 'OVEN-1', equipmentName: 'Oven',
        equipmentType: 'machine', equipmentStatus: 'active', details: {} }])
    }
    if (pathname === '/api/production-runs/run-et/cost') {
      return ok(route, { productionRunId: 'run-et', materialCost: 0, costComplete: true, outputQuantity: null, costPerUnit: null,
        costBasis: 'CURRENT', costBasisAt: null, estimated: false, lines: [] })
    }
    if (pathname === '/api/production-runs/run-et/by-product-value') {
      return ok(route, { productionRunId: 'run-et', byProductValue: 0, valueComplete: true, costBasis: 'CURRENT', costBasisAt: null,
        estimated: false, lines: [] })
    }
    if (pathname === '/api/production-runs/run-et/material-usage') return ok(route, { bomId: null, lines: [] })
    if (pathname === '/api/production-runs/run-et/instruction') {
      return ok(route, { productionRunId: 'run-et', open: true, instruction: null, checks: [], requiredSteps: 0, requiredDone: 0,
        complete: true, undone: [] })
    }
    if (pathname === '/api/production-runs/run-et/quality-checklist') {
      return ok(route, { productionRunId: 'run-et', required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/runs/run-et')
  const panel = page.getByRole('region', { name: 'Equipment running cost' })
  await expect(panel.getByLabel('Running minutes')).toHaveValue('100', { timeout: 15_000 })
  await expect(panel).toContainText('Suggested from the run\'s time so far, less recorded setups and running time.')
  await expect(panel.getByLabel('Running equipment')).toHaveValue('eq-oven')

  await panel.getByRole('button', { name: 'Record running time' }).click()
  await expect(panel.getByRole('row', { name: /OVEN-1/ })).toContainText('30/h')
  await expect(panel).toContainText('100 min · Running cost: 50')
  expect(sent).toEqual([expect.objectContaining({ equipmentId: 'eq-oven', runningMinutes: 100 })])
  // Nothing left to suggest: the field is empty again and the hint is gone.
  await expect(panel.getByLabel('Running minutes')).toHaveValue('')
  await expect(panel).not.toContainText('Suggested from the run')
})
