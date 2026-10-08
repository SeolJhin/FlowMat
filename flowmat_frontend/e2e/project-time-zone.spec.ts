import { test, expect } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'
for (const mode of ['normal', 'lost-reply', 'viewer'] as const) {
  test(`project business time zone with ${mode}`, async ({ page }) => {
    const projectId = 'zone-fixture'
    let zone = { projectId, timeZone: 'Asia/Seoul', version: 0 }
    const commands: { timeZone: string; expectedVersion: number }[] = []
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname
      if (await answerAuth(route, path)) return
      if (path.endsWith('/time-zone')) {
        if (request.method() === 'GET') return ok(route, zone)
        const input = request.postDataJSON(); commands.push(input)
        if (input.expectedVersion === zone.version) zone = { ...zone, timeZone: input.timeZone, version: zone.version + 1 }
        else if (input.expectedVersion !== zone.version - 1 || input.timeZone !== zone.timeZone)
          return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, data: null, message: 'expectedVersion is stale; reload the project time zone.' }) })
        if (mode === 'lost-reply' && commands.length === 1) return route.abort('failed')
        return ok(route, zone)
      }
      if (request.method() !== 'GET') throw new Error(`Unexpected write ${path}`)
      if (path === '/api/project-members') return ok(route, [{ projectMemberId: 'membership', projectId, userId: 'demo-owner', projectRole: mode === 'viewer' ? 'viewer' : 'owner', memberStatus: 'active' }])
      if (path === '/api/projects') return ok(route, [{ projectId, projectName: 'Zone fixture', projectStatus: 'active' }])
      return ok(route, [])
    })
    await mockedLogin(page)
    await page.goto(`/projects/${projectId}/settings`)
    const panel = page.getByRole('region', { name: 'Project time zone' })
    await expect(panel.getByText('Asia/Seoul', { exact: true })).toBeVisible()
    if (mode === 'viewer') {
      await expect(panel.getByRole('button', { name: 'Save time zone' })).toHaveCount(0)
      expect(commands).toHaveLength(0); return
    }
    const input = panel.getByRole('textbox', { name: 'IANA time zone' })
    await input.fill('UTC'); await panel.getByRole('button', { name: 'Save time zone' }).click()
    if (mode === 'lost-reply') {
      await expect(panel.getByRole('alert')).toContainText('unconfirmed')
      await expect(input).toBeDisabled()
      await panel.getByRole('button', { name: 'Retry time zone save' }).click()
      await expect(panel.getByText('UTC', { exact: true })).toBeVisible()
      expect(commands).toEqual([{ timeZone: 'UTC', expectedVersion: 0 }, { timeZone: 'UTC', expectedVersion: 0 }])
    } else {
      await expect(panel.getByText('UTC', { exact: true })).toBeVisible()
      zone = { ...zone, timeZone: 'Europe/Paris', version: 2 }
      await input.fill('America/New_York'); await panel.getByRole('button', { name: 'Save time zone' }).click()
      await expect(panel.getByRole('alert')).toContainText('expectedVersion')
      await expect(input).toHaveValue('America/New_York')
      await panel.getByRole('button', { name: 'Reload time zone' }).click()
      await expect(input).toHaveValue('Europe/Paris')
      await input.fill('America/New_York'); await panel.getByRole('button', { name: 'Save time zone' }).click()
      await expect(panel.getByText('America/New_York', { exact: true })).toBeVisible()
      expect(commands.at(-1)).toEqual({ timeZone: 'America/New_York', expectedVersion: 2 })
    }
  })
}
