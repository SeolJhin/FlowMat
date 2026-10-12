import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

test('an unread notification outside the newest hundred still appears in the count and can be marked read', async ({ page }) => {
  let unread = 1
  const calls: string[] = []
  const newest = Array.from({ length: 100 }, (_, index) => ({
    notificationId: `read-${index}`, type: 'stock_alert', title: `Recent read alert ${index}`, body: null,
    projectId: 'prj-e2e', refType: 'stock_alert', refId: `alert-${index}`,
    read: true, readAt: '2026-10-12T00:00:00Z', createdAt: '2026-10-12T00:00:00Z',
  }))
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'GET' && pathname === '/api/notifications/unread-count') return ok(route, { unread })
    if (request.method() === 'GET' && pathname === '/api/notifications') return ok(route, newest)
    if (request.method() === 'POST' && pathname === '/api/notifications/read-all') {
      calls.push(pathname)
      unread = 0
      return ok(route, { marked: 1 })
    }
    if (request.method() === 'GET') return ok(route, [])
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, data: null }) })
  })
  await mockedLogin(page)
  const panel = page.getByRole('region', { name: 'Notifications', exact: true })
  await expect(panel.getByRole('listitem')).toHaveCount(20)
  await expect(panel).toContainText('1 unread')
  await expect(panel).not.toContainText('All read')
  await panel.getByRole('button', { name: 'Mark all read', exact: true }).click()
  await expect(panel).toContainText('All read')
  await expect(panel.getByRole('button', { name: 'Mark all read', exact: true })).toHaveCount(0)
  expect(calls).toEqual(['/api/notifications/read-all'])
})

test('a failed count request cannot claim all notifications are read', async ({ page }) => {
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/notifications/unread-count') {
      return route.fulfill({ status: 503, contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Unread count temporarily unavailable', data: null }) })
    }
    if (request.method() === 'GET') return ok(route, [])
    return route.fulfill({ status: 404 })
  })
  await mockedLogin(page)
  const panel = page.getByRole('region', { name: 'Notifications', exact: true })
  await expect(panel.getByRole('alert')).toContainText('Unread count temporarily unavailable')
  await expect(panel).not.toContainText('All read')
})

test('a filtered empty recent list does not hide accessible older unread notifications', async ({ page }) => {
  let unread = 1
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/notifications/unread-count') return ok(route, { unread })
    if (request.method() === 'POST' && pathname === '/api/notifications/read-all') {
      unread = 0
      return ok(route, { marked: 1 })
    }
    if (request.method() === 'GET') return ok(route, [])
    return route.fulfill({ status: 404 })
  })
  await mockedLogin(page)
  const panel = page.getByRole('region', { name: 'Notifications', exact: true })
  await expect(panel).toContainText('1 unread')
  await expect(panel).toContainText('Unread notifications are outside this list.')
  await expect(panel).not.toContainText('Nothing new for you.')
  await panel.getByRole('button', { name: 'Mark all read', exact: true }).click()
  await expect(panel).toContainText('All read')
  await expect(panel).toContainText('Nothing new for you.')
})
