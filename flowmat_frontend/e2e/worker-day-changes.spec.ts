import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * A worker's own dates in Project Settings (docs/domain/worker-calendar.md WC33) against a mocked API: a day without work, a
 * day in two shifts, a refusal before sending, and taking a change back.
 */
test('the owner changes a worker\'s shifts for single dates', async ({ page }) => {
  const projectId = 'prj-days'
  type Day = { date: string; shifts: { shiftStart: string; shiftEnd: string; hours: number }[]; off: boolean; hours: number;
    reason: string | null; updatedBy: string }
  let days: Day[] = []
  const kim = () => ({ projectId, userId: 'kim', owner: false, calendarSet: true, weeklyHours: 40,
    shifts: [{ shiftId: 's-k', shiftStart: '09:00', shiftEnd: '17:00', workDays: [1, 2, 3, 4, 5], hours: 8 }], daysOff: [], days })
  const owner = { projectId, userId: 'demo-owner', owner: true, calendarSet: false, weeklyHours: 0, shifts: [], daysOff: [], days: [] }
  const sent: { method: string; path: string; body: unknown }[] = []
  const length = (shift: { shiftStart: string; shiftEnd: string }) => Number(shift.shiftEnd.slice(0, 2)) - Number(shift.shiftStart.slice(0, 2))

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    const prefix = `/api/projects/${projectId}/workers/kim/days/`
    const date = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : null
    if (date && request.method() === 'PUT') {
      const body = request.postDataJSON() as { shifts: { shiftStart: string; shiftEnd: string }[]; reason: string | null }
      sent.push({ method: 'PUT', path: date, body })
      days = [...days.filter((day) => day.date !== date), { date, off: body.shifts.length === 0,
        hours: body.shifts.reduce((sum, shift) => sum + length(shift), 0), reason: body.reason, updatedBy: 'demo-owner',
        shifts: body.shifts.map((shift) => ({ ...shift, hours: length(shift) })) }]
        .sort((a, b) => a.date.localeCompare(b.date))
      return ok(route, kim())
    }
    if (date && request.method() === 'DELETE') {
      sent.push({ method: 'DELETE', path: date, body: null })
      days = days.filter((day) => day.date !== date)
      return ok(route, kim())
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === `/api/projects/${projectId}/workers`) return ok(route, [owner, kim()])
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
  const changes = panel.getByRole('group', { name: 'Worker kim' }).getByRole('group', { name: 'Day changes' })
  await expect(changes).toContainText('No day changes.')

  // No date yet: refused before anything is sent.
  await changes.getByRole('button', { name: 'Save day' }).click()
  await expect(changes.getByRole('alert')).toHaveText('Choose the day.')

  await changes.getByLabel('Changed day').fill('2041-06-05')
  await changes.getByLabel('Off that day').check()
  await changes.getByLabel('Day change reason').fill('Stocktaking')
  await changes.getByRole('button', { name: 'Save day' }).click()
  await expect(changes).toContainText('Wed 2041-06-05 · Off · Stocktaking')

  await changes.getByLabel('Changed day').fill('2041-06-04')
  await changes.getByLabel('Day shift 1 start').fill('06:00')
  await changes.getByLabel('Day shift 1 end').fill('14:00')
  await changes.getByRole('button', { name: 'Add day shift' }).click()
  await expect(changes.getByLabel('Day shift 2 start')).toHaveValue('14:00')
  await expect(changes.getByLabel('Day shift 2 end')).toHaveValue('18:00')
  await changes.getByRole('button', { name: 'Save day' }).click()
  await expect(changes).toContainText('Tue 2041-06-04 · 06:00–14:00, 14:00–18:00 · 12 h')

  await changes.getByRole('listitem').filter({ hasText: '2041-06-05' }).getByRole('button', { name: 'Remove change' }).click()
  await expect(changes).not.toContainText('2041-06-05')

  expect(sent).toEqual([
    { method: 'PUT', path: '2041-06-05', body: { shifts: [], reason: 'Stocktaking' } },
    { method: 'PUT', path: '2041-06-04', body: { shifts: [{ shiftStart: '06:00', shiftEnd: '14:00' }, { shiftStart: '14:00', shiftEnd: '18:00' }],
      reason: null } },
    { method: 'DELETE', path: '2041-06-05', body: null },
  ])
})
