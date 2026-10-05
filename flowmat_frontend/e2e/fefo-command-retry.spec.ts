import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const failure of ['network', 'gateway'] as const) {
  for (const action of ['issue', 'reserve'] as const) {
    test(`FEFO ${action} retries an unconfirmed ${failure} command without consuming stock twice`, async ({ page }) => {
      const projectId = 'prj-fefo-retry'
      const item = { itemId: 'material', projectId, itemCode: 'MATERIAL', itemName: 'Material', itemType: 'material',
        resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'Y', unitCost: null }
      const stock = { inventoryId: 'stock', projectId, itemId: item.itemId, lotId: 'lot', lotNo: 'SOON', quantity: 20,
        reservedQuantity: 0, availableQuantity: 20, location: 'SRC', inventoryStatus: 'available', minThreshold: null,
        maxThreshold: null, stockLevel: 'ok', version: 1, lastCheckedAt: null, lastCheckedBy: null }
      const commands: { projectId: string; itemId: string; quantity: number; action: string; requestId: string }[] = []
      const results = new Map<string, unknown>()
      let release!: () => void
      const responseGate = new Promise<void>((resolve) => { release = resolve })
      await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
        const request = route.request()
        const { pathname } = new URL(request.url())
        if (await answerAuth(route, pathname)) return
        if (request.method() === 'POST' && pathname === '/api/inventories/issue-fefo') {
          const body = request.postDataJSON() as (typeof commands)[number]
          commands.push(body)
          if (!results.has(body.requestId)) {
            if (body.action === 'reserve') stock.reservedQuantity += body.quantity
            else stock.quantity -= body.quantity
            stock.availableQuantity = stock.quantity - stock.reservedQuantity
            results.set(body.requestId, { itemId: item.itemId, action: body.action, quantity: body.quantity, unit: 'kg',
              lines: [{ inventoryTransactionId: `tx-${results.size}`, inventoryId: stock.inventoryId,
                lotId: stock.lotId, lotNo: stock.lotNo, location: stock.location, quantity: body.quantity,
                quantityAfter: stock.quantity, reservedAfter: stock.reservedQuantity }] })
          }
          if (commands.length === 1) {
            await responseGate
            if (failure === 'network') return route.abort('failed')
            return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Gateway response failed' }) })
          }
          return ok(route, results.get(body.requestId))
        }
        if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
        if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'FEFO retry', ownerId: 'demo-owner' }])
        if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'FEFO retry', ownerId: 'demo-owner' })
        if (pathname === '/api/items') return ok(route, [item])
        if (pathname === '/api/inventories') return ok(route, [stock])
        if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
        return ok(route, [])
      })
      await mockedLogin(page)
      await page.goto(`/projects/${projectId}/inventory?tab=stock`)
      const panel = page.locator('details[aria-label="Issue by item"]')
      await panel.locator('summary').click()
      await panel.getByRole('combobox', { name: 'Action', exact: true }).selectOption(action)
      await panel.getByRole('combobox', { name: 'Item', exact: true }).selectOption(item.itemId)
      const quantity = panel.getByRole('spinbutton', { name: 'Quantity', exact: true })
      await quantity.fill('4')
      const submit = panel.getByRole('button', { name: action === 'issue' ? 'Issue' : 'Reserve', exact: true })
      await submit.click()
      try {
        await expect(panel.getByRole('combobox', { name: 'Action', exact: true })).toBeDisabled()
        await expect(panel.getByRole('combobox', { name: 'Item', exact: true })).toBeDisabled()
        await expect(quantity).toBeDisabled()
        await expect(panel.getByRole('textbox', { name: 'Note', exact: true })).toBeDisabled()
      } finally {
        release()
      }
      await expect(panel).toContainText(failure === 'network' ? 'Failed to fetch' : 'Gateway response failed')
      await expect(panel).toContainText('The result is unconfirmed.')
      await expect(quantity).toHaveValue('4')
      await submit.click()
      await expect(panel.getByRole('status')).toContainText(`${action === 'issue' ? 'Issued' : 'Reserved'} 4 kg`)
      await expect(quantity).toHaveValue('')
      expect(commands).toHaveLength(2)
      expect(commands[0].requestId).toBe(commands[1].requestId)
      expect(commands[1]).toMatchObject({ projectId, itemId: item.itemId, quantity: 4, action })
      expect(stock.quantity).toBe(action === 'issue' ? 16 : 20)
      expect(stock.reservedQuantity).toBe(action === 'reserve' ? 4 : 0)
      expect(stock.availableQuantity).toBe(16)
      await quantity.fill('4')
      await submit.click()
      await expect(quantity).toHaveValue('')
      expect(commands).toHaveLength(3)
      expect(commands[2].requestId).not.toBe(commands[1].requestId)
      expect(stock.availableQuantity).toBe(12)
    })
  }
}
