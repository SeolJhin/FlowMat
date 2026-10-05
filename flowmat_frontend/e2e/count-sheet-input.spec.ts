import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const mode of ['duplicate', 'duplicate-column', 'loading', 'read-error'] as const) {
  test(`counted sheet handles ${mode} without silently changing the count`, async ({ page }) => {
    const projectId = 'prj-count-sheet-input'
    const item = { itemId: 'material', projectId, itemCode: 'MATERIAL', itemName: 'Material', itemType: 'material',
      resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: null }
    const stock = { inventoryId: 'stock', projectId, itemId: item.itemId, lotId: null, quantity: 10,
      reservedQuantity: 0, availableQuantity: 10, location: 'SRC', inventoryStatus: 'available', minThreshold: null,
      maxThreshold: null, stockLevel: 'ok', version: 1, lastCheckedAt: null, lastCheckedBy: null }
    const commands: { lines: { inventoryId: string; countedQuantity: number; expectedQuantity: number }[] }[] = []
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (request.method() === 'POST' && pathname === '/api/inventory-counts') {
        const body = request.postDataJSON() as (typeof commands)[number]
        commands.push(body)
        const before = stock.quantity
        stock.quantity = body.lines[0].countedQuantity
        stock.availableQuantity = stock.quantity
        return ok(route, { countId: 'count', adjusted: 1, unchanged: 0,
          lines: [{ ...body.lines[0], quantityBefore: before, difference: stock.quantity - before, inventoryTransactionId: 'tx' }] })
      }
      if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
      if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Sheet input', ownerId: 'demo-owner' }])
      if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Sheet input', ownerId: 'demo-owner' })
      if (pathname === '/api/items') return ok(route, [item])
      if (pathname === '/api/inventories') return ok(route, [stock])
      if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
      return ok(route, [])
    })
    if (mode === 'loading' || mode === 'read-error') {
      await page.addInitScript(() => {
        const controlled = window as typeof window & { countSheetReads: { release: () => Promise<void>; fail: () => void }[] }
        controlled.countSheetReads = []
        const read = File.prototype.text
        File.prototype.text = function () {
          const text = read.call(this)
          return new Promise<string>((resolve, reject) => {
            controlled.countSheetReads.push({ release: async () => resolve(await text), fail: () => reject(new Error('Read failed')) })
          })
        }
      })
    }
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/inventory?tab=count`)
    const form = page.getByRole('form', { name: 'Stock count', exact: true })
    const counted = form.getByRole('textbox', { name: 'Counted MATERIAL · Material at SRC', exact: true })
    const upload = form.getByLabel('Load counted sheet')
    const submit = form.getByRole('button', { name: 'Apply count', exact: false })
    await counted.fill('8')
    await upload.setInputFiles({ name: 'counts.csv', mimeType: 'text/csv', buffer: Buffer.from(mode === 'duplicate'
      ? 'inventory_id,counted\nstock,7\nstock,9\n' : mode === 'duplicate-column'
        ? 'inventory_id,counted,Counted\nstock,7,9\n' : 'inventory_id,counted\nstock,7\n') })
    if (mode === 'duplicate' || mode === 'duplicate-column') {
      await expect(form.getByRole('status', { name: 'Count sheet result', exact: true })).toContainText(mode === 'duplicate' ? 'more than once' : 'Use only one counted column')
      await expect(counted).toHaveValue('8')
    } else if (mode === 'read-error') {
      await page.evaluate(() => (window as typeof window & { countSheetReads: { fail: () => void }[] }).countSheetReads[0].fail())
      await expect(form.getByRole('status', { name: 'Count sheet result', exact: true })).toContainText('could not be read')
      await expect(counted).toHaveValue('8')
    } else {
      await expect(submit).toBeDisabled()
      await expect(counted).toBeDisabled()
      await form.getByRole('button', { name: 'Clear counts', exact: true }).click()
      await expect(counted).toHaveValue('')
      // Start a newer load before the cancelled file completes. Its late result must neither refill nor unlock this one.
      await upload.setInputFiles({ name: 'new.csv', mimeType: 'text/csv', buffer: Buffer.from('inventory_id,counted\nstock,9\n') })
      await page.evaluate(() => (window as typeof window & { countSheetReads: { release: () => Promise<void> }[] }).countSheetReads[0].release())
      await expect(counted).toHaveValue('')
      await expect(counted).toBeDisabled()
      await page.evaluate(() => (window as typeof window & { countSheetReads: { release: () => Promise<void> }[] }).countSheetReads[1].release())
      await expect(counted).toHaveValue('9')
    }
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(form.getByRole('status').filter({ hasText: 'Count applied:' })).toContainText('1 record adjusted')
    expect(commands).toEqual([{ projectId, requestId: expect.any(String), lines: [{ inventoryId: 'stock', countedQuantity: mode === 'loading' ? 9 : 8, expectedQuantity: 10 }] }])
    expect(stock.quantity).toBe(mode === 'loading' ? 9 : 8)
  })
}