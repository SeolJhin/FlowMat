import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * A LOT waiting for its receipt checks (docs/domain/lot-release.md) against a mocked API: the LOT detail says it is held,
 * Release LOT shows the server's refusal while a check is missing, and releases once the server allows it. A closed LOT
 * offers Reopen LOT.
 */
test('a held LOT is released after its receipt checks and a closed one is reopened', async ({ page }) => {
  const lot = (lotId: string, lotNo: string, lotStatus: string) => ({
    lotId, projectId: 'prj-e2e', itemId: 'flour', lotNo, serialNo: null, lotStatus, receivedAt: null, producedAt: null,
    expiryDate: null, productionRunId: null, quantityOnHand: 0, quantityReserved: 0, expired: false,
  })
  const lots = [lot('held', 'HELD-1', 'inspection_pending'), lot('done', 'DONE-1', 'closed')]
  let releaseCalls = 0
  const reopened: string[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'POST' && pathname === '/api/lots/held/release') {
      releaseCalls += 1
      if (releaseCalls === 1) {
        return route.fulfill({ status: 409, contentType: 'application/json',
          body: JSON.stringify({ success: false, data: null, message: 'Before releasing LOT HELD-1: record Moisture.' }) })
      }
      lots[0] = { ...lots[0], lotStatus: 'available' }
      return ok(route, { lotId: 'held', lotNo: 'HELD-1', lotStatus: 'available' })
    }
    if (request.method() === 'POST' && pathname === '/api/lots/done/reopen') {
      reopened.push('done')
      lots[1] = { ...lots[1], lotStatus: 'consumed' }
      return ok(route, lots[1])
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/lots') return ok(route, lots)
    if (pathname === '/api/items') {
      return ok(route, [{ itemId: 'flour', projectId: 'prj-e2e', itemCode: 'FLOUR', itemName: 'flour', itemType: 'material',
        resourceCategory: 'material', resourceType: null, unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'Y',
        lotReleaseRequiredYn: 'Y' }])
    }
    const trace = pathname.match(/^\/api\/lots\/([^/]+)\/trace$/)
    if (trace) {
      const found = lots.find((one) => one.lotId === trace[1]) ?? lots[0]
      return ok(route, { lot: found, direction: 'backward', nodes: [] })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/inventory?tab=lots')
  await page.getByRole('row', { name: /HELD-1/ }).click()
  await expect(page.getByText('held until its receipt checks pass')).toBeVisible()

  await page.getByRole('button', { name: 'Release LOT' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'record Moisture' })).toBeVisible()
  await page.getByRole('button', { name: 'Release LOT' }).click()
  await expect(page.getByRole('button', { name: 'Release LOT' })).toHaveCount(0)
  expect(releaseCalls).toBe(2)

  await page.getByRole('row', { name: /DONE-1/ }).click()
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Reopen LOT' }).click()
  await expect.poll(() => reopened).toEqual(['done'])
  await expect(page.getByRole('button', { name: 'Reopen LOT' })).toHaveCount(0)
})
