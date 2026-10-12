import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * The day a closed nonconformity's actions are due to be checked (docs/domain/nonconformity.md N13) against a mocked API:
 * closing asks for a day (a month on by default, never before today), the list says when a check is due or overdue, and the
 * day can be moved until the check is recorded.
 */
test('closing a nonconformity sets the day its actions are due to be checked', async ({ page }) => {
  const ncr = (nonconformityId: string, ncrNo: string, title: string, status: 'open' | 'closed', verificationDueDate: string | null,
    verificationOverdue: boolean) => ({
    nonconformityId, projectId: 'prj-e2e', ncrNo, title, description: null, severity: 'major', status, itemId: null,
    itemCode: 'HOUSING', lotId: null, lotNo: null, productionRunId: null, runNumber: null, rootCause: 'Worn mould',
    disposition: 'rework', raisedBy: 'demo-owner', raisedAt: '2026-09-01T00:00:00Z',
    closedBy: status === 'closed' ? 'demo-owner' : null, closedAt: status === 'closed' ? '2026-09-02T00:00:00Z' : null,
    closureNote: null, verificationResult: null, verificationNote: null, verifiedBy: null, verifiedAt: null,
    verificationDueDate, verificationOverdue, defects: [],
    actions: [{
      correctiveActionId: `${nonconformityId}-a1`, actionNo: 1, actionType: 'corrective', description: 'Replace the mould',
      ownerId: null, dueDate: null, status: 'done', resultNote: 'New mould', createdBy: 'demo-owner',
      createdAt: '2026-09-01T00:00:00Z', finishedBy: 'demo-owner', finishedAt: '2026-09-02T00:00:00Z', overdue: false,
    }],
    openActions: 0, overdueActions: 0,
  })
  const ncrs = [
    ncr('ncr-late', 'NCR-0001', 'Scratched lids', 'closed', '2026-09-01', true),
    ncr('ncr-open', 'NCR-0002', 'Cracked housings', 'open', null, false),
  ]
  const sent: { path: string; body: unknown }[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url
    if (await answerAuth(route, pathname)) return
    const closing = pathname.match(/^\/api\/nonconformities\/([^/]+)\/close$/)
    const moving = pathname.match(/^\/api\/nonconformities\/([^/]+)\/verification-due$/)
    if (request.method() === 'POST' && closing) {
      const body = request.postDataJSON() as { verificationDueDate: string | null }
      sent.push({ path: pathname, body })
      const found = ncrs.find((one) => one.nonconformityId === closing[1])!
      Object.assign(found, { status: 'closed', closedBy: 'demo-owner', closedAt: '2026-10-11T00:00:00Z',
        verificationDueDate: body.verificationDueDate, verificationOverdue: false })
      return ok(route, found)
    }
    if (request.method() === 'PUT' && moving) {
      const body = request.postDataJSON() as { verificationDueDate: string | null }
      sent.push({ path: pathname, body })
      const found = ncrs.find((one) => one.nonconformityId === moving[1])!
      Object.assign(found, { verificationDueDate: body.verificationDueDate, verificationOverdue: false })
      return ok(route, found)
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/nonconformities') {
      const status = url.searchParams.get('status')
      return ok(route, ncrs.filter((one) => !status || one.status === status))
    }
    if (pathname === '/api/quality/summary') {
      return ok(route, { inspections: 0, passed: 0, failed: 0, passRate: null, openDefects: 0, resolvedDefects: 0,
        defectsByType: [], failuresByCheck: [], byItem: [] })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/inventory?tab=quality')
  const section = page.getByRole('region', { name: 'Nonconformities' })
  const list = section.getByRole('table', { name: 'Nonconformity list' })
  await list.getByRole('row', { name: /NCR-0002/ }).getByRole('button', { name: 'Open' }).click({ timeout: 15_000 })

  // A month on is suggested; a day before today is refused before anything is sent.
  const detail = section.getByRole('article', { name: 'Nonconformity NCR-0002' })
  const checkBy = detail.getByLabel('Check the actions by')
  await expect(checkBy).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)
  await checkBy.fill('2000-01-01')
  await detail.getByRole('button', { name: 'Close nonconformity' }).click()
  await expect(detail.getByRole('alert')).toHaveText('The check date is before today.')
  expect(sent).toHaveLength(0)
  await checkBy.fill('2030-02-01')
  await detail.getByRole('button', { name: 'Close nonconformity' }).click()
  await expect(list.getByRole('row', { name: /NCR-0002/ })).toHaveCount(0)
  expect(sent[0]).toEqual({ path: '/api/nonconformities/ncr-open/close', body: { note: '', verificationDueDate: '2030-02-01' } })

  // The closed list says when each check is due, in red once the day has passed.
  await section.getByLabel('Nonconformity status').selectOption('closed')
  await expect(list.getByRole('row', { name: /NCR-0002/ })).toContainText('closed · check by 2030-02-01')
  await expect(list.getByRole('row', { name: /NCR-0001/ })).toContainText('closed · check overdue (due 2026-09-01)')

  // An overdue check is moved to a new day.
  await list.getByRole('row', { name: /NCR-0001/ }).getByRole('button', { name: 'Open' }).click()
  const late = section.getByRole('article', { name: 'Nonconformity NCR-0001' })
  const checkDate = late.getByRole('form', { name: 'Check date' })
  await expect(checkDate).toContainText('The check was due 2026-09-01')
  await checkDate.getByLabel('New check date').fill('2030-03-01')
  await checkDate.getByRole('button', { name: 'Save check date' }).click()
  await expect(checkDate).toContainText('Check by 2030-03-01')
  await expect(list.getByRole('row', { name: /NCR-0001/ })).toContainText('closed · check by 2030-03-01')
  expect(sent[1]).toEqual({ path: '/api/nonconformities/ncr-late/verification-due', body: { verificationDueDate: '2030-03-01' } })
})
