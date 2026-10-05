import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

// The entire API is intercepted; these fixtures never insert a BOM into the dev/session DB.
for (const mode of ['owner', 'draft-editor', 'viewer', 'approved-editor', 'retry', 'stale', 'open-boundary'] as const) {
  test(`BOM effective period: ${mode}`, async ({ page }) => {
    const projectId = 'prj-effectivity'
    const state = mode === 'draft-editor' ? 'draft' : 'approved'
    const boms = ['first', 'second'].map((id, index) => ({ bomId: id, projectId, targetItemId: 'product',
      bomName: 'Product formula', bomVersion: index + 1, baseQuantity: 1, baseUnit: 'kg', bomStatus: state,
      approvedBy: 'demo-owner', approvedAt: null, note: null, lines: [] }))
    const period = { bomId: 'first', bomStatus: state, effectiveFrom: null as string | null, effectiveTo: null as string | null,
      periodVersion: 0, history: [] as { changeId: string; previousEffectiveFrom: string | null; previousEffectiveTo: string | null;
        effectiveFrom: string | null; effectiveTo: string | null; periodVersion: number; reason: string; changedBy: string; changedAt: string }[] }
    const writes: Record<string, unknown>[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const consoleErrors: string[] = []
    page.on('pageerror', (error) => consoleErrors.push(error.message))
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request(); const { pathname } = new URL(request.url())
      if (await answerAuth(route, pathname)) return
      if (pathname === '/api/boms/first/effectivity') {
        if (request.method() === 'GET') return ok(route, period)
        const body = request.postDataJSON() as Record<string, unknown>; writes.push(body)
        if (mode === 'stale') {
          period.periodVersion = 1; period.effectiveTo = '2030-02-28'
          return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false,
            data: null, message: 'The effective period changed; reload before changing effectiveFrom/effectiveTo.' }) })
        }
        if (period.periodVersion === Number(body.expectedPeriodVersion)) {
          period.history.push({ changeId: 'change-1', previousEffectiveFrom: period.effectiveFrom,
            previousEffectiveTo: period.effectiveTo, effectiveFrom: body.effectiveFrom as string | null,
            effectiveTo: body.effectiveTo as string | null, periodVersion: 1, reason: String(body.reason),
            changedBy: 'demo-owner', changedAt: '2026-10-05T14:00:00Z' })
          period.effectiveFrom = body.effectiveFrom as string | null; period.effectiveTo = body.effectiveTo as string | null
          period.periodVersion++
        }
        if (mode === 'retry' && writes.length === 1) { await gate; return route.abort('failed') }
        return ok(route, period)
      }
      if (request.method() !== 'GET') throw new Error(`Unexpected write: ${pathname}`)
      if (pathname === '/api/boms') return ok(route, boms)
      if (pathname === '/api/items') return ok(route, [{ itemId: 'product', projectId, itemCode: 'PROD', itemName: 'Product',
        unitId: 'kg', itemStatus: 'active', lotManageYn: 'N' }])
      if (pathname === '/api/units') return ok(route, [{ unitId: 'kg', unitCode: 'kg', activeYn: 'Y' }])
      if (pathname === '/api/project-members') return ok(route, [{ projectMemberId: 'pm-1', projectId, userId: 'demo-owner',
        projectRole: mode === 'viewer' ? 'viewer' : mode === 'draft-editor' || mode === 'approved-editor' ? 'editor' : 'owner', memberStatus: 'active' }])
      return ok(route, [])
    })
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/inventory?tab=boms`)
    const panel = page.getByRole('region', { name: 'BOM effective periods' })
    const selector = panel.getByLabel('Revision', { exact: true })
    await selector.selectOption('first')
    await expect(panel.getByText('Current period: No start limit → No end limit', { exact: true })).toBeVisible()
    if (mode === 'viewer' || mode === 'approved-editor') {
      await expect(panel.getByRole('button', { name: 'Load current period to edit' })).toHaveCount(0)
      expect(writes).toHaveLength(0); expect(consoleErrors).toHaveLength(0); return
    }
    await panel.getByRole('button', { name: 'Load current period to edit' }).click()
    const from = panel.getByLabel('Effective from', { exact: true }); const to = panel.getByLabel('Effective to', { exact: true })
    await from.fill('2030-01-01')
    if (mode !== 'open-boundary') await to.fill('2030-01-31')
    await panel.getByLabel('Period change reason *').fill('Engineering change')
    await expect(selector).toBeDisabled()
    await panel.getByRole('button', { name: 'Save effective period', exact: true }).click()
    if (mode === 'retry') {
      await expect(from).toBeDisabled(); await expect(selector).toBeDisabled(); release()
      await expect(panel.getByText(/The result is unconfirmed/)).toBeVisible()
      await expect(from).toBeDisabled(); await expect(selector).toBeDisabled()
      await panel.getByRole('button', { name: 'Retry the same period change' }).click()
    }
    if (mode === 'stale') {
      await expect(panel.getByRole('alert')).toContainText('The effective period changed')
      await expect(to).toHaveValue('2030-01-31')
      await panel.getByRole('button', { name: 'Discard edits and load current period' }).click()
      await expect(to).toHaveValue('2030-02-28'); await expect(selector).toBeEnabled()
    } else {
      await expect(panel.getByRole('status')).toHaveText('Effective period saved.')
      await expect(selector).toBeEnabled()
      expect(writes[0]).toMatchObject({ effectiveFrom: '2030-01-01', effectiveTo: mode === 'open-boundary' ? null : '2030-01-31',
        expectedPeriodVersion: 0, reason: 'Engineering change' })
      if (mode === 'retry') { expect(writes).toHaveLength(2); expect(writes[1]).toEqual(writes[0]) }
      expect(period.history).toHaveLength(1)
    }
    expect(consoleErrors).toHaveLength(0)
  })
}
