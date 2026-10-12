import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * Confirming a step that follows an inspection standard records the run's inspection too (docs/domain/work-instruction.md
 * R9-R10) against a mocked API: the confirmed line names the inspection's result, the run's quality checklist is read again,
 * and a failed check offers a nonconformity (R8).
 */
test('a confirmed step that follows a standard shows the inspection it recorded', async ({ page }) => {
  const run = { productionRunId: 'run-wi', projectId: 'prj-e2e', workflowId: null, workflowRevisionId: null, runNumber: 'RUN-WI',
    runType: 'simulation', runStatus: 'running', targetItemId: 'bread', plannedOutputQty: 10, actualOutputQty: null, workOrderId: null,
    bomId: null, bomVersion: null }
  const instruction = {
    instructionId: 'wi-bread', projectId: 'prj-e2e', itemId: 'bread', itemCode: 'BREAD', itemName: 'bread', revisionNo: 1,
    status: 'released', title: 'Baking bread', body: null, documentUrl: null, releasedBy: 'demo-owner', releasedAt: '2026-10-11T00:00:00Z',
    updatedAt: '2026-10-11T00:00:00Z', blocksFinish: false,
    steps: [{ stepId: 'st-1', stepNo: 1, text: 'Check the dough', required: true, recordsValue: true, valueLabel: 'Moisture %',
      valueMin: 10, valueMax: 12, standardId: 's-moisture', standardName: 'Moisture', standardStatus: 'current' },
    { stepId: 'st-2', stepNo: 2, text: 'Look at the crust', required: false, recordsValue: true, valueLabel: 'Crust',
      valueMin: null, valueMax: null, standardId: 's-visual', standardName: 'Visual', standardStatus: 'current' }],
  }
  const confirmed: unknown[] = []
  const checklist = () => ({ productionRunId: 'run-wi', open: true, instruction, checks: confirmed, requiredSteps: 1,
    requiredDone: confirmed.length > 0 ? 1 : 0, complete: confirmed.length > 0, undone: [] })
  let qualityReads = 0
  const sent: unknown[] = []
  const ncrs: unknown[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    const checking = pathname.match(/^\/api\/production-runs\/run-wi\/instruction\/steps\/(st-\d)\/check$/)
    if (request.method() === 'POST' && checking) {
      const body = request.postDataJSON() as { value: string; result?: 'pass' | 'fail' }
      sent.push(body)
      // st-1 follows Moisture 10–12 (its value decides); st-2 follows Visual without limits (the person decides).
      confirmed.push({ stepId: checking[1], value: body.value, note: null, checkedBy: 'demo-owner', checkedAt: '2026-10-11T00:00:00Z',
        outOfLimits: checking[1] === 'st-1' && Number(body.value) > 12, inspectionId: `qi-${confirmed.length + 1}`,
        inspectionResult: checking[1] === 'st-1' ? (Number(body.value) > 12 ? 'fail' : 'pass') : body.result })
      return ok(route, checklist())
    }
    if (request.method() === 'POST' && pathname === '/api/nonconformities') {
      const body = request.postDataJSON() as { title: string }
      const raised = { nonconformityId: 'ncr-1', projectId: 'prj-e2e', ncrNo: 'NCR-0001', title: body.title, productionRunId: 'run-wi',
        status: 'open' }
      ncrs.push(raised)
      return ok(route, raised)
    }
    if (pathname === '/api/nonconformities') return ok(route, ncrs)
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/production-runs/run-wi') return ok(route, run)
    if (pathname === '/api/production-runs/run-wi/instruction') return ok(route, checklist())
    if (pathname === '/api/production-runs/run-wi/cost') {
      return ok(route, { productionRunId: 'run-wi', materialCost: 0, costComplete: true, outputQuantity: null, costPerUnit: null,
        costBasis: 'CURRENT', costBasisAt: null, estimated: false, lines: [] })
    }
    if (pathname === '/api/production-runs/run-wi/by-product-value') {
      return ok(route, { productionRunId: 'run-wi', byProductValue: 0, valueComplete: true, costBasis: 'CURRENT', costBasisAt: null,
        estimated: false, lines: [] })
    }
    if (pathname === '/api/production-runs/run-wi/material-usage') return ok(route, { bomId: null, lines: [] })
    if (pathname === '/api/production-runs/run-wi/quality-checklist') {
      qualityReads += 1
      return ok(route, { productionRunId: 'run-wi', required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [] })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/runs/run-wi')
  const step = page.getByRole('listitem').filter({ hasText: 'Check the dough' })
  await step.getByLabel('Moisture %').fill('13', { timeout: 15_000 })
  await expect.poll(() => qualityReads).toBeGreaterThan(0)
  const readsBefore = qualityReads
  await step.getByRole('button', { name: 'Done' }).click()

  await expect(step).toContainText('Moisture % 13')
  await expect(step).toContainText('(outside 10–12)')
  await expect(step).toContainText('inspection fail')
  expect(sent[0]).toEqual({ value: '13', note: null })
  // The inspection changes the run's quality checklist, so it is read again.
  await expect.poll(() => qualityReads).toBeGreaterThan(readsBefore)

  // A check without limits waits for the person's pass or fail (R10).
  const crust = page.getByRole('listitem').filter({ hasText: 'Look at the crust' })
  await crust.getByLabel('Crust').fill('cracked')
  await expect(crust.getByRole('button', { name: 'Done' })).toBeDisabled()
  await crust.getByLabel('Result for step 2').selectOption('fail')
  await crust.getByRole('button', { name: 'Done' }).click()
  await expect(crust).toContainText('Crust cracked')
  await expect(crust).toContainText('inspection fail')
  expect(sent[1]).toEqual({ value: 'cracked', note: null, result: 'fail' })

  // The failed check offers a nonconformity about the run, then names it (R8).
  await crust.getByRole('button', { name: 'Raise NCR' }).click()
  await expect(crust).toContainText('NCR-0001')
  await expect(crust.getByRole('button', { name: 'Raise NCR' })).toHaveCount(0)
  expect(ncrs).toEqual([expect.objectContaining({ title: 'Step 2 Visual failed: cracked' })])
})
