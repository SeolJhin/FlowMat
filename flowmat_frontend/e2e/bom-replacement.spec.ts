import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * The BOM replacement helper against a mocked API (docs/domain/multi-level-bom.md M4-M6), so no BOM reaches a real
 * database: a pending revision starting 2030-02-01 offers to end the approved v1 on 2030-01-31, only when asked.
 */
test('a pending revision can end the revision it replaces the day before it starts, only when asked', async ({ page }) => {
  const items = [
    { itemId: 'bread', itemCode: 'BREAD', itemName: 'bread', unitId: 'unit_ea' },
    { itemId: 'flour', itemCode: 'FLOUR', itemName: 'flour', unitId: 'unit_kg' },
  ].map((one) => ({ ...one, projectId: 'prj-r', itemType: 'material', itemStatus: 'active', lotManageYn: 'N', unitCost: null }))
  const revision = (bomId: string, bomVersion: number, bomStatus: string, effectiveFrom: string | null) => ({
    bomId, projectId: 'prj-r', targetItemId: 'bread', bomName: 'Bread', bomVersion, baseQuantity: 1, baseUnit: 'ea', bomStatus,
    approvedBy: null, approvedAt: null, note: null, effectiveFrom, effectiveTo: null as string | null,
    lines: [{ bomLineId: `${bomId}-l`, childItemId: 'flour', quantity: 1, unit: 'kg', scrapRate: null, optionalYn: 'N',
      substituteGroup: null, sortOrder: 1, note: null, lineType: 'material', phantom: false }],
  })
  const boms = [revision('v1', 1, 'approved', null), revision('v2', 2, 'pending_approval', '2030-02-01')]
  const approvals: unknown[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'POST' && pathname === '/api/boms/v2/approve') {
      const body = request.postDataJSON() as Record<string, unknown>
      approvals.push(body)
      if (body.endEarlier !== true) {
        return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, data: null,
          message: 'Revision 2 (2030-02-01 → open) overlaps approved v1 (open → open).' }) })
      }
      boms[0] = { ...boms[0], effectiveTo: '2030-01-31' }
      boms[1] = { ...boms[1], bomStatus: 'approved' }
      return ok(route, boms[1])
    }
    if (request.method() !== 'GET') throw new Error(`Unexpected write ${request.method()} ${pathname}`)
    if (pathname === '/api/items') return ok(route, items)
    if (pathname === '/api/units') {
      return ok(route, [{ unitId: 'unit_ea', unitCode: 'ea', unitName: 'each', unitType: 'count', activeYn: 'Y' },
        { unitId: 'unit_kg', unitCode: 'kg', unitName: 'kilogram', unitType: 'mass', activeYn: 'Y' }])
    }
    if (pathname === '/api/boms') return ok(route, boms)
    if (pathname === '/api/boms/v2/requirements') {
      return ok(route, { bomId: 'v2', bomVersion: 2, targetItemId: 'bread', productionQuantity: 1, baseQuantity: 1, lines: [],
        materialCost: 0, costComplete: true, outputs: [] })
    }
    if (pathname === '/api/boms/v2/buildable') {
      return ok(route, { bomId: 'v2', targetItemId: 'bread', targetUnit: 'ea', baseQuantity: 1, buildable: 0, limitingItemId: null,
        lines: [] })
    }
    const periods = pathname.match(/^\/api\/boms\/(v\d)\/effectivity$/)
    if (periods) {
      const one = boms.find((candidate) => candidate.bomId === periods[1])!
      return ok(route, { bomId: one.bomId, bomStatus: one.bomStatus, effectiveFrom: one.effectiveFrom,
        effectiveTo: one.effectiveTo, periodVersion: 1, history: [] })
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-r/inventory?tab=boms')
  await page.getByRole('row', { name: /v2/ }).click()
  await expect(page.getByTestId('bom-period-overlap')).toContainText('overlaps approved v1')
  const helper = page.getByLabel('End v1 on 2030-01-31 when approving')
  await expect(helper).not.toBeChecked()

  // Off by default: a plain approval still meets the overlap.
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.getByText('overlaps approved v1 (open → open)').last()).toBeVisible()
  await helper.check()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect.poll(() => approvals.length).toBe(2)
  expect(approvals).toEqual([{}, { endEarlier: true }])
})
