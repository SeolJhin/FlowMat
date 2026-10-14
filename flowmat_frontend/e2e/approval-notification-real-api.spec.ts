import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

test.skip(!process.env.REAL_API_E2E || process.env.FLOWMAT_APPROVAL_E2E_DISPOSABLE !== '1',
  'Needs an explicitly disposable backend and approval notification fixture')
test.use({ trace: 'off' })

interface Notification {
  notificationId: string
  projectId: string
  refId: string
  refType: string
  type: string
  title: string
  body: string
  read: boolean
}
interface Run { productionRunId: string; runNumber: string; actualOutputQty: number }
interface Correction { productionRunCorrectionId: string; status: string }

async function apiFor(request: APIRequestContext, userId: string) {
  const login = await request.post('/api/auth/login', { data: { userIdOrEmail: userId, password: 'demo1234' } })
  expect(login.ok()).toBe(true)
  const session = { headers: { Authorization: `Bearer ${(await login.json()).data.accessToken}` } }
  async function api<T>(method: string, path: string, data?: unknown): Promise<T> {
    const response = await request.fetch(`/api${path}`, { method, headers: session.headers, data, timeout: 10_000 })
    const envelope = await response.json()
    expect(response.ok(), `${method} ${path}: ${envelope.message}`).toBe(true)
    expect(envelope.success).toBe(true)
    return envelope.data as T
  }
  return { session, api }
}

async function loginUi(page: Page, userId: string) {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'demo-owner' }).fill(userId)
  await page.getByRole('textbox', { name: '••••••••' }).fill('demo1234')
  const reply = page.waitForResponse(response => response.request().method() === 'POST'
    && new URL(response.url()).pathname === '/api/auth/login')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  const response = await reply
  expect(response.ok()).toBe(true)
  const headers = { Authorization: `Bearer ${(await response.json()).data.accessToken}` }
  await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible()
  return headers
}

async function finishedRun(owner: Awaited<ReturnType<typeof apiFor>>, projectId: string) {
  const workflow = await owner.api<{ workflowId: string }>('POST', '/workflows', {
    projectId, workflowName: `Approval browser ${Date.now()}`,
  })
  const run = await owner.api<Run>('POST', '/production-runs/start', {
    projectId, workflowId: workflow.workflowId, plannedOutputQty: 1,
  })
  await owner.api('POST', `/production-runs/${run.productionRunId}/finish`, { actualOutputQty: 1 })
  return run
}

const corrections = (run: Run) => `/production-runs/${run.productionRunId}/corrections`
async function notificationsFor(user: Awaited<ReturnType<typeof apiFor>>, run: Run) {
  return (await user.api<Notification[]>('GET', '/notifications'))
    .filter(notification => notification.refId === run.productionRunId)
}

// No BOM, material, stock or item fixture is created: only a finished run's reported output changes.
test('real correction approvals notify both directions and open the run from Home', async ({ page, request, browser }) => {
  test.setTimeout(90_000)
  const projectId = 'prj_approval_e2e'
  const owner = await apiFor(request, 'demo-owner')
  const editor = await apiFor(request, 'approval-e2e-editor')
  const viewer = await apiFor(request, 'approval-e2e-viewer')
  const run = await finishedRun(owner, projectId)
  const reason = `<img src=x onerror="window.approvalInjection=true"> recount ${run.runNumber}`
  const first = await editor.api<Correction>('POST', corrections(run), {
    reason, lines: [{ kind: 'set_output_qty', afterQty: 2 }],
  })
  const asked = await notificationsFor(owner, run)
  expect(asked).toHaveLength(1)
  expect(asked[0]).toMatchObject({ type: 'correction_approval', projectId,
    refType: 'production_run', body: reason, read: false })
  expect(await notificationsFor(editor, run)).toEqual([])
  expect(await notificationsFor(viewer, run)).toEqual([])
  for (const actor of [editor, viewer]) {
    const refused = await request.post(`/api${corrections(run)}/${first.productionRunCorrectionId}/approve`,
      { headers: actor.session.headers })
    expect(refused.status()).toBe(403)
    const hidden = await request.post(`/api/notifications/${asked[0].notificationId}/read`,
      { headers: actor.session.headers })
    expect(hidden.status()).toBe(404)
  }

  owner.session.headers = await loginUi(page, 'demo-owner')
  const panel = page.getByRole('region', { name: 'Notifications', exact: true })
  const row = panel.getByRole('listitem', { name: asked[0].title, exact: true })
  await expect(row).toContainText(reason)
  await expect(row.locator('img')).toHaveCount(0)
  expect(await page.evaluate(() => 'approvalInjection' in window)).toBe(false)
  const href = `/projects/${projectId}/runs/${run.productionRunId}`
  await expect(row.getByRole('link', { name: 'Open', exact: true })).toHaveAttribute('href', href)
  const read = page.waitForResponse(response => new URL(response.url()).pathname === `/api/notifications/${asked[0].notificationId}/read`)
  await row.getByRole('link', { name: 'Open', exact: true }).click()
  expect((await read).status()).toBe(200)
  await expect(page).toHaveURL(new RegExp(`${run.productionRunId}$`))
  const correctionPanel = page.getByRole('region', { name: 'Corrections', exact: true })
  const firstRow = correctionPanel.getByRole('listitem', { name: 'Correction #1', exact: true })
  const rejection = page.waitForResponse(response => response.request().method() === 'POST'
    && new URL(response.url()).pathname === `/api${corrections(run)}/${first.productionRunCorrectionId}/reject`)
  page.once('dialog', dialog => dialog.accept('Recount first'))
  await firstRow.getByRole('button', { name: 'Reject', exact: true }).click()
  expect((await rejection).status()).toBe(200)
  await expect(firstRow).toContainText('Recount first')
  expect((await notificationsFor(editor, run))[0]).toMatchObject({ type: 'correction_decision', body: 'Recount first' })

  const second = await editor.api<Correction>('POST', corrections(run), {
    reason: 'Recounted two', lines: [{ kind: 'set_output_qty', afterQty: 2 }],
  })
  await page.reload()
  const secondRow = correctionPanel.getByRole('listitem', { name: 'Correction #2', exact: true })
  const approval = page.waitForResponse(response => response.request().method() === 'POST'
    && new URL(response.url()).pathname === `/api${corrections(run)}/${second.productionRunCorrectionId}/approve`)
  page.once('dialog', dialog => dialog.accept())
  await secondRow.getByRole('button', { name: 'Approve', exact: true }).click()
  expect((await approval).status()).toBe(200)
  await expect(secondRow).toContainText('Approved')
  const decisions = await notificationsFor(editor, run)
  expect(decisions).toHaveLength(2)
  expect(decisions[0]).toMatchObject({ type: 'correction_decision', body: 'Its changes are applied.' })
  expect((await owner.api<Run>('GET', `/production-runs/${run.productionRunId}`)).actualOutputQty).toBe(2)
  const replay = await request.post(`/api${corrections(run)}/${second.productionRunCorrectionId}/approve`,
    { headers: owner.session.headers })
  expect(replay.status()).toBe(409)
  expect(await notificationsFor(editor, run)).toHaveLength(2)
  expect(await notificationsFor(viewer, run)).toEqual([])

  // Keep the recipient's session separate; an unrelated logout/navigation race must not drive this acceptance test.
  const editorContext = await browser.newContext()
  try {
    const editorPage = await editorContext.newPage()
    await loginUi(editorPage, 'approval-e2e-editor')
    const recipientPanel = editorPage.getByRole('region', { name: 'Notifications', exact: true })
    const decisionRow = recipientPanel.getByRole('listitem', { name: decisions[0].title, exact: true })
    await expect(decisionRow.getByRole('link', { name: 'Open', exact: true })).toHaveAttribute('href', href)
    await decisionRow.getByRole('link', { name: 'Open', exact: true }).click()
    await expect(editorPage.getByRole('region', { name: 'Corrections', exact: true })).toContainText('Recounted two')
  } finally {
    await editorContext.close()
  }
})

test('revoked requesters cannot read existing or later approval decisions', async ({ page, request }) => {
  test.setTimeout(60_000)
  const projectId = 'prj_approval_revoked_e2e'
  const owner = await apiFor(request, 'demo-owner')
  const editor = await apiFor(request, 'approval-e2e-editor')
  const run = await finishedRun(owner, projectId)
  const secret = `Private decision ${run.productionRunId}`
  const first = await editor.api<Correction>('POST', corrections(run), {
    reason: 'First recount', lines: [{ kind: 'set_output_qty', afterQty: 2 }],
  })
  await owner.api('POST', `${corrections(run)}/${first.productionRunCorrectionId}/reject`, { note: secret })
  const prior = await notificationsFor(editor, run)
  expect(prior).toHaveLength(1)
  const second = await editor.api<Correction>('POST', corrections(run), {
    reason: 'Another recount', lines: [{ kind: 'set_output_qty', afterQty: 2 }],
  })
  const members = await owner.api<{ userId: string; projectMemberId: string }[]>('GET', `/project-members?projectId=${projectId}`)
  const member = members.find(row => row.userId === 'approval-e2e-editor')
  expect(member).toBeDefined()
  await owner.api('DELETE', `/project-members/${member!.projectMemberId}`)
  await owner.api('POST', `${corrections(run)}/${second.productionRunCorrectionId}/reject`, { note: `${secret} later` })
  expect(await notificationsFor(editor, run)).toEqual([])
  const visible = await editor.api<Notification[]>('GET', '/notifications')
  expect((await editor.api<{ unread: number }>('GET', '/notifications/unread-count')).unread)
    .toBe(visible.filter(row => !row.read).length)
  const deniedRead = await request.post(`/api/notifications/${prior[0].notificationId}/read`, { headers: editor.session.headers })
  expect(deniedRead.status()).toBe(404)
  const deniedRun = await request.get(`/api/production-runs/${run.productionRunId}`, { headers: editor.session.headers })
  expect(deniedRun.status()).toBe(403)
  await loginUi(page, 'approval-e2e-editor')
  await expect(page.getByRole('region', { name: 'Notifications', exact: true })).not.toContainText(secret)
})
