import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const mode of ['file-order', 'check-order', 'cancel-check', 'read-error', 'save-lock', 'duplicate-column'] as const) {
  test(`item spreadsheet handles ${mode} using only the current checked file`, async ({ page }) => {
    const projectId = 'prj-item-import-input'
    const item = { itemId: 'material', projectId, itemCode: 'NEW', itemName: 'Material', itemType: 'material',
      resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: 1 }
    type Input = { dryRun: boolean; rows: { itemCode: string; unitCost: string }[] }
    const commands: Input[] = []
    const checks: Input[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (request.method() === 'POST' && pathname === '/api/items/import') {
        const body = request.postDataJSON() as Input
        if (body.dryRun) {
          checks.push(body)
          if (body.rows[0].itemCode === 'OLD' && (mode === 'check-order' || mode === 'cancel-check')) await gate
        } else {
          commands.push(body)
          item.unitCost = Number(body.rows[0].unitCost)
          if (mode === 'save-lock') await gate
        }
        return ok(route, { created: 0, updated: 1, unchanged: 0, errors: 0, applied: !body.dryRun,
          rows: [{ row: 0, itemCode: body.rows[0].itemCode, action: 'update', message: `unit cost ${body.rows[0].unitCost}` }] })
      }
      if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
      if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Import input', ownerId: 'demo-owner' }])
      if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Import input', ownerId: 'demo-owner' })
      if (pathname === '/api/items') return ok(route, [item])
      if (pathname === '/api/inventories') return ok(route, [])
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
    await page.goto(`/projects/${projectId}/inventory?tab=items`)
    const panel = page.getByRole('region', { name: 'Items spreadsheet', exact: true })
    const upload = panel.getByLabel('Import items file')
    const check = panel.getByLabel('Import check', { exact: true })
    const save = panel.getByRole('button', { name: 'Save 1 change', exact: true })
    const file = (name: string, code: string, unitCost: string) => ({ name, mimeType: 'text/csv',
      buffer: Buffer.from(`item_code,unit_cost\n${code},${unitCost}\n`) })
    if (mode === 'duplicate-column') {
      await upload.setInputFiles({ name: 'ambiguous.csv', mimeType: 'text/csv',
        buffer: Buffer.from('item_code,unit_cost,cost\nNEW,90,9\n') })
      await expect(panel.getByRole('alert')).toContainText('Use only one unit_cost column')
      expect(checks).toHaveLength(0)
      expect(commands).toHaveLength(0)
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
    } else if (mode === 'read-error') {
      await upload.setInputFiles(file('old.csv', 'OLD', '5'))
      await page.evaluate(() => (window as typeof window & { importFileRead: { fail: () => void } }).importFileRead.fail())
      await expect(panel.getByRole('alert')).toContainText('could not be read')
      expect(checks).toHaveLength(0)
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
    } else if (mode !== 'save-lock') {
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
        const olderResponse = page.waitForResponse((response) => response.url().endsWith('/api/items/import') &&
          (response.request().postDataJSON() as Input).rows[0].itemCode === 'OLD')
        release()
        await (await olderResponse).finished()
      }
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    } else {
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
    }
    await expect(check).toContainText('NEW')
    await expect(check).toContainText('unit cost 9')
    await expect(check).not.toContainText('OLD')
    await save.click()
    if (mode === 'save-lock') {
      try {
        await expect(upload).toBeDisabled()
        await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
        await expect(save).toBeDisabled()
      } finally { release() }
    }
    await expect(panel.getByRole('status')).toContainText('Saved: 0 added, 1 updated, 0 unchanged.')
    expect(commands).toHaveLength(1)
    expect(commands[0]).toMatchObject({ dryRun: false, rows: [{ itemCode: 'NEW', unitCost: '9' }] })
    expect(item.unitCost).toBe(9)
  })
}
