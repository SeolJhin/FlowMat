import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * Workers' calendars in Project Settings (docs/domain/worker-calendar.md WC9) against a mocked API: the owner edits a
 * member's shifts and days off, and a refusal is shown.
 */
test('the owner sets a worker\'s shifts and days off', async ({ page }) => {
  const projectId = 'prj-workers'
  let kim = { projectId, userId: 'kim', owner: false, calendarSet: false, weeklyHours: 0, shifts: [] as unknown[],
    daysOff: [] as unknown[] }
  const owner = { projectId, userId: 'demo-owner', owner: true, calendarSet: true, weeklyHours: 40,
    shifts: [{ shiftId: 's-o', shiftStart: '09:00', shiftEnd: '17:00', workDays: [1, 2, 3, 4, 5], hours: 8 }], daysOff: [] }
  const sent: { method: string; path: string; body: unknown }[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname.startsWith(`/api/projects/${projectId}/workers/kim`) && request.method() !== 'GET') {
      const body = request.method() === 'DELETE' ? null : request.postDataJSON()
      sent.push({ method: request.method(), path: pathname, body })
      if (pathname.endsWith('/shifts')) {
        const shifts = (body as { shifts: { shiftStart: string; shiftEnd: string; workDays: number[] }[] }).shifts
        if (shifts.some((shift) => shift.workDays.length === 0)) {
          return route.fulfill({ status: 400, contentType: 'application/json',
            body: JSON.stringify({ success: false, data: null, message: 'Choose at least one work day.' }) })
        }
        kim = { ...kim, calendarSet: shifts.length > 0, weeklyHours: shifts.reduce((sum, shift) => sum + 8 * shift.workDays.length, 0),
          shifts: shifts.map((shift, index) => ({ shiftId: `s-${index}`, ...shift, hours: 8 })) }
      } else if (pathname.endsWith('/days-off')) {
        const off = body as { firstDay: string; lastDay: string; reason?: string }
        kim = { ...kim, daysOff: [{ dayOffId: 'd-1', firstDay: off.firstDay, lastDay: off.lastDay, reason: off.reason ?? null,
          createdBy: 'demo-owner' }] }
      } else {
        kim = { ...kim, daysOff: [] }
      }
      return ok(route, kim)
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === `/api/projects/${projectId}/workers`) return ok(route, [owner, kim])
    if (pathname.endsWith('/time-zone')) return ok(route, { projectId, timeZone: 'Asia/Seoul', version: 0 })
    if (pathname === '/api/project-members') {
      return ok(route, [{ projectMemberId: 'pm', projectId, userId: 'demo-owner', projectRole: 'owner', memberStatus: 'active' }])
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto(`/projects/${projectId}/settings`)
  const panel = page.getByRole('region', { name: 'Workers' })
  await expect(panel.getByText('demo-owner (owner) · 40 h a week')).toBeVisible({ timeout: 15_000 })
  await panel.getByText('kim · No shifts set').click()
  const kimCalendar = panel.getByRole('group', { name: 'Worker kim' })

  await kimCalendar.getByRole('button', { name: 'Add shift' }).click()
  await kimCalendar.getByLabel('Shift 1 Fri').uncheck()
  await kimCalendar.getByRole('button', { name: 'Save shifts' }).click()
  await expect(kimCalendar.getByRole('status')).toHaveText('Shifts saved: 32 h a week.')
  await expect(panel.getByText('kim · 32 h a week')).toBeVisible()

  // A shift without days is refused and said so.
  await kimCalendar.getByRole('button', { name: 'Add shift' }).click()
  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) await kimCalendar.getByLabel(`Shift 2 ${day}`).uncheck()
  await kimCalendar.getByRole('button', { name: 'Save shifts' }).click()
  await expect(kimCalendar.getByRole('alert')).toHaveText('Choose at least one work day.')
  await kimCalendar.getByRole('group', { name: 'Shift 2' }).getByRole('button', { name: 'Remove shift' }).click()

  await kimCalendar.getByLabel('First day off').fill('2041-03-06')
  await kimCalendar.getByLabel('Day off reason').fill('Training')
  await kimCalendar.getByRole('button', { name: 'Add day off' }).click()
  await expect(kimCalendar).toContainText('2041-03-06 · Training')
  await kimCalendar.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(kimCalendar).toContainText('None listed.')

  expect(sent.map((one) => [one.method, one.path.replace(`/api/projects/${projectId}/workers/kim`, '')])).toEqual([
    ['PUT', '/shifts'], ['PUT', '/shifts'], ['POST', '/days-off'], ['DELETE', '/days-off/d-1'],
  ])
  expect(sent[0].body).toEqual({ shifts: [{ shiftStart: '09:00', shiftEnd: '17:00', workDays: [1, 2, 3, 4] }] })
  expect(sent[2].body).toEqual({ firstDay: '2041-03-06', lastDay: '2041-03-06', reason: 'Training' })
})
