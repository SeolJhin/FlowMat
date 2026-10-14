import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

test.use({ timezoneId: 'Asia/Seoul' })

/**
 * The worker load board in Project Settings (docs/domain/worker-calendar.md WC22) against a mocked API: hours, load, the
 * orders that name each worker and the ones that want them at the same time.
 */
test('the board shows each worker\'s booked hours and double bookings', async ({ page }) => {
  const projectId = 'prj-load'
  const asked: string[] = []
  const order = (workOrderId: string, workOrderNumber: string, workOrderTitle: string, workOrderStatus: string, hoursInWindow: number) => ({
    workOrderId, workOrderNumber, workOrderTitle, workOrderStatus, plannedStartAt: '2041-04-01T00:00:00Z',
    plannedEndAt: '2041-04-02T08:00:00Z', hoursInWindow })
  const load = {
    from: '2041-03-31T15:00:00Z', to: '2041-04-07T15:00:00Z',
    workers: [
      { userId: 'demo-owner', owner: true, calendarSet: true, shiftHours: 40, plannedHours: 0, draftHours: 0, loadPercent: 0,
        overloaded: false, unplannedOrders: 0, orders: [], overlaps: [] },
      { userId: 'kim', owner: false, calendarSet: true, shiftHours: 40, plannedHours: 72, draftHours: 8, loadPercent: 180,
        overloaded: true, unplannedOrders: 1,
        orders: [order('wo-1', 'WO-0001', 'Mixing', 'approved', 16), order('wo-2', 'WO-0002', 'Baking', 'approved', 16),
          order('wo-3', 'WO-0003', 'Packing', 'draft', 8)],
        overlaps: [{ firstWorkOrderNumber: 'WO-0001', secondWorkOrderNumber: 'WO-0002', from: '2041-04-02T00:00:00Z',
          to: '2041-04-02T08:00:00Z', hours: 8 }] },
      { userId: 'lee', owner: false, calendarSet: false, shiftHours: 0, plannedHours: 0, draftHours: 0, loadPercent: null,
        overloaded: false, unplannedOrders: 0, orders: [order('wo-1', 'WO-0001', 'Mixing', 'approved', 0)], overlaps: [] },
    ],
  }
  const calendar = (userId: string, owner: boolean) => ({ projectId, userId, owner, calendarSet: false, weeklyHours: 0, shifts: [],
    daysOff: [] })

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (await answerAuth(route, url.pathname)) return
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${url.pathname}` }) })
    }
    if (url.pathname === '/api/worker-load') {
      asked.push(url.searchParams.get('from') ?? '')
      return ok(route, load)
    }
    if (url.pathname === `/api/projects/${projectId}/workers`) {
      return ok(route, [calendar('demo-owner', true), calendar('kim', false), calendar('lee', false)])
    }
    if (url.pathname.endsWith('/time-zone')) return ok(route, { projectId, timeZone: 'Asia/Seoul', version: 0 })
    if (url.pathname === '/api/project-members') {
      return ok(route, [{ projectMemberId: 'pm', projectId, userId: 'demo-owner', projectRole: 'owner', memberStatus: 'active' }])
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto(`/projects/${projectId}/settings`)
  const panel = page.getByRole('region', { name: 'Workers' })
  await panel.getByText('Load by week').click({ timeout: 15_000 })
  const table = panel.getByRole('table', { name: 'Load by worker' })
  const kim = table.getByRole('row', { name: /^kim/ })
  await expect(kim).toContainText('40 h')
  await expect(kim).toContainText('72 h')
  await expect(kim).toContainText('180% · Overloaded')
  await expect(kim).toContainText('WO-0003 · Packing · draft · 8 h')
  await expect(kim).toContainText('WO-0001 and WO-0002 at once: Tue 2041-04-02 09:00 → Tue 2041-04-02 17:00 · 8 h')
  await expect(kim).toContainText('1 open order(s) without planned dates')
  const lee = table.getByRole('row', { name: /^lee/ })
  await expect(lee).toContainText('No shifts set')
  await expect(lee).toContainText('WO-0001 · Mixing')
  await expect(lee).not.toContainText('0 h')

  const before = asked.length
  await panel.getByRole('button', { name: 'Next week' }).click()
  await expect.poll(() => asked.length).toBeGreaterThan(before)
  expect(new Date(asked[asked.length - 1]).getTime() - new Date(asked[0]).getTime()).toBe(7 * 24 * 3600 * 1000)
})
