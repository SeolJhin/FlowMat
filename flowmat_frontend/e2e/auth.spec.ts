import { test, expect, type Page } from '@playwright/test'

const accessToken = 'eyJ.fake.access'

async function mockAuthApi(page: Page) {
  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': 'XSRF-TOKEN=test-csrf; Path=/',
      },
      body: JSON.stringify({ success: true, data: 'test-csrf', message: null }),
    })
  })

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': 'flowmat_rt=test-refresh; HttpOnly; Path=/api/auth',
      },
      body: JSON.stringify({
        success: true,
        data: {
          accessToken,
          refreshToken: null,
          deviceId: 'device-1',
          additionalInfoRequired: false,
        },
        message: null,
      }),
    })
  })

  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: { accessToken, refreshToken: null },
        message: null,
      }),
    })
  })

  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie': 'flowmat_rt=; Max-Age=0; HttpOnly; Path=/api/auth',
      },
      body: JSON.stringify({ success: true, data: null, message: null }),
    })
  })

  await page.route('**/api/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: { userId: 'demo-owner', userName: 'Demo Owner' },
        message: null,
      }),
    })
  })

  await page.route('**/api/projects', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true, data: [], message: null }),
    })
  })
}

async function mockWorkspaceApi(page: Page) {
  await page.route('**/api/workflows/wf-e2e/canvas', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: {
          workflow: {
            workflowId: 'wf-e2e',
            projectId: 'prj-e2e',
            workflowName: 'E2E Workflow',
            workflowDesc: 'Browser test workflow',
            workflowType: 'main',
            workflowStatus: 'active',
          },
          graphSeq: 1,
          currentUserRole: 'owner',
          processes: [
            {
              processId: 'process-e2e',
              projectId: 'prj-e2e',
              workflowId: 'wf-e2e',
              processName: 'Input Node',
              processType: 'input',
              nodeType: 'input',
              processStatus: 'active',
              colorScheme: 'sky',
              posX: 100,
              posY: 100,
              width: 180,
              height: 88,
              processDesc: 'E2E node',
              version: 1,
              versionNonce: 1,
            },
          ],
          processIos: [],
          connections: [],
          annotations: [],
        },
        message: null,
      }),
    })
  })

  await page.route('**/api/workflows/wf-e2e/editor-document', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: {
          schemaVersion: 1,
          camera: { x: 0, y: 0, zoom: 1 },
          nextElementSeq: 1,
          version: 1,
          versionNonce: 1,
          elements: [],
        },
        message: null,
      }),
    })
  })

  await page.route('**/api/workflows/wf-e2e/graph-changes**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true, data: { currentSeq: 1, resetRequired: false, changes: [] }, message: null }),
    })
  })

  await page.route('**/api/workflows/wf-e2e/presence', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true, data: [], message: null }),
    })
  })

  await page.route('**/api/workflows?**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true, data: [{ workflowId: 'wf-e2e', workflowName: 'E2E Workflow' }], message: null }),
    })
  })
}

test('login stores access token only in memory and refreshes through cookie', async ({ page }) => {
  await mockAuthApi(page)
  await page.goto('/')

  await page.locator('input').nth(0).fill('demo-owner')
  await page.locator('input[type="password"]').fill('demo1234')
  await page.getByRole('button', { name: 'Log in' }).click()

  await expect(page.getByText('안녕하세요, Demo Owner님')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('refresh_token'))).toBeNull()
  expect(await page.evaluate(() => document.cookie)).not.toContain('flowmat_rt')

  await page.reload()
  await expect(page.getByText('안녕하세요, Demo Owner님')).toBeVisible()
})

test('logout clears the client session and returns to login screen', async ({ page }) => {
  await mockAuthApi(page)
  await page.goto('/')
  await page.locator('input').nth(0).fill('demo-owner')
  await page.locator('input[type="password"]').fill('demo1234')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('안녕하세요, Demo Owner님')).toBeVisible()

  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page.locator('input').nth(0)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull()
})

test('two tabs keep separate in-memory access tokens while sharing the cookie session hint', async ({ browser }) => {
  const context = await browser.newContext()
  const first = await context.newPage()
  const second = await context.newPage()
  await mockAuthApi(first)
  await mockAuthApi(second)

  await first.goto('/')
  await first.locator('input').nth(0).fill('demo-owner')
  await first.locator('input[type="password"]').fill('demo1234')
  await first.getByRole('button', { name: 'Log in' }).click()
  await expect(first.getByText('안녕하세요, Demo Owner님')).toBeVisible()

  await second.goto('/')
  await expect(second.locator('input').nth(0)).toBeVisible()
  await expect(second.getByText('Restoring session...')).toBeVisible()
  await second.waitForTimeout(100)
  await expect(second.getByText('안녕하세요, Demo Owner님')).toBeVisible()
  await context.close()
})

test('an expired refresh session returns the user to login', async ({ page }) => {
  await mockAuthApi(page)
  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({ status: 401, body: JSON.stringify({ success: false, data: null }) })
  })
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('flowmat_refresh_cookie', '1'))
  await page.reload()
  await expect(page.locator('input').nth(0)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('flowmat_refresh_cookie'))).toBeNull()
})

test('a mocked OAuth provider callback completes login without storing a token', async ({ page }) => {
  await mockAuthApi(page)
  await page.route('**/api/auth/oauth2/exchange', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: {
          resultType: 'login',
          accessToken,
          signupToken: null,
          provider: 'google',
          deviceId: 'device-1',
          additionalInfoRequired: false,
        },
        message: null,
      }),
    })
  })

  await page.goto('/oauth2/success?code=mock-provider-code')
  await expect(page.getByText('안녕하세요, Demo Owner님')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull()
})

test('authenticated user can open workspace, select a node, and switch canvas tools', async ({ page }) => {
  await mockAuthApi(page)
  await mockWorkspaceApi(page)
  await page.goto('/')
  await page.locator('input').nth(0).fill('demo-owner')
  await page.locator('input[type="password"]').fill('demo1234')
  await page.getByRole('button', { name: 'Log in' }).click()

  await page.goto('/projects/prj-e2e/workflows/wf-e2e')
  await expect(page.getByText('E2E Workflow')).toBeVisible()
  await expect(page.getByText('Input Node')).toBeVisible()
  await expect(page.getByText('1 nodes | 0 connections')).toBeVisible()

  await page.getByText('Input Node').click()
  await expect(page.locator('.inspector__title')).toHaveText('Input Node')

  await page.getByRole('button', { name: 'Annotate' }).click()
  await expect(page.getByRole('button', { name: 'Save Editor' })).toBeVisible()
  await page.getByRole('button', { name: 'Home' }).click()
  await expect(page.getByRole('button', { name: 'Fit View' })).toBeVisible()
})
