import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const mode of ['success', 'lost-empty', 'lost-new', 'gateway-new'] as const) {
  test(`expired write-off keeps its result and original scope after ${mode}`, async ({ page }) => {
    const projectId = 'prj-writeoff-recovery'
    const item = { itemId: 'material', projectId, itemCode: 'MATERIAL', itemName: 'Material', itemType: 'material',
      resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'Y', unitCost: 2 }
    const expired = { lotId: 'original', projectId, itemId: item.itemId, lotNo: 'EXPIRED', lotStatus: 'available',
      quantityOnHand: 5, quantityReserved: 0, quantityAvailable: 5, expiryDate: '2000-01-01', expired: true, receivedAt: null }
    const newlyExpired = { ...expired, lotId: 'new', lotNo: 'NEW-EXPIRED', quantityOnHand: 7, quantityAvailable: 7 }
    let lots = [expired]
    const requests: { requestId: string; lotIds: string[]; closeLots: boolean }[] = []
    const saved = new Map<string, unknown>()
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (request.method() === 'POST' && pathname === '/api/lots/expired/write-off') {
        const body = request.postDataJSON() as (typeof requests)[number]
        requests.push(body)
        if (!saved.has(body.requestId)) {
          const lines = body.lotIds.map((id) => {
            const lot = lots.find((candidate) => candidate.lotId === id)!
            const writtenOff = lot.quantityOnHand
            lot.quantityOnHand = 0
            lot.quantityAvailable = 0
            if (body.closeLots) lot.lotStatus = 'closed'
            return { lotId: id, lotNo: lot.lotNo, itemId: item.itemId, itemCode: item.itemCode, unit: 'kg',
              writtenOff, value: writtenOff * 2, closed: body.closeLots, note: null }
          })
          saved.set(body.requestId, { lots: lines.length, value: lines.reduce((sum, line) => sum + line.value, 0), valueComplete: true, lines })
        }
        if (requests.length === 1 && mode !== 'success') {
          if (mode === 'gateway-new') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Gateway response failed' }) })
          return route.abort('failed')
        }
        return ok(route, saved.get(body.requestId))
      }
      if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
      if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Writeoff recovery', ownerId: 'demo-owner' }])
      if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Writeoff recovery', ownerId: 'demo-owner' })
      if (pathname === '/api/items') return ok(route, [item])
      if (pathname === '/api/lots') return ok(route, lots)
      return ok(route, [])
    })
    page.on('dialog', (dialog) => void dialog.accept())
    await page.clock.install()
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/inventory?tab=lots`)
    const panel = page.locator('details[aria-label="Expiry outlook"]')
    await panel.getByRole('checkbox', { name: 'close the LOTs afterwards', exact: false }).check()
    await panel.getByRole('button', { name: 'Write off expired stock', exact: false }).click()
    if (mode !== 'success') {
      await expect(panel).toContainText(mode === 'gateway-new' ? 'Gateway response failed' : 'Failed to fetch')
      if (mode.endsWith('new')) lots = [expired, newlyExpired]
      const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/lots')
      await page.clock.fastForward(31_000)
      await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
      await refreshed
    }
    // Wait for the fresh table, so a transient success message before invalidation cannot make this pass.
    await expect(page.getByRole('row', { name: /EXPIRED.*MATERIAL/ }).filter({ hasNotText: 'NEW-EXPIRED' })).toContainText('closed')
    if (mode !== 'success') {
      const retry = panel.getByRole('button', { name: /Write off expired stock|Retry write-off/ })
      await expect(retry).toBeVisible()
      await retry.click()
      await expect.poll(() => requests.length).toBe(2)
      expect(requests[1].lotIds).toEqual(['original'])
      expect(requests[1].requestId).toBe(requests[0].requestId)
      expect(newlyExpired.quantityOnHand).toBe(7)
    }
    await expect(panel.getByRole('status').filter({ hasText: 'Wrote off' })).toContainText('LOT EXPIRED 5 kg (closed)')
    await expect(panel).toContainText('value 10')
    // Explicitly clearing the result is allowed after acknowledgement, never because stock was refreshed.
    await panel.getByRole('button', { name: 'Clear write-off result', exact: true }).click()
    if (mode.endsWith('new')) await expect(panel.getByRole('button', { name: 'Write off expired stock (1)', exact: true })).toBeVisible()
    else await expect(panel).toHaveCount(0)
  })
}