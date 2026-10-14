import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * A work order's crew (docs/domain/worker-calendar.md WC12-WC15) against a mocked API: the crew is chosen from the project's
 * workers, saved, and readiness then says their time in the planned window.
 */
test('the crew is chosen and readiness says their time', async ({ page }) => {
  const order = { workOrderId: 'wo-1', projectId: 'prj-e2e', workflowId: 'wf-1', workOrderNumber: 'WO-0031', workOrderTitle: 'Crewed',
    workOrderStatus: 'draft', priority: 'normal', targetItemId: null, targetQuantity: 10, plannedStartAt: '2041-03-04T00:00:00Z',
    plannedEndAt: '2041-03-05T08:00:00Z', actualStartAt: null, actualEndAt: null, instruction: null, assignedTo: null,
    approvedBy: null, approvedAt: null, producedQuantity: 0, runCount: 0, bomId: null, instructionUrl: null, equipmentId: null }
  let crew = { workOrderId: 'wo-1', plannedStartAt: order.plannedStartAt, plannedEndAt: order.plannedEndAt,
    members: [] as { userId: string; sharePercent: number; calendarSet: boolean | null; hoursInWindow: number | null }[] }
  const sent: unknown[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/work-orders/wo-1/crew' && request.method() === 'PUT') {
      const body = request.postDataJSON() as { members: { userId: string; sharePercent: number }[] }
      sent.push(body)
      crew = { ...crew, members: body.members.map(({ userId, sharePercent }) => ({ userId, sharePercent,
        calendarSet: userId === 'kim', hoursInWindow: userId === 'kim' ? 16 : 0 })) }
      return ok(route, crew)
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/work-orders') return ok(route, [order])
    if (pathname === '/api/work-orders/wo-1/crew') return ok(route, crew)
    if (pathname === '/api/projects/prj-e2e/workers') {
      return ok(route, [
        { projectId: 'prj-e2e', userId: 'demo-owner', owner: true, calendarSet: false, weeklyHours: 0, shifts: [], daysOff: [] },
        { projectId: 'prj-e2e', userId: 'kim', owner: false, calendarSet: true, weeklyHours: 40, shifts: [], daysOff: [] },
        { projectId: 'prj-e2e', userId: 'lee', owner: false, calendarSet: false, weeklyHours: 0, shifts: [], daysOff: [] },
      ])
    }
    if (pathname === '/api/work-orders/wo-1/readiness') {
      const checks = [{ code: 'bom', status: 'warn', message: 'No BOM; materials are neither planned nor checked.' }]
      if (crew.members.length > 0) {
        checks.push({ code: 'crew', status: 'warn', message: `Crew in the planned window: ${crew.members.map((one) =>
          one.calendarSet ? `${one.userId} ${one.hoursInWindow} h` : `${one.userId} has no shifts set`).join(', ')}.` })
      }
      return ok(route, { workOrderId: 'wo-1', ready: true, remainingQuantity: 10, checks, materials: [] })
    }
    if (pathname === '/api/work-orders/wo-1/waste-disposal-estimate') {
      return ok(route, { workOrderId: 'wo-1', bomId: null, quantity: 10, disposalCost: 0, costComplete: true, lines: [],
        problem: null })
    }
    if (pathname === '/api/work-orders/wo-1/setup-comparison') {
      return ok(route, { workOrderId: 'wo-1', equipmentId: null, plannedMinutes: null, plannedCost: null, runs: 0,
        actualMinutes: 0, actualCost: 0, actualCostComplete: true })
    }
    if (pathname === '/api/work-orders/wo-1/running-comparison') {
      return ok(route, { workOrderId: 'wo-1', equipmentId: null, capacityPerHour: null, plannedMinutes: null, plannedCost: null,
        runs: 0, actualMinutes: 0, actualCost: 0, actualCostComplete: true })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/runs?view=work-orders')
  await page.getByRole('row', { name: /Crewed/ }).getByRole('button', { name: 'Readiness' }).click({ timeout: 15_000 })
  const crewGroup = page.getByRole('group', { name: 'Crew', exact: true })
  await expect(crewGroup).toContainText('No crew named')
  await crewGroup.getByText('Choose crew').click()
  const saveCrew = crewGroup.getByRole('button', { name: 'Save crew' })
  await expect(saveCrew).toBeDisabled()
  await crewGroup.getByRole('checkbox', { name: /kim · 40 h a week/ }).check()
  await crewGroup.getByRole('checkbox', { name: /lee · No shifts set/ }).check()
  // Lee is needed for half of their time; a share past 100 is refused before sending.
  await crewGroup.getByLabel('lee share').fill('150')
  await expect(crewGroup.getByRole('alert')).toHaveText('Each share must be a whole number from 1 to 100.')
  await expect(saveCrew).toBeDisabled()
  await crewGroup.getByLabel('lee share').fill('50')
  await saveCrew.click()
  await expect(crewGroup).toContainText('kim 16 h, lee 50% (no shifts)')
  await expect(saveCrew).toBeDisabled()
  expect(sent).toEqual([{ members: [{ userId: 'kim', sharePercent: 100 }, { userId: 'lee', sharePercent: 50 }] }])
  await expect(page.locator('[aria-label="Readiness"]')).toContainText('Crew in the planned window: kim 16 h, lee has no shifts set.')
})
