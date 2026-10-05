import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const failure of ['network', 'gateway', 'business'] as const) {
  test(`spreadsheet receipt ${failure} failure does not offer an unsafe duplicate write`, async ({ page }) => {
    const projectId = 'prj-import-unconfirmed'
    const item = { itemId: 'material', projectId, itemCode: 'MATERIAL', itemName: 'Material', itemType: 'material',
      resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: null }
    const stock = { inventoryId: 'stock', projectId, itemId: item.itemId, lotId: null, quantity: 10,
      reservedQuantity: 0, availableQuantity: 10, location: 'SRC', inventoryStatus: 'available', minThreshold: null,
      maxThreshold: null, stockLevel: 'ok', version: 1, lastCheckedAt: null, lastCheckedBy: null }
    let receipts = 0
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (request.method() === 'POST' && pathname === '/api/inventories/import') {
        const body = request.postDataJSON() as { dryRun: boolean; rows: { quantity: string }[] }
        if (!body.dryRun) {
          receipts += 1
          if (receipts === 1 && failure === 'business') {
            return route.fulfill({ status: 409, contentType: 'application/json',
              body: JSON.stringify({ success: false, data: null, message: 'Stock is temporarily unavailable' }) })
          }
          stock.quantity += Number(body.rows[0].quantity)
          stock.availableQuantity = stock.quantity
          if (receipts === 1) {
            if (failure === 'network') return route.abort('failed')
            return route.fulfill({ status: 503, contentType: 'application/json',
              body: JSON.stringify({ success: false, data: null, message: 'Gateway response failed' }) })
          }
        }
        return ok(route, { created: 0, received: 1, newLots: 0, errors: 0, applied: !body.dryRun,
          rows: [{ row: 0, itemCode: item.itemCode, action: 'receive', message: null }] })
      }
      if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
      if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Import result', ownerId: 'demo-owner' }])
      if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Import result', ownerId: 'demo-owner' })
      if (pathname === '/api/items') return ok(route, [item])
      if (pathname === '/api/inventories') return ok(route, [stock])
      if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
      return ok(route, [])
    })
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/inventory?tab=stock`)
    const panel = page.getByRole('group', { name: 'Receive stock from a spreadsheet', exact: true })
    await panel.locator('summary').click()
    const upload = panel.getByLabel('Import stock file')
    await upload.setInputFiles({ name: 'receipt.csv', mimeType: 'text/csv',
      buffer: Buffer.from('item_code,location,quantity\nMATERIAL,SRC,9\n') })
    const receive = panel.getByRole('button', { name: 'Receive 1 line', exact: true })
    await receive.click()
    await expect(panel.getByRole('alert')).toContainText(failure === 'network' ? 'Failed to fetch'
      : failure === 'gateway' ? 'Gateway response failed' : 'Stock is temporarily unavailable')
    if (failure === 'business') {
      await expect(receive).toBeEnabled()
      await expect(upload).toBeEnabled()
      expect(stock.quantity).toBe(10)
      await receive.click()
      await expect(panel.getByRole('status')).toContainText('Received: 0 new records, 1 into existing ones.')
      expect(receipts).toBe(2)
    } else {
      await expect(panel.getByRole('status')).toContainText('The receipt result is unconfirmed.')
      await expect(panel.getByRole('status')).toContainText('Check stock history')
      await expect(receive).toBeDisabled()
      await expect(upload).toBeDisabled()
      await expect(panel.getByLabel('Import note')).toBeDisabled()
      expect(receipts).toBe(1)
      await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(panel.getByLabel('Stock import check', { exact: true })).toBeHidden()
      await expect(upload).toBeEnabled()
      expect(receipts).toBe(1)
    }
    expect(stock.quantity).toBe(19)
  })
}
