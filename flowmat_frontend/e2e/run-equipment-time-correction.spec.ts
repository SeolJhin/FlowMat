import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * Running-time corrections of a finished run (docs/domain/equipment-setup-cost.md ER10-ER12) against a mocked API: the
 * run's time is no longer recorded directly; a correction cancels or adds it, starting from the work order's equipment and
 * the run's time not yet counted.
 */
test('a finished run asks for a running time correction instead of changing its time', async ({ page }) => {
  const run = { productionRunId: 'run-etc', projectId: 'prj-e2e', workflowId: null, workflowRevisionId: null, runNumber: 'RUN-ETC',
    runType: 'production', runStatus: 'finished', targetItemId: null, plannedOutputQty: 1, actualOutputQty: 1, workOrderId: 'wo-1',
    bomId: null, bomVersion: null }
  const line = (id: string, minutes: number, rateBasis: string) => ({ runEquipmentTimeId: id, equipmentId: 'eq-oven',
    equipmentLabel: 'OVEN-1', runningMinutes: minutes, hourlyCost: 30, hourlyCostVersion: 1, runningCost: minutes / 2, note: null,
    recordedBy: 'demo-owner', recordedAt: '2026-10-12T00:00:00Z', cancelled: false, cancelledBy: null, cancelledAt: null,
    cancelReason: null, rateBasis })
  const requested: Record<string, unknown>[] = []
  let corrections: unknown[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'POST' && pathname === '/api/production-runs/run-etc/corrections') {
      const body = request.postDataJSON() as { reason: string; lines: Record<string, unknown>[] }
      requested.push(body)
      const correction = { productionRunCorrectionId: 'c1', productionRunId: 'run-etc', correctionNo: 1, status: 'pending_approval',
        reason: body.reason, requestedBy: 'demo-owner', requestedAt: '2026-10-12T01:00:00Z', decidedBy: null, decidedAt: null,
        decisionNote: null, appliedAt: null,
        lines: body.lines.map((one, index) => ({ lineNo: index + 1, targetRunItemId: null, direction: null, itemId: null,
          inventoryId: null, qty: null, unit: null, beforeQty: null, afterQty: null, createdRunItemId: null, equipmentId: null,
          runningMinutes: null, ...one })) }
      corrections = [correction]
      return ok(route, correction)
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/production-runs/run-etc') return ok(route, run)
    if (pathname === '/api/production-runs/run-etc/corrections') return ok(route, corrections)
    if (pathname === '/api/production-runs/run-etc/equipment-time') {
      return ok(route, { productionRunId: 'run-etc', defaultEquipmentId: 'eq-oven', suggestedMinutes: 40, runningMinutes: 70,
        runningCost: 35, costComplete: true, lines: [line('et-1', 60, 'recorded'), line('et-2', 10, 'historical')] })
    }
    if (pathname === '/api/production-runs/run-etc/setups') {
      return ok(route, { productionRunId: 'run-etc', defaultEquipmentId: 'eq-oven', setupMinutes: 0, setupCost: 0, costComplete: true,
        lines: [] })
    }
    if (pathname === '/api/equipments') {
      return ok(route, [{ equipmentId: 'eq-oven', projectId: 'prj-e2e', equipmentCode: 'OVEN-1', equipmentName: 'Oven',
        equipmentType: 'machine', equipmentStatus: 'active', details: {} }])
    }
    if (pathname === '/api/production-runs/run-etc/cost') {
      return ok(route, { productionRunId: 'run-etc', materialCost: 0, costComplete: true, outputQuantity: 1, costPerUnit: 0,
        costBasis: 'HISTORICAL', costBasisAt: '2026-10-12T00:00:00Z', estimated: false, lines: [] })
    }
    if (pathname === '/api/production-runs/run-etc/by-product-value') {
      return ok(route, { productionRunId: 'run-etc', byProductValue: 0, valueComplete: true, costBasis: 'HISTORICAL',
        costBasisAt: '2026-10-12T00:00:00Z', estimated: false, lines: [] })
    }
    if (pathname === '/api/production-runs/run-etc/material-usage') return ok(route, { bomId: null, lines: [] })
    if (pathname === '/api/production-runs/run-etc/instruction') {
      return ok(route, { productionRunId: 'run-etc', open: false, instruction: null, checks: [], requiredSteps: 0, requiredDone: 0,
        complete: true, undone: [] })
    }
    if (pathname === '/api/production-runs/run-etc/quality-checklist') {
      return ok(route, { productionRunId: 'run-etc', required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/runs/run-etc')
  const panel = page.getByRole('region', { name: 'Equipment running cost' })
  await expect(panel).toContainText('70 min · Running cost: 35', { timeout: 15_000 })
  await expect(panel.getByRole('button', { name: 'Record running time' })).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Cancel time' })).toHaveCount(0)
  // A corrected line says which rate it took.
  await expect(panel.getByRole('row', { name: /OVEN-1/ }).nth(1)).toContainText('rate at the run\'s finish')

  await panel.getByText('Request a running time correction').click()
  await expect(panel.getByLabel('Correction running equipment')).toHaveValue('eq-oven')
  await expect(panel.getByLabel('Correction running minutes')).toHaveValue('40')
  await expect(panel).toContainText('Suggested from the run\'s time, less recorded setups and running time.')
  await panel.getByRole('checkbox', { name: 'Cancel OVEN-1 60 min' }).check()
  await panel.getByLabel('Correction running minutes').fill('30')
  await expect(panel).not.toContainText('Suggested from the run\'s time')
  await panel.getByLabel('Running time correction reason').fill('Oven ran less')
  await panel.getByRole('button', { name: 'Request correction' }).click()
  await expect(panel.getByRole('status')).toContainText('Requested correction #1')
  expect(requested).toEqual([{ reason: 'Oven ran less', lines: [
    { kind: 'cancel_running_time', targetRunEquipmentTimeId: 'et-1' },
    { kind: 'add_running_time', equipmentId: 'eq-oven', runningMinutes: 30 }] }])
  // The pending correction reads in words under Corrections.
  const pending = page.getByRole('listitem', { name: 'Correction #1' })
  await expect(pending).toContainText('Cancel running time')
  await expect(pending).toContainText('Add 30 min of running time on OVEN-1')
})

test('only cancelling running time sends no added line', async ({ page }) => {
  const run = { productionRunId: 'run-etc2', projectId: 'prj-e2e', workflowId: null, workflowRevisionId: null,
    runNumber: 'RUN-ETC2', runType: 'production', runStatus: 'finished', targetItemId: null, plannedOutputQty: 1, actualOutputQty: 1,
    workOrderId: null, bomId: null, bomVersion: null }
  const requested: Record<string, unknown>[] = []
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'POST' && pathname === '/api/production-runs/run-etc2/corrections') {
      requested.push(request.postDataJSON() as Record<string, unknown>)
      return ok(route, { productionRunCorrectionId: 'c2', productionRunId: 'run-etc2', correctionNo: 2, status: 'pending_approval',
        reason: 'x', requestedBy: 'demo-owner', requestedAt: '2026-10-12T01:00:00Z', decidedBy: null, decidedAt: null,
        decisionNote: null, appliedAt: null, lines: [] })
    }
    if (request.method() !== 'GET') throw new Error(`Unexpected write ${request.method()} ${pathname}`)
    if (pathname === '/api/production-runs/run-etc2') return ok(route, run)
    if (pathname === '/api/production-runs/run-etc2/equipment-time') {
      // No work order: nothing to start the added line from.
      return ok(route, { productionRunId: 'run-etc2', defaultEquipmentId: null, suggestedMinutes: null, runningMinutes: 15,
        runningCost: 7.5, costComplete: true, lines: [{ runEquipmentTimeId: 'et-9', equipmentId: 'eq-oven', equipmentLabel: 'OVEN-1',
          runningMinutes: 15, hourlyCost: 30, hourlyCostVersion: 1, runningCost: 7.5, note: null, recordedBy: 'demo-owner',
          recordedAt: '2026-10-12T00:00:00Z', cancelled: false, cancelledBy: null, cancelledAt: null, cancelReason: null,
          rateBasis: 'recorded' }] })
    }
    if (pathname === '/api/equipments') {
      return ok(route, [{ equipmentId: 'eq-oven', projectId: 'prj-e2e', equipmentCode: 'OVEN-1', equipmentName: 'Oven',
        equipmentType: 'machine', equipmentStatus: 'active', details: {} }])
    }
    if (pathname === '/api/production-runs/run-etc2/cost') {
      return ok(route, { productionRunId: 'run-etc2', materialCost: 0, costComplete: true, outputQuantity: 1, costPerUnit: 0,
        costBasis: 'HISTORICAL', costBasisAt: '2026-10-12T00:00:00Z', estimated: false, lines: [] })
    }
    if (pathname.endsWith('/instruction')) return ok(route, { open: false, instruction: null, checks: [], ready: true })
    if (pathname.endsWith('/quality-checklist')) {
      return ok(route, { required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
    }
    if (pathname.endsWith('/material-usage')) return ok(route, { bomId: null, lines: [] })
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/runs/run-etc2')
  const panel = page.getByRole('region', { name: 'Equipment running cost' })
  await panel.getByText('Request a running time correction').click({ timeout: 15_000 })
  await expect(panel.getByLabel('Correction running equipment')).toHaveValue('')
  await expect(panel.getByLabel('Correction running minutes')).toHaveValue('')
  const send = panel.getByRole('button', { name: 'Request correction' })
  await panel.getByLabel('Running time correction reason').fill('Recorded on the wrong run')
  await expect(send).toBeDisabled()
  await panel.getByRole('checkbox', { name: 'Cancel OVEN-1 15 min' }).check()
  await send.click()
  await expect(panel.getByRole('status')).toContainText('Requested correction #2')
  expect(requested).toEqual([{ reason: 'Recorded on the wrong run', lines: [
    { kind: 'cancel_running_time', targetRunEquipmentTimeId: 'et-9' }] }])
})
