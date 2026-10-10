import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * A run's actual setups against a mocked API (docs/domain/equipment-setup-cost.md): the work order's equipment is the
 * default, a lost reply is retried under the same requestId, and a cancelled setup stops counting.
 */
test('setups are recorded at the recorded rate, retried after a lost reply and cancelled with a reason', async ({ page }) => {
  const run = { productionRunId: 'run-setup', projectId: 'prj-setup', workflowId: null, workflowRevisionId: null,
    runNumber: 'RUN-SETUP', runType: 'simulation', runStatus: 'running', targetItemId: null, plannedOutputQty: 1,
    actualOutputQty: null, workOrderId: 'wo-1', bomId: null, bomVersion: null }
  const lines: Record<string, unknown>[] = []
  const requestIds: string[] = []
  let lose = true
  const state = () => {
    const counted = lines.filter((line) => !line.cancelled)
    return { productionRunId: 'run-setup', defaultEquipmentId: 'press', costComplete: true,
      setupMinutes: counted.reduce((sum, line) => sum + Number(line.setupMinutes), 0),
      setupCost: counted.reduce((sum, line) => sum + Number(line.setupCost), 0), lines }
  }

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/production-runs/run-setup/setups' && request.method() === 'POST') {
      const body = request.postDataJSON() as { requestId: string; equipmentId: string; setupMinutes: number }
      requestIds.push(body.requestId)
      if (!lines.some((line) => line.requestId === body.requestId)) {
        lines.push({ runSetupId: `s${lines.length + 1}`, requestId: body.requestId, equipmentId: body.equipmentId,
          equipmentLabel: 'PRESS', setupMinutes: body.setupMinutes, hourlyCost: 30, hourlyCostVersion: 1,
          setupCost: body.setupMinutes / 2, note: null, recordedBy: 'demo-owner', recordedAt: '2030-01-01T00:00:00Z',
          cancelled: false, cancelledBy: null, cancelledAt: null, cancelReason: null })
      }
      if (lose) {
        lose = false
        return route.fulfill({ status: 503, contentType: 'application/json',
          body: JSON.stringify({ success: false, data: null, message: 'Temporarily unavailable.' }) })
      }
      return ok(route, state())
    }
    if (pathname === '/api/production-runs/run-setup/setups/s1/cancel' && request.method() === 'POST') {
      Object.assign(lines[0], { cancelled: true, cancelledBy: 'demo-owner', cancelReason: 'Counted twice' })
      return ok(route, state())
    }
    if (request.method() !== 'GET') throw new Error(`Unexpected write ${request.method()} ${pathname}`)
    if (pathname === '/api/production-runs/run-setup') return ok(route, run)
    if (pathname === '/api/production-runs/run-setup/setups') return ok(route, state())
    if (pathname === '/api/equipments') {
      return ok(route, [{ equipmentId: 'press', projectId: 'prj-setup', equipmentCode: 'PRESS', equipmentName: 'Press',
        equipmentType: 'machine', equipmentStatus: 'active', details: {} }])
    }
    if (pathname === '/api/production-runs/run-setup/cost') {
      return ok(route, { productionRunId: 'run-setup', materialCost: 0, costComplete: true, outputQuantity: null,
        costPerUnit: null, costBasis: 'CURRENT', costBasisAt: null, estimated: false, lines: [] })
    }
    if (pathname.endsWith('/instruction')) return ok(route, { open: false, instruction: null, checks: [], ready: true })
    if (pathname.endsWith('/quality-checklist')) {
      return ok(route, { required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
    }
    if (pathname.endsWith('/material-usage')) return ok(route, { bomId: null, lines: [] })
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-setup/runs/run-setup')
  const panel = page.getByRole('region', { name: 'Setup cost', exact: true })
  await expect(panel.getByLabel('Setup equipment')).toHaveValue('press')
  await panel.getByLabel('Setup minutes').fill('40')
  await panel.getByRole('button', { name: 'Record setup' }).click()
  await expect(panel.getByRole('alert')).toContainText('Temporarily unavailable.')
  await panel.getByRole('button', { name: 'Retry setup' }).click()
  await expect(panel).toContainText('40 min · Setup cost: 20')
  expect(requestIds).toHaveLength(2)
  expect(requestIds[1]).toBe(requestIds[0])

  page.once('dialog', (dialog) => void dialog.accept('Counted twice'))
  await panel.getByRole('button', { name: 'Cancel setup' }).click()
  await expect(panel).toContainText('cancelled: Counted twice')
  await expect(panel).toContainText('0 min · Setup cost: 0')
})

test('a finished run asks for a setup correction instead of changing its setups', async ({ page }) => {
  const run = { productionRunId: 'run-done', projectId: 'prj-setup', workflowId: null, workflowRevisionId: null,
    runNumber: 'RUN-DONE', runType: 'simulation', runStatus: 'finished', targetItemId: null, plannedOutputQty: 1,
    actualOutputQty: 1, workOrderId: null, bomId: null, bomVersion: null }
  const requested: Record<string, unknown>[] = []
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/production-runs/run-done/corrections' && request.method() === 'POST') {
      requested.push(request.postDataJSON() as Record<string, unknown>)
      return ok(route, { productionRunCorrectionId: 'c1', productionRunId: 'run-done', correctionNo: 1, status: 'pending_approval',
        reason: 'Wrong die', requestedBy: 'demo-owner', requestedAt: '2030-01-02T00:00:00Z', decidedBy: null, decidedAt: null,
        decisionNote: null, appliedAt: null, lines: [] })
    }
    if (request.method() !== 'GET') throw new Error(`Unexpected write ${request.method()} ${pathname}`)
    if (pathname === '/api/production-runs/run-done') return ok(route, run)
    if (pathname === '/api/production-runs/run-done/cost') {
      return ok(route, { productionRunId: 'run-done', materialCost: 0, costComplete: true, outputQuantity: 1, costPerUnit: 0,
        costBasis: 'HISTORICAL', costBasisAt: '2030-01-01T00:00:00Z', estimated: false, lines: [] })
    }
    if (pathname === '/api/production-runs/run-done/setups') return ok(route, { productionRunId: 'run-done', defaultEquipmentId: null,
      setupMinutes: 45, setupCost: 22.5, costComplete: true, lines: [{ runSetupId: 's1', equipmentId: 'press', equipmentLabel: 'PRESS',
        setupMinutes: 45, hourlyCost: 30, hourlyCostVersion: 1, setupCost: 22.5, note: null, recordedBy: 'demo-owner',
        recordedAt: '2030-01-01T00:00:00Z', cancelled: false, cancelledBy: null, cancelledAt: null, cancelReason: null, rateBasis: 'recorded' }] })
    if (pathname === '/api/equipments') {
      return ok(route, [{ equipmentId: 'press', projectId: 'prj-setup', equipmentCode: 'PRESS', equipmentName: 'Press',
        equipmentType: 'machine', equipmentStatus: 'active', details: {} }])
    }
    if (pathname.endsWith('/instruction')) return ok(route, { open: false, instruction: null, checks: [], ready: true })
    if (pathname.endsWith('/quality-checklist')) {
      return ok(route, { required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
    }
    if (pathname.endsWith('/material-usage')) return ok(route, { bomId: null, lines: [] })
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-setup/runs/run-done')
  const panel = page.getByRole('region', { name: 'Setup cost', exact: true })
  await expect(panel.getByRole('button', { name: 'Record setup' })).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Cancel setup' })).toHaveCount(0)
  await panel.getByText('Request a setup correction').click()
  await panel.getByRole('checkbox', { name: /Cancel PRESS 45 min/ }).check()
  await panel.getByLabel('Correction setup equipment').selectOption('press')
  await panel.getByLabel('Correction setup minutes').fill('20')
  await panel.getByLabel('Setup correction reason').fill('Wrong die')
  await panel.getByRole('button', { name: 'Request correction' }).click()
  await expect(panel.getByRole('status')).toContainText('Requested correction #1')
  expect(requested[0]).toEqual({ reason: 'Wrong die', lines: [
    { kind: 'cancel_setup', targetRunSetupId: 's1' }, { kind: 'add_setup', equipmentId: 'press', setupMinutes: 20 }] })
})
