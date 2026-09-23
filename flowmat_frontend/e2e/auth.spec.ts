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
  await expect(first.getByText('Demo Owner')).toBeVisible()

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

  await page.goto('/oauth/callback?code=mock-provider-code')
  await expect(page.getByText('안녕하세요, Demo Owner님')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull()
})
