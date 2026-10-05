import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const change of ['changed', 'sheet', 'removed'] as const) {
  test(`stock count keeps its starting quantities after ${change} stock is refreshed`, async ({ page }) => {
    const projectId = 'prj-count-refresh'
    const item = { itemId: 'material', projectId, itemCode: 'MATERIAL', itemName: 'Material', itemType: 'material',
      resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: null }
    const first = { inventoryId: 'first', projectId, itemId: item.itemId, lotId: null, quantity: 10, reservedQuantity: 0,
      availableQuantity: 10, location: 'SRC', inventoryStatus: 'available', minThreshold: null, maxThreshold: null,
      stockLevel: 'ok', version: 1, lastCheckedAt: null, lastCheckedBy: null }
    const second = { ...first, inventoryId: 'second', quantity: 5, availableQuantity: 5, location: 'OTHER' }
    let rows = [first, second]
    const submitted: { inventoryId: string; countedQuantity: number; expectedQuantity: number }[][] = []
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (request.method() === 'POST' && pathname === '/api/inventory-counts') {
        const { lines } = request.postDataJSON() as { lines: (typeof submitted)[number] }
        submitted.push(lines)
        if (lines.some((line) => rows.find((row) => row.inventoryId === line.inventoryId)?.quantity !== line.expectedQuantity)) {
          return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({
            success: false, data: null, message: 'Stock moved while counting; count it again.',
          }) })
        }
        const done = lines.map((line) => {
          const stock = rows.find((row) => row.inventoryId === line.inventoryId)!
          const quantityBefore = stock.quantity
          stock.quantity = line.countedQuantity
          stock.availableQuantity = line.countedQuantity
          return { ...line, quantityBefore, difference: stock.quantity - quantityBefore, inventoryTransactionId: null }
        })
        return ok(route, { countId: 'count', adjusted: done.filter((line) => line.difference !== 0).length,
          unchanged: done.filter((line) => line.difference === 0).length, lines: done })
      }
      if (request.method() !== 'GET') {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Unexpected write' }) })
      }
      if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Count refresh', ownerId: 'demo-owner' }])
      if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Count refresh', ownerId: 'demo-owner' })
      if (pathname === '/api/items') return ok(route, [item])
      if (pathname === '/api/inventories') return ok(route, rows)
      if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
      return ok(route, [])
    })
    await page.clock.install()
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/inventory?tab=count`)
    const form = page.getByRole('form', { name: 'Stock count', exact: true })
    const firstInput = form.getByRole('textbox', { name: 'Counted MATERIAL · Material at SRC', exact: true })
    const secondInput = form.getByRole('textbox', { name: 'Counted MATERIAL · Material at OTHER', exact: true })
    await expect(firstInput).toBeVisible()
    if (change === 'sheet') {
      await form.getByLabel('Load counted sheet').setInputFiles({ name: 'count.csv', mimeType: 'text/csv',
        buffer: Buffer.from('inventory_id,counted\nfirst,8\n') })
      await expect(firstInput).toHaveValue('8')
    } else {
      await firstInput.fill('8')
      if (change === 'removed') await secondInput.fill('4')
    }
    if (change === 'removed') rows = [second]
    else Object.assign(first, { quantity: 12, availableQuantity: 12, version: 2 })
    // Make the shared 30-second query cache stale, then reproduce returning to this tab after another user moved stock.
    const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/inventories')
    await page.clock.fastForward(31_000)
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
    await refreshed
    if (change === 'removed') await expect(firstInput).toHaveCount(0)
    else await expect(form.getByRole('row', { name: /MATERIAL.*SRC/ }).locator('td').nth(3)).toHaveText('12')
    await form.getByRole('button', { name: 'Apply count', exact: false }).click()
    if (change === 'removed') {
      await expect(form.getByRole('alert')).toContainText('no longer available')
      expect(submitted).toHaveLength(0)
      expect(second.quantity).toBe(5)
    } else {
      await expect(form.getByRole('alert')).toContainText('Stock moved while counting')
      expect(submitted).toEqual([[{ inventoryId: 'first', countedQuantity: 8, expectedQuantity: 10 }]])
      expect(first.quantity).toBe(12)
    }
    // A deliberate clear and new physical count adopts the current quantity; the failed draft never silently rebases.
    await form.getByRole('button', { name: 'Clear counts', exact: true }).click()
    const input = change === 'removed' ? secondInput : firstInput
    await expect(input).toHaveValue('')
    await input.fill(change === 'removed' ? '4' : '8')
    await form.getByRole('button', { name: 'Apply count', exact: false }).click()
    await expect(form.getByRole('status').filter({ hasText: 'Count applied:' })).toContainText('1 record adjusted')
    expect(submitted.at(-1)).toEqual([{ inventoryId: change === 'removed' ? 'second' : 'first',
      countedQuantity: change === 'removed' ? 4 : 8, expectedQuantity: change === 'removed' ? 5 : 12 }])
  })
}