import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const mode of ['file-order', 'check-order', 'cancel-check', 'read-error', 'receive-lock', 'duplicate-column'] as const) {
  test(`spreadsheet receipt handles ${mode} using only the current checked file`, async ({ page }) => {
    const projectId = 'prj-import-input'
    const item = { itemId: 'material', projectId, itemCode: 'NEW', itemName: 'Material', itemType: 'material',
      resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: null }
    const stock = { inventoryId: 'stock', projectId, itemId: item.itemId, lotId: null, quantity: 10,
      reservedQuantity: 0, availableQuantity: 10, location: 'SRC', inventoryStatus: 'available', minThreshold: null,
      maxThreshold: null, stockLevel: 'ok', version: 1, lastCheckedAt: null, lastCheckedBy: null }
    type Input = { dryRun: boolean; note?: string; rows: { itemCode: string; quantity: string }[] }
    const commands: Input[] = []
    const checks: Input[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (request.method() === 'POST' && pathname === '/api/inventories/import') {
        const body = request.postDataJSON() as Input
        if (body.dryRun) {
          checks.push(body)
          if (body.rows[0].itemCode === 'OLD' && (mode === 'check-order' || mode === 'cancel-check')) await gate
        } else {
          commands.push(body)
          stock.quantity += Number(body.rows[0].quantity)
          stock.availableQuantity = stock.quantity
          if (mode === 'receive-lock') await gate
        }
        return ok(route, { created: 0, received: 1, newLots: 0, errors: 0, applied: !body.dryRun,
          rows: [{ row: 0, itemCode: body.rows[0].itemCode, action: 'receive', message: `quantity ${body.rows[0].quantity}` }] })
      }
      if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
      if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Import input', ownerId: 'demo-owner' }])
      if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Import input', ownerId: 'demo-owner' })
      if (pathname === '/api/items') return ok(route, [item])
      if (pathname === '/api/inventories') return ok(route, [stock])
      if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
      return ok(route, [])
    })
    if (mode === 'file-order' || mode === 'read-error') {
      await page.addInitScript(() => {
        const controlled = window as typeof window & { importFileRead: { release: () => Promise<void>; fail: () => void } }
        const read = File.prototype.text
        File.prototype.text = function () {
          const text = read.call(this)
          if (this.name !== 'old.csv') return text
          return new Promise<string>((resolve, reject) => {
            controlled.importFileRead = { release: async () => resolve(await text), fail: () => reject(new Error('Read failed')) }
          })
        }
      })
    }
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/inventory?tab=stock`)
    const panel = page.getByRole('group', { name: 'Receive stock from a spreadsheet', exact: true })
    await panel.locator('summary').click()
    const upload = panel.getByLabel('Import stock file')
    const check = panel.getByLabel('Stock import check', { exact: true })
    const receive = panel.getByRole('button', { name: 'Receive 1 line', exact: true })
    const file = (name: string, code: string, quantity: string) => ({ name, mimeType: 'text/csv',
      buffer: Buffer.from(`item_code,location,quantity\n${code},SRC,${quantity}\n`) })
    if (mode === 'duplicate-column') {
      await upload.setInputFiles({ name: 'ambiguous.csv', mimeType: 'text/csv',
        buffer: Buffer.from('item_code,location,quantity,qty\nNEW,SRC,90,9\n') })
      await expect(panel.getByRole('alert')).toContainText('Use only one quantity column')
      expect(checks).toHaveLength(0)
      expect(commands).toHaveLength(0)
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
    } else if (mode === 'read-error') {
      await upload.setInputFiles(file('old.csv', 'OLD', '5'))
      await page.evaluate(() => (window as typeof window & { importFileRead: { fail: () => void } }).importFileRead.fail())
      await expect(panel.getByRole('alert')).toContainText('could not be read')
      expect(checks).toHaveLength(0)
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
    } else if (mode !== 'receive-lock') {
      await upload.setInputFiles(file('old.csv', 'OLD', '5'))
      if (mode !== 'file-order') await expect.poll(() => checks.length).toBe(1)
      if (mode === 'cancel-check') {
        try {
          await panel.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 5000 })
        } finally { release() }
        await expect(check).toBeHidden()
      }
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
      await expect(check).toContainText('NEW')
      if (mode === 'file-order') {
        await page.evaluate(() => (window as typeof window & { importFileRead: { release: () => Promise<void> } }).importFileRead.release())
      } else if (mode === 'check-order') {
        const olderResponse = page.waitForResponse((response) => response.url().endsWith('/api/inventories/import') &&
          (response.request().postDataJSON() as Input).rows[0].itemCode === 'OLD')
        release()
        await (await olderResponse).finished()
      }
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    } else {
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
    }
    await expect(check).toContainText('NEW')
    await expect(check).toContainText('quantity 9')
    await expect(check).not.toContainText('OLD')
    await panel.getByLabel('Import note').fill('delivery')
    await receive.click()
    if (mode === 'receive-lock') {
      try {
        await expect(upload).toBeDisabled()
        await expect(panel.getByLabel('Import note')).toBeDisabled()
        await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
        await expect(receive).toBeDisabled()
      } finally { release() }
    }
    await expect(panel.getByRole('status')).toContainText('Received: 0 new records, 1 into existing ones.')
    expect(commands).toHaveLength(1)
    expect(commands[0]).toMatchObject({ dryRun: false, note: 'delivery', rows: [{ itemCode: 'NEW', quantity: '9' }] })
    expect(stock.quantity).toBe(19)
  })
}
