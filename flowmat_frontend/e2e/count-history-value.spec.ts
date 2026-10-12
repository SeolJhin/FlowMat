import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * Past counts valued twice (docs/domain/stock-count.md CH1-CH4) against a mocked API: at today's unit costs and at those of
 * the count's own time, with an estimate and missing prices said as such.
 */
test('a past count shows its value today and at the count', async ({ page }) => {
  const projectId = 'prj-count-value'
  const count = (countId: string, countedAt: string, valueChange: number, valueAtCount: number, estimated: boolean,
    complete: boolean) => ({
    countId, countedAt, countedBy: 'demo-owner', note: null, adjusted: 1, increase: 1, decrease: 0, valueChange,
    valueComplete: true, valueAtCount, valueAtCountComplete: complete, valueAtCountEstimated: estimated,
    lines: [{ inventoryId: 'stock', itemId: 'flour', itemCode: 'FLOUR', itemName: 'Flour', unit: 'kg', location: 'A',
      lotNo: null, difference: 1 }],
  })
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() !== 'GET') return route.fulfill({ status: 400, body: 'Unexpected write' })
    if (pathname === '/api/projects') return ok(route, [{ projectId, projectName: 'Count value', ownerId: 'demo-owner' }])
    if (pathname === `/api/projects/${projectId}`) return ok(route, { projectId, projectName: 'Count value', ownerId: 'demo-owner' })
    if (pathname === '/api/inventory-counts') {
      return ok(route, [
        count('recent', '2030-01-08T00:00:00Z', 5, 2, false, true),
        count('old', '2026-09-01T00:00:00Z', 5, 3, true, false),
      ])
    }
    if (pathname === '/api/material-requirements') return ok(route, { projectId, orders: 0, lines: [], problems: [] })
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto(`/projects/${projectId}/inventory?tab=count`)
  const history = page.getByRole('region', { name: 'Past counts' })
  const summaries = history.locator('summary')
  await expect(summaries).toHaveCount(2, { timeout: 15_000 })
  await expect(summaries.nth(0)).toContainText('value today +5 · at the count +2')
  await expect(summaries.nth(0)).not.toContainText('estimated')
  // A count before the price history began: the price then is an estimate, and one item had none.
  await expect(summaries.nth(1)).toContainText('value today +5 · at the count +3 (estimated) (some items had no unit cost then)')
})
