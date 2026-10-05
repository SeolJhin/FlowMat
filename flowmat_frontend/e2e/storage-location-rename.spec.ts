import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

test('renaming a stocked place refreshes previously opened Stock and Tasks tabs', async ({ page }) => {
  const projectId = 'prj-rename'
  const location = { locationId: 'source', projectId, parentLocationId: null, locationCode: 'SRC', locationName: null,
    locationType: 'bin', active: true, note: null, path: 'SRC', depth: 0, stockRecords: 1, itemCount: 1 }
  const destination = { ...location, locationId: 'destination', locationCode: 'DST', path: 'DST', stockRecords: 0, itemCount: 0 }
  const item = { itemId: 'material', projectId, itemCode: 'MATERIAL', itemName: 'Material', itemType: 'material',
    resourceCategory: 'material', unitId: 'unit_kg', itemStatus: 'active', lotManageYn: 'N', unitCost: null }
  const stock = { inventoryId: 'stock', projectId, itemId: item.itemId, lotId: null, quantity: 10, reservedQuantity: 0,
    availableQuantity: 10, location: 'SRC', inventoryStatus: 'available', minThreshold: null, version: 0 }
  const task = { taskId: 'task', projectId, taskNo: 'WT-0001', taskType: 'putaway', status: 'open', inventoryId: stock.inventoryId,
    itemId: item.itemId, itemCode: item.itemCode, itemName: item.itemName, lotId: null, lotNo: null, quantity: 2,
    fromLocation: 'SRC', toLocation: 'DST', workOrderId: null, workOrderNumber: null, note: null,
    createdBy: 'demo-owner', createdAt: '2026-10-04T00:00:00Z', finishedBy: null, finishedAt: null,
    transferId: null, cancelReason: null, assignedTo: null }

  // Every API request is answered here; this test never writes to a development database.
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'PUT' && pathname === '/api/storage-locations/source') {
      const code = (request.postDataJSON() as { locationCode: string }).locationCode
      Object.assign(location, { locationCode: code, path: code })
      Object.assign(stock, { location: code, version: stock.version + 1 })
      task.fromLocation = code
      return ok(route, location)
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'Unexpected write' }) })
    }
    if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Place rename', ownerId: 'demo-owner' }])
    if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Place rename', ownerId: 'demo-owner' })
    if (pathname === '/api/items') return ok(route, [item])
    if (pathname === '/api/units') return ok(route, [{ unitId: 'unit_kg', unitCode: 'kg', unitName: 'kilogram', unitType: 'mass', activeYn: 'Y' }])
    if (pathname === '/api/storage-locations') return ok(route, [location, destination])
    if (pathname === '/api/inventories') return ok(route, [stock])
    if (pathname === '/api/warehouse-tasks') return ok(route, [task])
    if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto(`/projects/${projectId}/inventory?tab=stock`)
  const stockRow = page.getByRole('row', { name: /MATERIAL/ }).first()
  await expect(stockRow).toContainText('SRC')
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await expect(page.getByRole('row', { name: /WT-0001/ })).toContainText('SRC')
  await page.getByRole('tab', { name: 'Locations', exact: true }).click()
  await page.getByRole('row', { name: /SRC/ }).getByRole('button', { name: 'Edit', exact: true }).click()
  const form = page.getByRole('form', { name: 'Edit location' })
  await form.getByLabel('Code').fill('SRC-R')
  page.once('dialog', (dialog) => void dialog.accept())
  await form.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('row', { name: /SRC-R/ })).toBeVisible()
  await page.getByRole('tab', { name: 'Stock', exact: true }).click()
  await expect(stockRow).toContainText('SRC-R', { timeout: 5_000 })
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await expect(page.getByRole('row', { name: /WT-0001/ })).toContainText('SRC-R', { timeout: 5_000 })
})
