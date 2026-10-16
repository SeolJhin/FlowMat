import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

test.skip(!process.env.REAL_API_E2E || process.env.FLOWMAT_WORKER_E2E_DISPOSABLE !== '1',
  'Needs an explicitly disposable backend and the worker-planning fixture')
test.use({ trace: 'off', timezoneId: 'Asia/Seoul' })

const projectId = 'prj_worker_e2e'
const workerId = 'worker-e2e-editor'
const monday = '2041-03-04'
const from = `${monday}T09:00:00+09:00`
const dayStart = `${monday}T00:00:00+09:00`
const dayEnd = '2041-03-05T00:00:00+09:00'
const workers = `/projects/${projectId}/workers`
interface Calendar { userId: string; calendarSet: boolean; shifts: unknown[]; days: { date: string }[] }
interface Order { workOrderId: string; bomId: string | null; plannedStartAt: string | null; plannedEndAt: string | null }
interface Plan { plannedStartAt: string; plannedEndAt: string; waitedForCrew: string[] }
interface Crew { members: { userId: string; sharePercent: number }[] }
interface Load { userId: string; shiftHours: number; plannedHours: number; draftHours: number }

async function login(page: Page, userId: string) {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'demo-owner' }).fill(userId)
  await page.getByRole('textbox', { name: '••••••••' }).fill('demo1234')
  const received = page.waitForResponse(reply => reply.request().method() === 'POST'
    && new URL(reply.url()).pathname === '/api/auth/login')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  const reply = await received
  expect(reply.ok()).toBe(true)
  const headers = { Authorization: `Bearer ${(await reply.json()).data.accessToken}` }
  await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible()
  return headers
}

function apiFor(request: APIRequestContext, headers: { Authorization: string }) {
  return async function api<T>(method: string, path: string, data?: unknown): Promise<T> {
    const reply = await request.fetch(`/api${path}`, { method, headers, data, timeout: 10_000 })
    const envelope = await reply.json()
    expect(reply.ok(), `${method} ${path}: ${envelope.message}`).toBe(true)
    expect(envelope.success).toBe(true)
    return envelope.data as T
  }
}

// Only calendars, equipment, workflows and draft work orders are created. No BOM or stock is inserted.
test('real worker shifts and day changes drive crew, load and single or batch plan dates', async ({ page, request }) => {
  test.setTimeout(120_000)
  const api = apiFor(request, await login(page, 'demo-owner'))
  const oldCalendar = await api<Calendar>('GET', `${workers}/${workerId}`)
  if (oldCalendar.days.some(day => day.date === monday)) await api('DELETE', `${workers}/${workerId}/days/${monday}`)
  await api('PUT', `${workers}/${workerId}/shifts`, { shifts: [] })
  const orders: string[] = []
  let changedDay = false
  try {
    await page.goto(`/projects/${projectId}/settings`)
    const panel = page.getByRole('region', { name: 'Workers', exact: true })
    await panel.getByText(`${workerId} · No shifts set`, { exact: true }).click()
    const calendar = panel.getByRole('group', { name: `Worker ${workerId}`, exact: true })
    await calendar.getByRole('button', { name: 'Add shift', exact: true }).click()
    await calendar.getByRole('button', { name: 'Save shifts', exact: true }).click()
    await expect(calendar.getByRole('status')).toHaveText('Shifts saved: 40 h a week.')
    const availabilityPath = `${workers}/${workerId}/availability?from=${encodeURIComponent(dayStart)}&to=${encodeURIComponent(dayEnd)}`
    expect((await api<{ workingHours: number }>('GET', availabilityPath)).workingHours).toBe(8)

    const changes = calendar.getByRole('group', { name: 'Day changes', exact: true })
    await changes.getByLabel('Changed day', { exact: true }).fill(monday)
    if (await changes.getByLabel('Day shift 1 start').count() === 0) {
      await changes.getByRole('button', { name: 'Add day shift', exact: true }).click()
    }
    await changes.getByLabel('Day shift 1 start').fill('10:00')
    await changes.getByLabel('Day shift 1 end').fill('12:00')
    await changes.getByLabel('Day change reason').fill('Browser planning check')
    const savedDay = page.waitForResponse(reply => reply.request().method() === 'PUT'
      && new URL(reply.url()).pathname === `/api${workers}/${workerId}/days/${monday}`)
    await changes.getByRole('button', { name: 'Save day', exact: true }).click()
    expect((await savedDay).status()).toBe(200)
    changedDay = true
    await expect(changes).toContainText(monday)
    await expect(changes).toContainText('10:00')
    await expect(changes).toContainText('12:00')
    expect((await api<{ workingHours: number }>('GET', availabilityPath)).workingHours).toBe(2)

    const tag = Date.now()
    const workflow = await api<{ workflowId: string }>('POST', '/workflows', { projectId, workflowName: `Worker browser ${tag}` })
    const equipment = await api<{ equipmentId: string }>('POST', '/equipments', { projectId, equipmentCode: `WK-${tag}`,
      equipmentName: 'Worker browser press', equipmentType: 'machine', equipmentStatus: 'active', details: { capacityPerHour: 10 } })
    const title = `Worker link ${tag}`
    const first = await api<Order>('POST', '/work-orders', { projectId, workflowId: workflow.workflowId,
      workOrderTitle: title, targetQuantity: 10, plannedStartAt: from, plannedEndAt: `${monday}T17:00:00+09:00` })
    orders.push(first.workOrderId)
    expect(first.bomId).toBeNull()
    await api('PUT', `/work-orders/${first.workOrderId}/equipment`, { equipmentId: equipment.equipmentId })

    await page.goto(`/projects/${projectId}/runs?view=work-orders`)
    await page.getByRole('row', { name: new RegExp(title) }).getByRole('button', { name: 'Readiness', exact: true }).click()
    const crew = page.getByRole('group', { name: 'Crew', exact: true })
    await crew.getByText('Choose crew', { exact: true }).click()
    await crew.getByRole('checkbox', { name: `${workerId} · 40 h a week` }).check()
    await crew.getByRole('button', { name: 'Save crew', exact: true }).click()
    await expect(crew.getByRole('button', { name: 'Save crew', exact: true })).toBeDisabled()
    expect((await api<Crew>('GET', `/work-orders/${first.workOrderId}/crew`)).members)
      .toEqual([expect.objectContaining({ userId: workerId, sharePercent: 100 })])
    const dates = page.locator('[aria-label="Plan dates"]')
    await dates.getByLabel('Plan from').fill(`${monday}T09:00`)
    const suggested = page.waitForResponse(reply => new URL(reply.url()).pathname === `/api/work-orders/${first.workOrderId}/plan-suggestion`)
    await dates.getByRole('button', { name: 'Suggest dates', exact: true }).click()
    const planReply = await suggested
    expect(planReply.status()).toBe(200)
    const plan = (await planReply.json()).data as Plan
    expect(new Date(plan.plannedStartAt).toISOString()).toBe(`${monday}T01:00:00.000Z`)
    expect(new Date(plan.plannedEndAt).toISOString()).toBe(`${monday}T02:00:00.000Z`)
    expect(plan.waitedForCrew).toContain(workerId)
    await expect(dates.getByRole('status')).toContainText(`waits for ${workerId}`)
    const stored = page.waitForResponse(reply => reply.request().method() === 'PUT'
      && new URL(reply.url()).pathname === `/api/work-orders/${first.workOrderId}`)
    await dates.getByRole('button', { name: 'Use these dates', exact: true }).click()
    expect((await stored).status()).toBe(200)
    const actual = await api<Order>('GET', `/work-orders/${first.workOrderId}`)
    expect(new Date(actual.plannedStartAt!).toISOString()).toBe(`${monday}T01:00:00.000Z`)
    expect(actual.bomId).toBeNull()

    const second = await api<Order>('POST', '/work-orders', { projectId, workflowId: workflow.workflowId,
      workOrderTitle: `Worker batch ${tag}`, targetQuantity: 10 })
    orders.push(second.workOrderId)
    await api('PUT', `/work-orders/${second.workOrderId}/equipment`, { equipmentId: equipment.equipmentId })
    await api('PUT', `/work-orders/${second.workOrderId}/crew`, { members: [{ userId: workerId, sharePercent: 100 }] })
    const batch = await api<{ lines: { suggestion: Plan; problem: string | null }[] }>('POST', '/work-orders/plan-suggestions',
      { projectId, workOrderIds: orders, from })
    expect(batch.lines.map(line => line.problem)).toEqual([null, null])
    expect(batch.lines.map(line => new Date(line.suggestion.plannedStartAt).toISOString()))
      .toEqual([`${monday}T01:00:00.000Z`, `${monday}T02:00:00.000Z`])
    expect((await api<Order>('GET', `/work-orders/${second.workOrderId}`)).plannedStartAt).toBeNull()
    const loadPath = `/worker-load?projectId=${projectId}&from=${encodeURIComponent(dayStart)}&to=${encodeURIComponent(dayEnd)}`
    let load = (await api<{ workers: Load[] }>('GET', loadPath)).workers.find(one => one.userId === workerId)!
    expect(load).toMatchObject({ shiftHours: 2, plannedHours: 0, draftHours: 1 })
    await crew.getByLabel(`${workerId} share`).fill('50')
    await crew.getByRole('button', { name: 'Save crew', exact: true }).click()
    await expect(crew.getByRole('button', { name: 'Save crew', exact: true })).toBeDisabled()
    expect((await api<Crew>('GET', `/work-orders/${first.workOrderId}/crew`)).members[0].sharePercent).toBe(50)
    load = (await api<{ workers: Load[] }>('GET', loadPath)).workers.find(one => one.userId === workerId)!
    expect(load.draftHours).toBe(0.5)
    const halfPlan = await api<Plan>('GET', `/work-orders/${first.workOrderId}/plan-suggestion?from=${encodeURIComponent(from)}`)
    expect(new Date(halfPlan.plannedStartAt).toISOString()).toBe(`${monday}T00:00:00.000Z`)

    // The owner can apply a batch proposal to approved orders through the schedule commands.
    await api('PUT', `/work-orders/${first.workOrderId}/crew`, { members: [{ userId: workerId, sharePercent: 100 }] })
    for (const id of orders) await api('POST', `/work-orders/${id}/approve`, {})
    await page.reload()
    const batchPanel = page.getByRole('region', { name: 'Plan several orders', exact: true })
    await batchPanel.getByText('Plan several orders', { exact: true }).click()
    await batchPanel.getByRole('checkbox', { name: new RegExp(title) }).check()
    await batchPanel.getByRole('checkbox', { name: new RegExp(`Worker batch ${tag}`) }).check()
    await batchPanel.getByLabel('Plan several from', { exact: true }).fill('2041-03-11T09:00')
    const approvedPlan = page.waitForResponse(reply => reply.request().method() === 'POST'
      && new URL(reply.url()).pathname === '/api/work-orders/plan-suggestions')
    await batchPanel.getByRole('button', { name: 'Suggest dates for 2 orders', exact: true }).click()
    expect((await approvedPlan).status()).toBe(200)
    const reschedules = batchPanel.getByRole('group', { name: 'Reschedule approved orders', exact: true })
    const rescheduleButton = reschedules.getByRole('button', { name: 'Reschedule 2 approved orders', exact: true })
    await expect(rescheduleButton).toBeDisabled()
    const reason = 'Plan the approved crew orders together'
    await reschedules.getByLabel('Reschedule reason', { exact: true }).fill(reason)
    const commands = Promise.all(orders.map(id => page.waitForResponse(reply => reply.request().method() === 'POST'
      && new URL(reply.url()).pathname === `/api/work-orders/${id}/reschedules`)))
    await rescheduleButton.click()
    expect((await commands).map(reply => reply.status())).toEqual([200, 200])
    await expect(batchPanel.getByRole('status', { name: 'Rescheduled', exact: true }))
      .toHaveText('Rescheduled 2 approved orders.')
    for (const [index, id] of orders.entries()) {
      const scheduled = await api<Order>('GET', `/work-orders/${id}`)
      expect(scheduled.bomId).toBeNull()
      expect(new Date(scheduled.plannedStartAt!).toISOString()).toBe(`2041-03-11T0${index}:00:00.000Z`)
      expect(new Date(scheduled.plannedEndAt!).toISOString()).toBe(`2041-03-11T0${index + 1}:00:00.000Z`)
      const history = await api<{ reason: string; changedBy: string }[]>('GET', `/work-orders/${id}/reschedules`)
      expect(history).toEqual([expect.objectContaining({ reason, changedBy: 'demo-owner' })])
    }
  } finally {
    for (const id of orders) await api('POST', `/work-orders/${id}/cancel`, {})
    if (changedDay) await api('DELETE', `${workers}/${workerId}/days/${monday}`)
    await api('PUT', `${workers}/${workerId}/shifts`, { shifts: [] })
  }
})

test('a real viewer can read worker calendars but their own shift save is refused', async ({ page, request }) => {
  test.setTimeout(60_000)
  const viewer = 'worker-e2e-viewer'
  const headers = await login(page, viewer)
  const api = apiFor(request, headers)
  await page.goto(`/projects/${projectId}/settings`)
  const panel = page.getByRole('region', { name: 'Workers', exact: true })
  await panel.getByText(`${viewer} · No shifts set`, { exact: true }).click()
  const calendar = panel.getByRole('group', { name: `Worker ${viewer}`, exact: true })
  await calendar.getByRole('button', { name: 'Add shift', exact: true }).click()
  const rejected = page.waitForResponse(reply => reply.request().method() === 'PUT'
    && new URL(reply.url()).pathname === `/api${workers}/${viewer}/shifts`)
  await calendar.getByRole('button', { name: 'Save shifts', exact: true }).click()
  expect((await rejected).status()).toBe(403)
  await expect(calendar.getByRole('alert')).toBeVisible()
  expect(await api<Calendar>('GET', `${workers}/${viewer}`)).toMatchObject({ calendarSet: false, shifts: [] })
  const dayReply = await request.put(`/api${workers}/${viewer}/days/${monday}`, { headers, data: { shifts: [] } })
  expect(dayReply.status()).toBe(403)
  expect((await api<Calendar>('GET', `${workers}/${viewer}`)).days).toEqual([])
})
