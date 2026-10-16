import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * Copying a worker's day changes to another worker in Project Settings (docs/domain/worker-calendar.md WC41-WC43) against
 * a mocked API: only the owner sees it, it sends today as the first date, and says how many it copied.
 */
test('the owner copies a worker\'s day changes to another worker', async ({ page }) => {
  const projectId = 'prj-copy'
  const shifts = [{ shiftId: 's', shiftStart: '09:00', shiftEnd: '17:00', workDays: [1, 2, 3, 4, 5], hours: 8 }]
  const day = { date: '2041-07-03', shifts: [], off: true, hours: 0, reason: 'Stocktaking', updatedBy: 'demo-owner' }
  const kim = { projectId, userId: 'kim', owner: false, calendarSet: true, weeklyHours: 40, shifts, daysOff: [], days: [day] }
  let lee = { projectId, userId: 'lee', owner: false, calendarSet: true, weeklyHours: 40, shifts, daysOff: [], days: [] as typeof kim.days }
  const owner = { projectId, userId: 'demo-owner', owner: true, calendarSet: false, weeklyHours: 0, shifts: [], daysOff: [], days: [] }
  const sent: unknown[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'POST' && pathname === `/api/projects/${projectId}/workers/kim/days/copy`) {
      sent.push(request.postDataJSON())
      lee = { ...lee, days: [day] }
      return ok(route, lee)
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === `/api/projects/${projectId}/workers`) return ok(route, [owner, kim, lee])
    if (pathname.endsWith('/time-zone')) return ok(route, { projectId, timeZone: 'Asia/Seoul', version: 0 })
    if (pathname === '/api/project-members') {
      return ok(route, [{ projectMemberId: 'pm', projectId, userId: 'demo-owner', projectRole: 'owner', memberStatus: 'active' }])
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto(`/projects/${projectId}/settings`)
  const panel = page.getByRole('region', { name: 'Workers' })
  await panel.getByText('kim · 40 h a week').click({ timeout: 15_000 })
  const copy = panel.getByRole('group', { name: 'Worker kim' }).getByRole('group', { name: 'Copy to another worker' })
  const button = copy.getByRole('button', { name: 'Copy 1 day change' })
  await expect(button).toBeDisabled()
  const targets = copy.getByRole('combobox', { name: 'Copy day changes to' })
  await expect(targets.getByRole('option')).toHaveText(['Choose a person', 'demo-owner', 'lee'])
  await targets.selectOption('lee')
  await button.click()
  await expect(copy.getByRole('status')).toHaveText('Copied 1 day change to lee.')
  expect(sent).toHaveLength(1)
  const body = sent[0] as { toUserId: string; fromDate: string }
  expect(body.toUserId).toBe('lee')
  expect(body.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

  // Lee's calendar now lists the copied date.
  await panel.getByText('lee · 40 h a week').click()
  await expect(panel.getByRole('group', { name: 'Worker lee' }).getByRole('group', { name: 'Day changes' }))
    .toContainText('Stocktaking')
})
