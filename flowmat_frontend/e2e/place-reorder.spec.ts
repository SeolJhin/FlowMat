import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * The reorder list of one place (docs/domain/stock-alert.md PS4-PS5) against a mocked API: with a location list the Stock
 * tab can show what is short at a place, and set the safety stock each item has there.
 */
test('a place has its own reorder list and safety stocks', async ({ page }) => {
  const location = (locationId: string, locationCode: string, path: string, parentLocationId: string | null) => ({
    locationId, projectId: 'prj-e2e', parentLocationId, locationCode, locationName: null,
    locationType: parentLocationId ? 'bin' : 'warehouse', active: true, note: null, path, depth: path.split(' / ').length - 1,
    stockRecords: 1, itemCount: 1,
  })
  const item = (itemId: string, itemCode: string) => ({
    itemId, projectId: 'prj-e2e', itemCode, itemName: itemCode.toLowerCase(), itemType: 'material', resourceCategory: null,
    resourceType: null, unitId: 'unit_ea', itemStatus: 'active', lotManageYn: 'N', unitCost: null,
  })
  // What the server holds: BOLT has 10 usable in WH-A's bin; a safety stock above that makes it short there.
  const safety = new Map<string, number>([['bolt', 20]])
  const usable: Record<string, number> = { bolt: 10, nut: 3 }
  const sent: unknown[] = []
  const list = () => [...safety.entries()].map(([itemId, quantity]) => ({
    placeSafetyStockId: `pss-${itemId}`, itemId, itemCode: itemId.toUpperCase(), itemName: itemId, unit: 'ea', locationId: 'loc-wh-a',
    locationCode: 'WH-A', safetyStockQty: quantity, updatedBy: 'demo-owner', updatedAt: '2026-10-11T00:00:00Z',
  }))

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'PUT' && pathname === '/api/stock-alerts/place-safety-stocks') {
      const body = request.postDataJSON() as { itemId: string; safetyStockQty: number | null }
      sent.push(body)
      if (body.safetyStockQty === null) safety.delete(body.itemId)
      else safety.set(body.itemId, body.safetyStockQty)
      return ok(route, list())
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/storage-locations') {
      return ok(route, [location('loc-wh-a', 'WH-A', 'WH-A', null), location('loc-bin-a1', 'BIN-A1', 'WH-A / BIN-A1', 'loc-wh-a'),
        location('loc-wh-b', 'WH-B', 'WH-B', null)])
    }
    if (pathname === '/api/items') return ok(route, [item('bolt', 'BOLT'), item('nut', 'NUT')])
    if (pathname === '/api/stock-alerts/place-safety-stocks') return ok(route, list())
    if (pathname === '/api/stock-alerts/reorder') {
      if (url.searchParams.get('location') !== 'WH-A') return ok(route, [])
      return ok(route, [...safety.entries()].filter(([itemId, quantity]) => quantity > usable[itemId]).map(([itemId, quantity]) => ({
        itemId, itemCode: itemId.toUpperCase(), itemName: itemId, unit: 'ea', safetyStockQty: quantity, availableQuantity: usable[itemId],
        shortageQuantity: quantity - usable[itemId], leadTimeDays: null, location: 'WH-A',
      })))
    }
    if (pathname === '/api/stock-analysis') return ok(route, { days: 30, location: url.searchParams.get('location'), lines: [] })
    if (pathname === '/api/material-requirements') return ok(route, { orders: 0, lines: [], problems: [] })
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/inventory?tab=stock')
  const section = page.getByRole('region', { name: 'Below safety stock' })
  await expect(section).toContainText('No items below their safety stock', { timeout: 15_000 })
  const at = section.getByLabel('Reorder at')
  await expect(at.getByRole('option')).toHaveText(['all places (item safety stock)', 'WH-A', 'WH-A / BIN-A1', 'WH-B'])

  // WH-A's own list: BOLT's 10 in the bin inside it are below the 20 set there.
  await at.selectOption('WH-A')
  await expect(section).toContainText('1 item below safety stock at WH-A')
  await expect(section.getByRole('row', { name: /BOLT/ })).toContainText('10')
  const here = section.getByRole('group', { name: 'Safety stock at WH-A' })
  await expect(here).toContainText('BOLT · bolt: 20 ea')

  const form = here.getByRole('form', { name: 'Set safety stock at WH-A' })
  await form.getByRole('button', { name: 'Save' }).click()
  await expect(here.getByRole('alert')).toHaveText('Pick the item to watch.')
  expect(sent).toHaveLength(0)
  await form.getByLabel('Item to watch').selectOption('nut')
  await form.getByLabel('Safety stock here').fill('2')
  await form.getByRole('button', { name: 'Save' }).click()
  await expect(here).toContainText('NUT · nut: 2 ea')
  expect(sent[0]).toEqual({ projectId: 'prj-e2e', itemId: 'nut', locationId: 'loc-wh-a', safetyStockQty: 2 })

  // Removing BOLT's safety stock there takes it off the place's list.
  await here.getByRole('listitem').filter({ hasText: 'BOLT' }).getByRole('button', { name: 'Remove' }).click()
  await expect(section).toContainText('No items below their safety stock at WH-A')
  expect(sent[1]).toEqual({ projectId: 'prj-e2e', itemId: 'bolt', locationId: 'loc-wh-a', safetyStockQty: null })
})
