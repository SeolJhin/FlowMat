import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const change of ['blank', 'negative', 'direct'] as const) {
  test(`receipt pack ${change} input cannot silently reuse an earlier converted quantity`, async ({ page }) => {
    const projectId = 'prj-pack-input'
    const item = { itemId: 'material', projectId, itemCode: 'MATERIAL', itemName: 'Material', itemType: 'material',
      resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: null,
      purchaseUnit: 'bag', purchaseUnitQty: 25 }
    const stock = { inventoryId: 'stock', projectId, itemId: item.itemId, lotId: null, quantity: 10,
      reservedQuantity: 0, availableQuantity: 10, location: 'SRC', inventoryStatus: 'available', minThreshold: null,
      maxThreshold: null, stockLevel: 'ok', version: 1, lastCheckedAt: null, lastCheckedBy: null }
    const commands: { quantity: number }[] = []
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (request.method() === 'POST' && pathname === '/api/inventory-transactions') {
        const body = request.postDataJSON() as (typeof commands)[number]
        commands.push(body)
        stock.quantity += body.quantity
        stock.availableQuantity = stock.quantity
        return ok(route, { inventoryTransactionId: 'receipt', inventoryId: stock.inventoryId, projectId,
          itemId: item.itemId, transactionType: 'receipt', quantityDelta: body.quantity, reservedDelta: 0,
          availableDelta: body.quantity, quantityAfter: stock.quantity, reservedAfter: 0, availableAfter: stock.quantity })
      }
      if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
      if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Pack input', ownerId: 'demo-owner' }])
      if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Pack input', ownerId: 'demo-owner' })
      if (pathname === '/api/items') return ok(route, [item])
      if (pathname === '/api/inventories') return ok(route, [stock])
      if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
      return ok(route, [])
    })
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/inventory?tab=stock`)
    await page.getByRole('row', { name: /MATERIAL.*SRC/ }).getByRole('button', { name: 'History', exact: true }).click()
    const form = page.getByRole('form', { name: 'Record stock movement', exact: true })
    const packs = form.getByRole('spinbutton', { name: 'Receipt in bag', exact: true })
    const quantity = form.getByRole('spinbutton', { name: 'Quantity', exact: true })
    const submit = form.getByRole('button', { name: 'Record', exact: true })
    await packs.fill('2')
    await expect(quantity).toHaveValue('50')
    if (change === 'direct') {
      await quantity.fill('3')
      await expect(packs).toHaveValue('')
    } else {
      await packs.fill(change === 'blank' ? '' : '-1')
      await expect(quantity).toHaveValue('')
      await submit.click()
      expect(commands).toHaveLength(0)
      expect(stock.quantity).toBe(10)
      await packs.fill('1.5')
      await expect(quantity).toHaveValue('37.5')
    }
    await submit.click()
    await expect(quantity).toHaveValue('')
    await expect(packs).toHaveValue('')
    expect(commands).toHaveLength(1)
    expect(commands[0].quantity).toBe(change === 'direct' ? 3 : 37.5)
    expect(stock.quantity).toBe(change === 'direct' ? 13 : 47.5)
  })
}
