import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

function deferred() {
  let release = () => {}
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}

const projectId = 'prj-worker-editor'
const people = [
  { projectId, userId: 'demo-owner', owner: true, calendarSet: false, weeklyHours: 0, shifts: [], daysOff: [] },
  { projectId, userId: 'kim', owner: false, calendarSet: false, weeklyHours: 0, shifts: [], daysOff: [] },
  { projectId, userId: 'lee', owner: false, calendarSet: false, weeklyHours: 0, shifts: [], daysOff: [] },
]

test('saving crew preserves a selection changed while the response is pending', async ({ page }) => {
  const entered = deferred()
  const respond = deferred()
  const finished = deferred()
  const order = { workOrderId: 'wo-worker-editor', projectId, workflowId: 'wf-worker-editor', workOrderNumber: 'WO-0042',
    workOrderTitle: 'Worker editor regression', workOrderStatus: 'draft', priority: 'normal', targetItemId: null,
    targetQuantity: 10, plannedStartAt: null, plannedEndAt: null, actualStartAt: null, actualEndAt: null, instruction: null,
    assignedTo: null, approvedBy: null, approvedAt: null, producedQuantity: 0, runCount: 0, bomId: null, instructionUrl: null,
    equipmentId: null }
  let members: { userId: string; sharePercent: number; calendarSet: null; hoursInWindow: null }[] = []
  let saves = 0
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/work-orders/wo-worker-editor/crew') {
      if (request.method() === 'PUT') {
        saves += 1
        const body = request.postDataJSON() as { members: { userId: string; sharePercent: number }[] }
        expect(body).toEqual({ members: [{ userId: 'kim', sharePercent: 100 }] })
        members = body.members.map(member => ({ ...member, calendarSet: null, hoursInWindow: null }))
        entered.release()
        await respond.promise
        await ok(route, { workOrderId: order.workOrderId, plannedStartAt: null, plannedEndAt: null, members })
        finished.release()
        return
      }
      return ok(route, { workOrderId: order.workOrderId, plannedStartAt: null, plannedEndAt: null, members })
    }
    if (request.method() !== 'GET') return route.fulfill({ status: 404 })
    if (pathname === '/api/work-orders') return ok(route, [order])
    if (pathname === `/api/projects/${projectId}/workers`) return ok(route, people)
    if (pathname.endsWith('/readiness')) return ok(route,
      { workOrderId: order.workOrderId, ready: true, remainingQuantity: 10, checks: [], materials: [] })
    if (pathname.endsWith('/waste-disposal-estimate')) return ok(route,
      { workOrderId: order.workOrderId, lines: [], disposalCost: 0, costComplete: true })
    if (pathname.endsWith('/setup-comparison') || pathname.endsWith('/running-comparison')) return ok(route,
      { workOrderId: order.workOrderId, runs: 0, actualMinutes: 0, actualCost: 0, actualCostComplete: true })
    return ok(route, [])
  })
  try {
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/runs?view=work-orders`)
    await page.getByRole('row', { name: /Worker editor regression/ }).getByRole('button', { name: 'Readiness' }).click()
    const group = page.getByRole('group', { name: 'Crew', exact: true })
    await group.getByText('Choose crew').click()
    const kim = group.getByRole('checkbox', { name: /kim · No shifts set/ })
    const lee = group.getByRole('checkbox', { name: /lee · No shifts set/ })
    await kim.check()
    await group.getByRole('button', { name: 'Save crew' }).click()
    await entered.promise
    await lee.check()
    respond.release()
    await finished.promise
    await page.waitForLoadState('networkidle')
    expect(members.map(member => member.userId)).toEqual(['kim'])
    expect(members[0].sharePercent).toBe(100)
    expect(saves).toBe(1)
    await expect(kim).toBeChecked()
    await expect(lee).toBeChecked()
    await expect(group.getByRole('button', { name: 'Save crew' })).toBeEnabled()
  } finally {
    respond.release()
  }
})

test('adding a day off preserves the next dates and reason typed before the reply', async ({ page }) => {
  const entered = deferred()
  const respond = deferred()
  const finished = deferred()
  type DayOff = { dayOffId: string; firstDay: string; lastDay: string; reason: string; createdBy: string }
  let daysOff: DayOff[] = []
  let saved: { firstDay: string; lastDay: string; reason: string } | undefined
  let saves = 0
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === `/api/projects/${projectId}/workers/kim/days-off` && request.method() === 'POST') {
      saves += 1
      saved = request.postDataJSON() as NonNullable<typeof saved>
      daysOff = [{ dayOffId: 'off-worker-editor', ...saved, createdBy: 'demo-owner' }]
      entered.release()
      await respond.promise
      await ok(route, { ...people[1], daysOff })
      finished.release()
      return
    }
    if (request.method() !== 'GET') return route.fulfill({ status: 404 })
    if (pathname === `/api/projects/${projectId}/workers`) return ok(route,
      people.map(person => person.userId === 'kim' ? { ...person, daysOff } : person))
    if (pathname.endsWith('/time-zone')) return ok(route, { projectId, timeZone: 'Asia/Seoul', version: 0 })
    if (pathname === '/api/project-members') return ok(route,
      [{ projectMemberId: 'pm', projectId, userId: 'demo-owner', projectRole: 'owner', memberStatus: 'active' }])
    return ok(route, [])
  })
  try {
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/settings`)
    const panel = page.getByRole('region', { name: 'Workers', exact: true })
    await panel.getByText('kim · No shifts set').click()
    const calendar = panel.getByRole('group', { name: 'Worker kim', exact: true })
    const first = calendar.getByLabel('First day off')
    const last = calendar.getByLabel('Last day off')
    const reason = calendar.getByLabel('Day off reason')
    await first.fill('2041-03-06')
    await reason.fill('Training')
    await calendar.getByRole('button', { name: 'Add day off' }).click()
    await entered.promise
    await first.fill('2041-03-07')
    await last.fill('2041-03-08')
    await reason.fill('Vacation')
    respond.release()
    await finished.promise
    await page.waitForLoadState('networkidle')
    expect(saved).toEqual({ firstDay: '2041-03-06', lastDay: '2041-03-06', reason: 'Training' })
    expect(saves).toBe(1)
    await expect(calendar).toContainText('2041-03-06 · Training')
    await expect(first).toHaveValue('2041-03-07')
    await expect(last).toHaveValue('2041-03-08')
    await expect(reason).toHaveValue('Vacation')
    await expect(calendar.getByRole('button', { name: 'Add day off' })).toBeEnabled()
  } finally {
    respond.release()
  }
})
