import { expect, test, type Page, type Route } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

type Topic = 'stock_alert' | 'ncr_check_overdue' | 'work_order_due'
interface Choice { projectId: string; topic: Topic; subscribed: boolean; daysAhead: number | null }
interface Input { projectId: string; topic: Topic; subscribed: boolean; daysAhead?: number }
function deferred() {
  let release = () => {}
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}

async function editor(page: Page, save: (route: Route, body: Input, rows: Choice[]) => Promise<void>, initiallySubscribed = true) {
  const projectId = 'prj-subscription-regression'
  let rows: Choice[] = [
    { projectId, topic: 'stock_alert', subscribed: false, daysAhead: null },
    { projectId, topic: 'ncr_check_overdue', subscribed: false, daysAhead: null },
    { projectId, topic: 'work_order_due', subscribed: initiallySubscribed, daysAhead: initiallySubscribed ? 3 : null },
  ]
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/notification-subscriptions' && request.method() === 'PUT') {
      const body = request.postDataJSON() as Input
      rows = rows.map(row => row.topic === body.topic
        ? { ...row, subscribed: body.subscribed, daysAhead: body.subscribed ? body.daysAhead ?? null : null } : row)
      return save(route, body, rows.map(row => ({ ...row })))
    }
    if (request.method() !== 'GET') return route.fulfill({ status: 404, contentType: 'application/json',
      body: JSON.stringify({ success: false, data: null, message: 'Unmocked request' }) })
    if (pathname === '/api/notification-subscriptions') return ok(route, rows)
    if (pathname.endsWith('/time-zone')) return ok(route, { projectId, timeZone: 'Asia/Seoul', version: 0 })
    if (pathname === '/api/project-members') return ok(route,
      [{ projectMemberId: 'pm', projectId, userId: 'demo-owner', projectRole: 'owner', memberStatus: 'active' }])
    if (pathname === '/api/projects') return ok(route,
      [{ projectId, projectName: 'Subscription regression', projectStatus: 'active' }])
    return ok(route, [])
  })
  await mockedLogin(page)
  await page.goto(`/projects/${projectId}/settings`)
  const panel = page.getByRole('region', { name: 'Notifications', exact: true })
  const days = panel.getByLabel('Days before the planned end')
  await expect(days).toHaveValue('3')
  return { days, saved: () => rows.find(row => row.topic === 'work_order_due')!.daysAhead }
}

test('a completed save keeps the newer days draft that has not been submitted', async ({ page }) => {
  const entered = deferred()
  const releaseResponse = deferred()
  const finished = deferred()
  let calls = 0
  const { days, saved } = await editor(page, async (route, _body, snapshot) => {
    calls += 1
    entered.release()
    await releaseResponse.promise
    await ok(route, snapshot)
    finished.release()
  })
  try {
    await days.fill('7')
    await days.blur()
    await entered.promise
    await days.fill('9')
    releaseResponse.release()
    await finished.promise
    await page.waitForLoadState('networkidle')
    await expect(days).toHaveValue('9')
    expect(saved()).toBe(7)
    expect(calls).toBe(1)
  } finally {
    releaseResponse.release()
  }
})

test('days agree with the persisted settings when save replies arrive out of order', async ({ page }) => {
  const firstEntered = deferred()
  const releaseFirst = deferred()
  const secondFinished = deferred()
  const allFinished = deferred()
  const sent: number[] = []
  let finished = 0
  const { days, saved } = await editor(page, async (route, body, snapshot) => {
    sent.push(body.daysAhead!)
    if (sent.length === 1) {
      firstEntered.release()
      await releaseFirst.promise
    }
    await ok(route, snapshot)
    if (body.daysAhead === 9) secondFinished.release()
    finished += 1
    if (finished === 2) allFinished.release()
  })
  try {
    await days.fill('7')
    await days.blur()
    await firstEntered.promise
    await days.fill('9')
    await days.blur()
    // Model slow network delivery: parallel requests can finish the second response first;
    // a serialized client starts it after this bounded response delay instead.
    let responseDelay: ReturnType<typeof setTimeout> | undefined
    await Promise.race([secondFinished.promise, new Promise<void>(resolve => {
      responseDelay = setTimeout(resolve, 1000)
    })])
    clearTimeout(responseDelay)
    releaseFirst.release()
    await allFinished.promise
    await page.waitForLoadState('networkidle')
    expect(sent).toEqual([7, 9])
    expect(saved()).toBe(9)
    await expect(days).toHaveValue('9')
  } finally {
    releaseFirst.release()
  }
})


test('turning work order reminders on preserves the newer days draft', async ({ page }) => {
  const entered = deferred()
  const releaseResponse = deferred()
  const finished = deferred()
  const { days, saved } = await editor(page, async (route, _body, snapshot) => {
    entered.release()
    await releaseResponse.promise
    await ok(route, snapshot)
    finished.release()
  }, false)
  const choice = page.getByRole('region', { name: 'Notifications', exact: true })
    .getByRole('checkbox', { name: 'Work orders due' })
  try {
    await days.fill('7')
    await choice.check()
    await entered.promise
    await days.fill('9')
    releaseResponse.release()
    await finished.promise
    await page.waitForLoadState('networkidle')
    await expect(choice).toBeChecked()
    await expect(days).toHaveValue('9')
    expect(saved()).toBe(7)
  } finally {
    releaseResponse.release()
  }
})
