import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const failure of ['network', 'gateway'] as const) {
  for (const refresh of ['none', 'reordered', 'removed'] as const) {
    test(`count retrieves its saved result after a lost ${failure} response${refresh === 'none' ? '' : ' and ' + refresh + ' stock refresh'}`, async ({ page }) => {
      const projectId = 'prj-count-retry'
      const item = { itemId: 'material', projectId, itemCode: 'MATERIAL', itemName: 'Material', itemType: 'material',
        resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: null }
      const first = { inventoryId: 'first', projectId, itemId: item.itemId, lotId: null, quantity: 10, reservedQuantity: 0,
        availableQuantity: 10, location: 'SRC', inventoryStatus: 'available', minThreshold: null, maxThreshold: null,
        stockLevel: 'ok', version: 1, lastCheckedAt: null, lastCheckedBy: null }
      const second = { ...first, inventoryId: 'second', quantity: 5, availableQuantity: 5, location: 'OTHER' }
      let rows = [first, second]
      const requests: { requestId: string; lines: { inventoryId: string; countedQuantity: number; expectedQuantity: number }[] }[] = []
      const saved = new Map<string, unknown>()
      let adjustments = 0
      await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
        const request = route.request()
        const { pathname } = new URL(request.url())
        if (await answerAuth(route, pathname)) return
        if (request.method() === 'POST' && pathname === '/api/inventory-counts') {
          const body = request.postDataJSON() as (typeof requests)[number]
          requests.push(body)
          if (!saved.has(body.requestId)) {
            if (body.lines.some((line) => rows.find((row) => row.inventoryId === line.inventoryId)?.quantity !== line.expectedQuantity)) {
              return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({
                success: false, data: null, message: 'The stock changed since the count started. Count it again.',
              }) })
            }
            const lines = body.lines.map((line) => {
              const row = rows.find((candidate) => candidate.inventoryId === line.inventoryId)!
              const quantityBefore = row.quantity
              row.quantity = line.countedQuantity
              row.availableQuantity = line.countedQuantity
              adjustments++
              return { ...line, quantityBefore, difference: row.quantity - quantityBefore, inventoryTransactionId: `tx-${adjustments}` }
            })
            saved.set(body.requestId, { countId: 'original-count', adjusted: lines.length, unchanged: 0, lines })
          }
          if (requests.length === 1) {
            if (failure === 'network') return route.abort('failed')
            return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Gateway response failed' }) })
          }
          return ok(route, saved.get(body.requestId))
        }
        if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
        if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Count retry', ownerId: 'demo-owner' }])
        if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Count retry', ownerId: 'demo-owner' })
        if (pathname === '/api/items') return ok(route, [item])
        if (pathname === '/api/inventories') return ok(route, rows)
        if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
        return ok(route, [])
      })
      await page.clock.install()
      await mockedLogin(page)
      await page.goto(`/projects/${projectId}/inventory?tab=count`)
      const form = page.getByRole('form', { name: 'Stock count', exact: true })
      await form.getByRole('textbox', { name: 'Counted MATERIAL · Material at SRC', exact: true }).fill('8')
      await form.getByRole('textbox', { name: 'Counted MATERIAL · Material at OTHER', exact: true }).fill('4')
      const submit = form.getByRole('button', { name: 'Apply count', exact: false })
      await submit.click()
      await expect(form).toContainText(failure === 'network' ? 'Failed to fetch' : 'Gateway response failed')
      await expect(form).toContainText('The count result is unconfirmed.')
      await expect(form.getByRole('textbox', { name: 'Counted MATERIAL · Material at OTHER', exact: true })).toBeDisabled()
      await expect(form.getByRole('textbox', { name: 'Note', exact: true })).toBeDisabled()
      await expect(form.getByLabel('Load counted sheet')).toBeDisabled()
      if (refresh !== 'none') {
        rows = refresh === 'removed' ? [second] : [second, first]
        const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/inventories')
        await page.clock.fastForward(31_000)
        await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
        await refreshed
        if (refresh === 'removed') await expect(form.getByRole('textbox', { name: 'Counted MATERIAL · Material at SRC', exact: true })).toHaveCount(0)
        else await expect(form.getByRole('row', { name: /MATERIAL.*SRC/ }).locator('td').nth(3)).toHaveText('8')
      }
      await submit.click()
      await expect(form.getByRole('status').filter({ hasText: 'Count applied:' })).toContainText('2 records adjusted')
      expect(requests).toHaveLength(2)
      expect(requests[0].requestId).toBe(requests[1].requestId)
      expect(requests[1].lines).toEqual(requests[0].lines)
      expect(adjustments).toBe(2)
      expect(first.quantity).toBe(8)
      expect(second.quantity).toBe(4)
    })
  }
}
