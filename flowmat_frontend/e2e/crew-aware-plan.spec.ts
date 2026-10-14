import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

test.use({ timezoneId: 'Asia/Seoul' })

/**
 * A plan suggestion that waited for its crew (docs/domain/worker-calendar.md WC26) against a mocked API: the line says who
 * it waited for and whose other order it moved after.
 */
test('a suggestion says which crew member moved it later', async ({ page }) => {
  const order = { workOrderId: 'wo-1', projectId: 'prj-e2e', workflowId: 'wf-1', workOrderNumber: 'WO-0041', workOrderTitle: 'Crewed plan',
    workOrderStatus: 'draft', priority: 'normal', targetItemId: null, targetQuantity: 10, plannedStartAt: '2041-05-06T01:00:00Z',
    plannedEndAt: null, actualStartAt: null, actualEndAt: null, instruction: null, assignedTo: null, approvedBy: null, approvedAt: null,
    producedQuantity: 0, runCount: 0, bomId: null, instructionUrl: null, equipmentId: 'press' }
  const asked: string[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (await answerAuth(route, url.pathname)) return
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${url.pathname}` }) })
    }
    if (url.pathname === '/api/work-orders') return ok(route, [order])
    if (url.pathname === '/api/equipments') {
      return ok(route, [{ equipmentId: 'press', projectId: 'prj-e2e', equipmentCode: 'PRESS-1', equipmentName: 'Press',
        equipmentType: 'machine', equipmentStatus: 'active', details: { capacityPerHour: 10 } }])
    }
    if (url.pathname === '/api/work-orders/wo-1/plan-suggestion') {
      asked.push(url.searchParams.get('from') ?? '')
      return ok(route, { workOrderId: 'wo-1', equipmentId: 'press', from: '2041-05-06T01:00:00Z',
        plannedStartAt: '2041-05-07T03:00:00Z', plannedEndAt: '2041-05-07T04:00:00Z', remainingQuantity: 10, capacityPerHour: 10,
        productionHours: 1, changeoverHours: 0, neededHours: 1, changeoverFrom: null, movedPast: [],
        crew: [{ userId: 'kim', calendarSet: true, hours: 1 }, { userId: 'lee', calendarSet: true, hours: 1 }],
        waitedForCrew: ['lee'], crewMovedPast: [{ workOrderNumber: 'WO-0007', userIds: ['lee'] }] })
    }
    if (url.pathname === '/api/work-orders/wo-1/crew') {
      return ok(route, { workOrderId: 'wo-1', plannedStartAt: order.plannedStartAt, plannedEndAt: null,
        members: [{ userId: 'kim', calendarSet: null, hoursInWindow: null }, { userId: 'lee', calendarSet: null, hoursInWindow: null }] })
    }
    if (url.pathname === '/api/work-orders/wo-1/readiness') {
      return ok(route, { workOrderId: 'wo-1', ready: true, remainingQuantity: 10, checks: [], materials: [] })
    }
    if (url.pathname === '/api/work-orders/wo-1/waste-disposal-estimate') {
      return ok(route, { workOrderId: 'wo-1', bomId: null, quantity: 10, disposalCost: 0, costComplete: true, lines: [], problem: null })
    }
    if (url.pathname === '/api/work-orders/wo-1/setup-comparison') {
      return ok(route, { workOrderId: 'wo-1', equipmentId: 'press', plannedMinutes: null, plannedCost: null, runs: 0,
        actualMinutes: 0, actualCost: 0, actualCostComplete: true })
    }
    if (url.pathname === '/api/work-orders/wo-1/running-comparison') {
      return ok(route, { workOrderId: 'wo-1', equipmentId: 'press', capacityPerHour: 10, plannedMinutes: 60, plannedCost: null,
        runs: 0, actualMinutes: 0, actualCost: 0, actualCostComplete: true })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/runs?view=work-orders')
  await page.getByRole('row', { name: /Crewed plan/ }).getByRole('button', { name: 'Readiness' }).click({ timeout: 15_000 })
  const planDates = page.locator('[aria-label="Plan dates"]')
  await planDates.getByRole('button', { name: 'Suggest dates' }).click()
  await expect(planDates.getByRole('status')).toHaveText(
    'Tue 2041-05-07 12:00 → Tue 2041-05-07 13:00 · needs 1 h · waits for lee to be on shift · after WO-0007 (lee)')
  expect(asked).toHaveLength(1)
})
