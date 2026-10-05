import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const failure of ['network', 'gateway'] as const) {
  for (const action of ['receipt', 'move'] as const) {
    test(`retrying a ${action} after a lost ${failure} response changes stock only once`, async ({ page }) => {
      const projectId = 'prj-stock-retry'
      const item = { itemId: 'material', projectId, itemCode: 'MATERIAL', itemName: 'Material', itemType: 'material',
        resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: null }
      const stock = { inventoryId: 'source', projectId, itemId: item.itemId, lotId: null, quantity: 10, reservedQuantity: 0,
        availableQuantity: 10, location: 'SRC', inventoryStatus: 'available', minThreshold: null, maxThreshold: null,
        stockLevel: 'ok', version: 1, lastCheckedAt: null, lastCheckedBy: null }
      const destination = { ...stock, inventoryId: 'destination', quantity: 0, availableQuantity: 0, location: 'DEST' }
      const commands: { requestId: string; quantity: number }[] = []
      const results = new Map<string, unknown>()
      let release!: () => void
      const responseGate = new Promise<void>((resolve) => { release = resolve })
      const path = action === 'move' ? '/api/inventory-transfers' : '/api/inventory-transactions'
      await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
        const request = route.request()
        const { pathname } = new URL(request.url())
        if (await answerAuth(route, pathname)) return
        if (request.method() === 'POST' && pathname === path) {
          const body = request.postDataJSON() as (typeof commands)[number]
          commands.push(body)
          if (!results.has(body.requestId)) {
            stock.quantity += action === 'move' ? -body.quantity : body.quantity
            stock.availableQuantity = stock.quantity
            destination.quantity += action === 'move' ? body.quantity : 0
            destination.availableQuantity = destination.quantity
            const transaction = { inventoryTransactionId: `tx-${results.size}`, inventoryId: stock.inventoryId, projectId,
              itemId: item.itemId, transactionType: action === 'move' ? 'transfer_out' : 'receipt',
              quantityDelta: action === 'move' ? -body.quantity : body.quantity, reservedDelta: 0, availableDelta: body.quantity,
              quantityAfter: stock.quantity, reservedAfter: 0, availableAfter: stock.quantity, lotId: null,
              requestId: body.requestId, referenceType: null, referenceId: null, note: null, createdAt: null, createdBy: 'demo-owner' }
            results.set(body.requestId, action === 'move' ? { transferId: `move-${results.size}`, out: transaction,
              in: { ...transaction, inventoryId: destination.inventoryId } } : transaction)
          }
          // The command committed, but the caller never received the acknowledgement.
          if (commands.length === 1) {
            await responseGate
            if (failure === 'network') return route.abort('failed')
            return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Gateway response failed' }) })
          }
          return ok(route, results.get(body.requestId))
        }
        if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
        if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Stock retry', ownerId: 'demo-owner' }])
        if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Stock retry', ownerId: 'demo-owner' })
        if (pathname === '/api/items') return ok(route, [item])
        if (pathname === '/api/inventories') return ok(route, [stock, destination])
        if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
        return ok(route, [])
      })
      await mockedLogin(page)
      await page.goto(`/projects/${projectId}/inventory?tab=stock`)
      await page.getByRole('row', { name: /MATERIAL.*SRC/ }).getByRole('button', { name: 'History', exact: true }).click()
      const form = page.getByRole('form', { name: 'Record stock movement', exact: true })
      await form.getByRole('combobox', { name: 'Movement', exact: true }).selectOption(action)
      await form.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('4')
      if (action === 'move') await form.getByRole('combobox', { name: 'To location', exact: true }).fill('DEST')
      const submit = form.getByRole('button', { name: action === 'move' ? 'Move' : 'Record', exact: true })
      await submit.click()
      try {
        await expect(form.getByRole('combobox', { name: 'Movement', exact: true })).toBeDisabled()
        await expect(form.getByRole('spinbutton', { name: 'Quantity', exact: true })).toBeDisabled()
        await expect(form.getByRole(action === 'move' ? 'combobox' : 'textbox',
          { name: action === 'move' ? 'To location' : 'Note', exact: true })).toBeDisabled()
      } finally {
        release()
      }
      await expect(form).toContainText(failure === 'network' ? 'Failed to fetch' : 'Gateway response failed')
      await expect(form).toContainText('The result is unconfirmed.')
      await expect(submit).toBeEnabled()
      await submit.click()
      await expect(form.getByRole('spinbutton', { name: 'Quantity', exact: true })).toHaveValue('')
      expect(commands).toHaveLength(2)
      expect(commands[0].requestId).toBe(commands[1].requestId)
      expect(stock.quantity).toBe(action === 'move' ? 6 : 14)
      expect(destination.quantity).toBe(action === 'move' ? 4 : 0)
      // An acknowledged command ends that operation; intentionally entering it again gets a new key.
      await form.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('4')
      if (action === 'move') await form.getByRole('combobox', { name: 'To location', exact: true }).fill('DEST')
      await submit.click()
      await expect(form.getByRole('spinbutton', { name: 'Quantity', exact: true })).toHaveValue('')
      expect(commands).toHaveLength(3)
      expect(commands[2].requestId).not.toBe(commands[1].requestId)
      expect(stock.quantity).toBe(action === 'move' ? 2 : 18)
    })
  }
}
