import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * BOM by-product and waste lines (docs/domain/bom-by-products.md) against a mocked API, so no BOM is written to a real
 * database: the lines are tagged, a waste line can be added, and the batch's by-products show under the materials needed.
 * The server side is covered by BomByProductIntegrationTest.
 */
test('by-products and waste are tagged, added and shown as coming out of a batch', async ({ page }) => {
  const item = (itemId: string, itemCode: string) => ({
    itemId, projectId: 'prj-e2e', itemCode, itemName: itemCode.toLowerCase(), itemType: 'material', resourceCategory: null,
    resourceType: null, unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: null,
  })
  const items = [item('juice', 'JUICE'), item('oranges', 'ORANGES'), item('peel', 'PEEL'), item('pulp', 'PULP')]
  const line = (bomLineId: string, childItemId: string, quantity: number, lineType: string) => ({
    bomLineId, childItemId, quantity, unit: 'kg', scrapRate: null, optionalYn: 'N', substituteGroup: null, sortOrder: 1, note: null, lineType,
  })
  const bom = {
    bomId: 'juice-bom', projectId: 'prj-e2e', targetItemId: 'juice', bomName: 'Juice', bomVersion: 1, baseQuantity: 1, baseUnit: 'kg',
    bomStatus: 'draft', approvedBy: null, approvedAt: null, note: null,
    lines: [line('l1', 'oranges', 2, 'material'), line('l2', 'peel', 0.5, 'by_product')],
  }
  let posted: Record<string, unknown> | null = null
  let imported: unknown = null

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url
    const method = request.method()
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/boms/juice-bom/lines/import' && method === 'POST') {
      imported = request.postDataJSON()
      return ok(route, { dryRun: true, applied: false, added: 1, removed: 0, errors: 0,
        rows: [{ row: 1, itemCode: 'PULP', action: 'add', message: null }] })
    }
    if (pathname === '/api/boms/juice-bom/lines' && method === 'POST') {
      posted = request.postDataJSON()
      bom.lines.push(line('l3', String(posted?.childItemId), Number(posted?.quantity), String(posted?.lineType)))
      return ok(route, bom)
    }
    if (method !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${method} ${pathname}` }) })
    }
    if (pathname === '/api/items') return ok(route, items)
    if (pathname === '/api/units') return ok(route, [{ unitId: 'unit_kg', unitCode: 'kg', unitName: 'kilogram', unitType: 'mass', activeYn: 'Y' }])
    if (pathname === '/api/boms') return ok(route, [bom])
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/inventory?tab=boms')

  const row = page.getByRole('row', { name: /Juice/ })
  await expect(row).toContainText('1 material · 1 by-product')
  await row.click()
  await expect(page.getByRole('cell', { name: /PEEL.*by-product/ })).toBeVisible()

  await page.getByLabel('Material', { exact: true }).selectOption({ label: 'PULP · pulp' })
  await page.getByLabel('Line type').selectOption('waste')
  await page.getByRole('spinbutton', { name: 'Material quantity' }).fill('0.3')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('cell', { name: /PULP.*waste/ })).toBeVisible()
  expect(posted).toMatchObject({ childItemId: 'pulp', quantity: 0.3, lineType: 'waste' })

  // A materials CSV can say the line type in a type column (bom-by-products.md); it is sent with each row.
  await page.getByLabel('Import materials file').setInputFiles({
    name: 'juice.csv', mimeType: 'text/csv', buffer: Buffer.from('item_code,quantity,unit,type\nPULP,0.3,kg,waste\n'),
  })
  await expect(page.getByLabel('Materials from CSV')).toContainText('1 to add')
  expect(imported).toMatchObject({ dryRun: true, rows: [{ itemCode: 'PULP', quantity: '0.3', unit: 'kg', lineType: 'waste' }] })
})
