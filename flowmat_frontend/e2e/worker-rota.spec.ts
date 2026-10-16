import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * A worker's rotating rota in Project Settings (docs/domain/worker-calendar.md WC44-WC50) against a mocked API: early shifts
 * one week and nights the next, sent with the rota's start week; a shift in a week the rota does not have is refused first.
 */
test('the owner sets a two-week rota of early shifts and nights', async ({ page }) => {
  const projectId = 'prj-rota'
  type Shift = { shiftId: string; shiftStart: string; shiftEnd: string; workDays: number[]; hours: number; rotaWeek: number }
  let kim = { projectId, userId: 'kim', owner: false, calendarSet: true, weeklyHours: 40, daysOff: [], days: [],
    shifts: [{ shiftId: 's1', shiftStart: '09:00', shiftEnd: '17:00', workDays: [1, 2, 3, 4, 5], hours: 8, rotaWeek: 1 }] as Shift[],
    rota: null as { weeks: number; startsOn: string; currentWeek: number } | null }
  const owner = { projectId, userId: 'demo-owner', owner: true, calendarSet: false, weeklyHours: 0, shifts: [], daysOff: [], days: [] }
  const sent: unknown[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'PUT' && pathname === `/api/projects/${projectId}/workers/kim/shifts`) {
      const body = request.postDataJSON() as { shifts: Omit<Shift, 'shiftId' | 'hours'>[]; rota?: { weeks: number; startsOn: string } }
      sent.push(body)
      kim = { ...kim, weeklyHours: 40, rota: body.rota ? { ...body.rota, currentWeek: 1 } : null,
        shifts: body.shifts.map((shift, index) => ({ ...shift, shiftId: `s${index}`, hours: 8, rotaWeek: shift.rotaWeek ?? 1 })) }
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
  await panel.getByText('kim · 40 h a week').click({ timeout: 15_000 })
  const calendar = panel.getByRole('group', { name: 'Worker kim' })
  const rota = calendar.getByRole('group', { name: 'Rota' })
  await expect(calendar.getByLabel('Shift 1 week')).toHaveCount(0)

  await rota.getByLabel('Rota weeks').selectOption('2')
  await expect(rota.getByLabel('Rota starts')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)
  await rota.getByLabel('Rota starts').fill('2041-09-02')
  await calendar.getByRole('button', { name: 'Add shift' }).click()
  await calendar.getByLabel('Shift 2 week').selectOption('2')
  await calendar.getByLabel('Shift 2 start').fill('22:00')
  await calendar.getByLabel('Shift 2 end').fill('06:00')
  await calendar.getByLabel('Shift 2 Fri').uncheck()
  await calendar.getByRole('button', { name: 'Save shifts' }).click()
  await expect(calendar.getByRole('status')).toHaveText('Shifts saved: 40 h a week on average.')
  expect(sent[0]).toEqual({
    shifts: [
      { shiftStart: '09:00', shiftEnd: '17:00', workDays: [1, 2, 3, 4, 5], rotaWeek: 1 },
      { shiftStart: '22:00', shiftEnd: '06:00', workDays: [1, 2, 3, 4], rotaWeek: 2 },
    ],
    rota: { weeks: 2, startsOn: '2041-09-02' },
  })
  await expect(panel.getByText('kim · 40 h a week on average')).toBeVisible()
  await expect(rota).toContainText('2-week rota from 2041-09-02 · week 1 now')

  // A shift in week 3 of what becomes a two-week rota is refused before anything is sent.
  await rota.getByLabel('Rota weeks').selectOption('3')
  await calendar.getByLabel('Shift 2 week').selectOption('3')
  await rota.getByLabel('Rota weeks').selectOption('2')
  await calendar.getByRole('button', { name: 'Save shifts' }).click()
  await expect(calendar.getByRole('alert')).toHaveText('Shift 2 is in week 3, but the rota has 2 weeks.')
  expect(sent).toHaveLength(1)
})
