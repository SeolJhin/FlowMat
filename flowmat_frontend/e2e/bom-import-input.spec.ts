import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

// Every API is intercepted. The draft below is a fixture; no BOM is created in any database.
for (const mode of ['file-order', 'check-order', 'cancel-check', 'read-error', 'save-lock', 'replace-order', 'replace-reading', 'duplicate-column'] as const) {
  test(`BOM materials CSV handles ${mode} with the current file and replace option`, async ({ page }) => {
    const projectId = 'prj-bom-import-input'
    const material = { itemId: 'material', projectId, itemCode: 'NEW', itemName: 'Material', itemType: 'material',
      resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: 1 }
    const product = { ...material, itemId: 'product', itemCode: 'PRODUCT', itemName: 'Product' }
    const bom = { bomId: 'draft-fixture', projectId, targetItemId: product.itemId, bomName: 'Import draft', bomVersion: 1,
      baseQuantity: 1, baseUnit: 'kg', bomStatus: 'draft', approvedBy: null, approvedAt: null, note: null, lines: [] }
    type Input = { dryRun: boolean; replace: boolean; rows: { itemCode: string; quantity: string; unit: string }[] }
    const commands: Input[] = []
    const checks: Input[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (request.method() === 'POST' && pathname === `/api/boms/${bom.bomId}/lines/import`) {
        const body = request.postDataJSON() as Input
        const invalid = body.rows[0].itemCode === 'OLD' || ((mode === 'replace-order' || mode === 'replace-reading') && !body.replace)
        if (body.dryRun) {
          checks.push(body)
          if ((invalid && (mode === 'check-order' || mode === 'cancel-check')) || (mode === 'replace-order' && !body.replace)) await gate
        } else {
          commands.push(body)
          if (mode === 'save-lock') await gate
        }
        return ok(route, { dryRun: body.dryRun, applied: !body.dryRun && !invalid, added: invalid ? 0 : 1,
          removed: body.replace ? 1 : 0, errors: invalid ? 1 : 0,
          rows: [{ row: 0, itemCode: body.rows[0].itemCode, action: invalid ? 'error' : 'add', message: invalid ? 'Old check problem' : null }] })
      }
      if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
      if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'BOM import input', ownerId: 'demo-owner' }])
      if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'BOM import input', ownerId: 'demo-owner' })
      if (pathname === '/api/items') return ok(route, [material, product])
      if (pathname === '/api/units') return ok(route, [{ unitId: 'unit_kg', unitCode: 'kg', unitName: 'kilogram', unitType: 'mass', activeYn: 'Y' }])
      if (pathname === '/api/boms') return ok(route, [bom])
      if (pathname === `/api/boms/${bom.bomId}`) return ok(route, bom)
      return ok(route, [])
    })
    if (mode === 'file-order' || mode === 'read-error' || mode === 'replace-reading') {
      await page.addInitScript(() => {
        const controlled = window as typeof window & { bomFileRead: { release: () => Promise<void>; fail: () => void } }
        const read = File.prototype.text
        File.prototype.text = function () {
          const text = read.call(this)
          if (this.name !== 'old.csv') return text
          return new Promise<string>((resolve, reject) => {
            controlled.bomFileRead = { release: async () => resolve(await text), fail: () => reject(new Error('Read failed')) }
          })
        }
      })
    }
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/inventory?tab=boms`)
    await page.getByRole('row', { name: /Import draft/ }).click()
    const panel = page.getByLabel('Materials from CSV', { exact: true })
    const upload = panel.getByLabel('Import materials file')
    const replace = panel.getByRole('checkbox', { name: 'Replace current materials', exact: true })
    const file = (name: string, code: string, quantity: string) => ({ name, mimeType: 'text/csv',
      buffer: Buffer.from(`item_code,quantity,unit\n${code},${quantity},kg\n`) })
    if (mode === 'replace-reading') {
      await upload.setInputFiles(file('old.csv', 'NEW', '9'))
      await replace.check()
      await page.evaluate(() => (window as typeof window & { bomFileRead: { release: () => Promise<void> } }).bomFileRead.release())
      await expect.poll(() => checks[0]?.replace).toBe(true)
    } else if (mode === 'duplicate-column') {
      await upload.setInputFiles({ name: 'ambiguous.csv', mimeType: 'text/csv',
        buffer: Buffer.from('item_code,quantity,qty,unit\nNEW,90,9,kg\n') })
      await expect(panel.getByRole('alert')).toContainText('Use only one quantity column')
      expect(checks).toHaveLength(0)
      expect(commands).toHaveLength(0)
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
    } else if (mode === 'read-error') {
      await upload.setInputFiles(file('old.csv', 'OLD', '5'))
      await page.evaluate(() => (window as typeof window & { bomFileRead: { fail: () => void } }).bomFileRead.fail())
      await expect(panel.getByRole('alert')).toContainText('could not be read')
      expect(checks).toHaveLength(0)
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
    } else if (mode === 'replace-order') {
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
      await expect.poll(() => checks.length).toBe(1)
      await replace.check()
      await expect(panel).toContainText('1 to add, 1 to remove')
      const oldResponse = page.waitForResponse((response) => response.url().endsWith('/lines/import') &&
        !(response.request().postDataJSON() as Input).replace)
      release()
      await (await oldResponse).finished()
    } else if (mode !== 'save-lock') {
      await upload.setInputFiles(file('old.csv', 'OLD', '5'))
      if (mode !== 'file-order') await expect.poll(() => checks.length).toBe(1)
      if (mode === 'cancel-check') {
        try { await panel.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 5000 }) } finally { release() }
        await expect(panel.getByRole('button', { name: 'Add 0 materials', exact: true })).toBeHidden()
      }
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
      await expect(panel).toContainText('1 to add')
      if (mode === 'file-order') {
        await page.evaluate(() => (window as typeof window & { bomFileRead: { release: () => Promise<void> } }).bomFileRead.release())
      } else if (mode === 'check-order') {
        const oldResponse = page.waitForResponse((response) => response.url().endsWith('/lines/import') &&
          (response.request().postDataJSON() as Input).rows[0].itemCode === 'OLD')
        release()
        await (await oldResponse).finished()
      }
    } else {
      await upload.setInputFiles(file('new.csv', 'NEW', '9'))
    }
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(panel).not.toContainText('with problems')
    await expect(panel).toContainText((mode === 'replace-order' || mode === 'replace-reading') ? '1 to add, 1 to remove' : '1 to add')
    const save = panel.getByRole('button', { name: (mode === 'replace-order' || mode === 'replace-reading') ? 'Replace materials' : 'Add 1 material', exact: true })
    await save.click()
    if (mode === 'save-lock') {
      try {
        await expect(upload).toBeDisabled()
        await expect(replace).toBeDisabled()
        await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
        await expect(save).toBeDisabled()
      } finally { release() }
    }
    await expect(panel.getByRole('status')).toContainText('Added 1 material')
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ dryRun: false, replace: mode === 'replace-order' || mode === 'replace-reading', rows: [{ itemCode: 'NEW', quantity: '9', unit: 'kg' }] })
  })
}
