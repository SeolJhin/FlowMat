import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * Notifications of work given to the person (docs/domain/notification.md NT5) on Home against a mocked API: unread ones
 * stand out, lead to the screen of the work, and are marked read one by one or all at once.
 */
test('home lists the work given to the person and marks it read', async ({ page }) => {
  const notification = (notificationId: string, type: string, title: string, body: string, refType: string, read: boolean) => ({
    notificationId, type, title, body, projectId: 'prj-e2e', refType, refId: `${refType}-1`, read, readAt: read ? '2026-10-11T01:00:00Z' : null,
    createdAt: '2026-10-11T00:00:00Z',
  })
  const notifications = [
    notification('n-3', 'warehouse_task', 'Putaway task WT-0007 is yours', 'From DOCK-1 to SHELF-2.', 'warehouse_task', false),
    notification('n-2', 'ncr_action', 'Action 1 of NCR-0004 is yours', 'Change the die · due 2030-01-31', 'nonconformity', false),
    notification('n-1', 'ncr_action', 'Action 2 of NCR-0003 is yours', 'Sort the lot', 'nonconformity', true),
  ]
  const marked: string[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    const reading = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/)
    if (request.method() === 'POST' && reading) {
      marked.push(reading[1])
      const found = notifications.find((one) => one.notificationId === reading[1])!
      Object.assign(found, { read: true, readAt: '2026-10-11T02:00:00Z' })
      return ok(route, found)
    }
    if (request.method() === 'POST' && pathname === '/api/notifications/read-all') {
      marked.push('all')
      const unread = notifications.filter((one) => !one.read)
      unread.forEach((one) => Object.assign(one, { read: true, readAt: '2026-10-11T02:00:00Z' }))
      return ok(route, { marked: unread.length })
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/notifications') return ok(route, notifications)
    if (pathname === '/api/notifications/unread-count') return ok(route, { unread: notifications.filter((one) => !one.read).length })
    return ok(route, [])
  })

  await mockedLogin(page)
  const panel = page.getByRole('region', { name: 'Notifications' })
  await expect(panel).toContainText('2 unread', { timeout: 15_000 })
  const action = panel.getByRole('listitem', { name: 'Action 1 of NCR-0004 is yours' })
  await expect(action).toContainText('New')
  await expect(action).toContainText('Change the die · due 2030-01-31')
  await expect(action.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/projects/prj-e2e/inventory?tab=quality')
  await expect(panel.getByRole('listitem', { name: 'Putaway task WT-0007 is yours' }).getByRole('link', { name: 'Open' }))
    .toHaveAttribute('href', '/projects/prj-e2e/inventory?tab=tasks')
  // A read one has nothing left to mark.
  await expect(panel.getByRole('listitem', { name: 'Action 2 of NCR-0003 is yours' }).getByRole('button', { name: 'Mark read' }))
    .toHaveCount(0)

  await action.getByRole('button', { name: 'Mark read' }).click()
  await expect(panel).toContainText('1 unread')
  await expect(action).not.toContainText('New')
  await panel.getByRole('button', { name: 'Mark all read' }).click()
  await expect(panel).toContainText('All read')
  await expect(panel.getByRole('button', { name: 'Mark all read' })).toHaveCount(0)
  expect(marked).toEqual(['n-2', 'all'])
})
