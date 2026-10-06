import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

for (const mode of ['normal', 'lost-reply'] as const) {
test(`BOM permits several drafts with ${mode} and explains an occupied approval slot`, async ({ page }) => {
  const projectId = 'prj-draft-fixture'
  const product = { itemId: 'product', projectId, itemCode: 'PROD', itemName: 'Product', unitId: 'kg', itemStatus: 'active', lotManageYn: 'N' }
  const material = { ...product, itemId: 'material', itemCode: 'RAW', itemName: 'Material' }
  const boms = [{ bomId: 'source', projectId, targetItemId: 'product', bomName: 'Parallel formula', bomVersion: 1,
    baseQuantity: 1, baseUnit: 'kg', bomStatus: 'approved', approvedBy: 'demo-owner', approvedAt: null, note: null,
    lines: [{ bomLineId: 'source-line', childItemId: 'material', quantity: 1, unit: 'kg', scrapRate: 0,
      optionalYn: 'N', substituteGroup: null, sortOrder: 1, note: null, lineType: 'material' }] }]
  const requests: { requestId?: string }[] = []
  const receipts = new Map<string, (typeof boms)[number]>()
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request(); const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (pathname === '/api/boms/source/revisions' && request.method() === 'POST') {
      const command = request.postDataJSON() as { requestId?: string }; requests.push(command)
      if (command.requestId && receipts.has(command.requestId)) return ok(route, receipts.get(command.requestId))
      const version = boms.length + 1
      const created = { ...boms[0], bomId: `draft-${version}`, bomVersion: version, bomStatus: 'draft',
        lines: boms[0].lines.map((line) => ({ ...line, bomLineId: `line-${version}` })) }
      boms.push(created)
      if (command.requestId) receipts.set(command.requestId, created)
      if (mode === 'lost-reply' && requests.length === 1) return route.abort('failed')
      return ok(route, created)
    }
    if (pathname.endsWith('/submit') && request.method() === 'POST') {
      const id = pathname.split('/')[3]; const current = boms.find((bom) => bom.bomId === id)!
      if (boms.some((bom) => bom.bomStatus === 'pending_approval'))
        return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, data: null,
          message: 'Revision 3 is already pending approval for this item.' }) })
      current.bomStatus = 'pending_approval'; return ok(route, current)
    }
    if (request.method() !== 'GET') throw new Error(`Unexpected write: ${pathname}`)
    if (pathname === '/api/items') return ok(route, [product, material])
    if (pathname === '/api/units') return ok(route, [{ unitId: 'kg', unitCode: 'kg', activeYn: 'Y' }])
    if (pathname === '/api/boms') return ok(route, boms)
    if (pathname.endsWith('/requirements')) return ok(route, { bomId: 'source', bomVersion: 1, targetItemId: 'product',
      productionQuantity: 1, baseQuantity: 1, lines: [], outputs: [], totalMaterialCost: 0, costComplete: true })
    if (pathname.endsWith('/buildable')) return ok(route, null)
    return ok(route, [])
  })
  await mockedLogin(page)
  await page.goto(`/projects/${projectId}/inventory?tab=boms`)
  await page.getByRole('row', { name: /v1.*Parallel formula/ }).click()
  await page.getByRole('button', { name: 'New revision', exact: true }).click()
  if (mode === 'lost-reply') {
    await expect(page.getByText('Failed to fetch', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'New BOM', exact: true }).click()
    await page.getByRole('row', { name: /v1.*Parallel formula/ }).click()
    await page.getByRole('button', { name: 'New revision', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: /Parallel formula v2/ })).toBeVisible()
  await page.getByRole('row', { name: /v1.*Parallel formula/ }).click()
  await page.getByRole('button', { name: 'New revision', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Parallel formula v3/ })).toBeVisible()
  await page.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(page.getByRole('row', { name: /v3.*pending approval/ })).toBeVisible()
  await page.getByRole('row', { name: /v2.*draft/ }).click()
  await page.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(page.getByText('Revision 3 is already pending approval for this item.', { exact: true })).toBeVisible()
  expect(boms.map((bom) => bom.bomStatus)).toEqual(['approved', 'draft', 'pending_approval'])
  expect(requests[0].requestId).toEqual(expect.any(String))
  if (mode === 'lost-reply') expect(requests[1].requestId).toBe(requests[0].requestId)
  expect(requests.at(-1)!.requestId).not.toBe(requests[0].requestId)
})
}
