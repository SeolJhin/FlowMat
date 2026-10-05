# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bom-effectivity.spec.ts >> BOM effective period: draft-editor
- Location: e2e\bom-effectivity.spec.ts:6:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input').first()
    - waiting for navigation to finish...
    5 × navigated to "http://127.0.0.1:4188/"
      - waiting for "http://127.0.0.1:4188/" navigation to finish...
    - navigated to "http://127.0.0.1:4188/"

```

# Test source

```ts
  1  | import { expect, type Page, type Route } from '@playwright/test'
  2  | 
  3  | /**
  4  |  * For specs that answer the whole API themselves, so nothing is written to a real database (BOMs, for one, are kept out of
  5  |  * the dev database). They run in CI's plain browser-e2e step, without REAL_API_E2E.
  6  |  */
  7  | 
  8  | /** A successful answer in the backend's envelope. */
  9  | export async function ok(route: Route, data: unknown) {
  10 |   await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, message: null }) })
  11 | }
  12 | 
  13 | /** Answers the sign-in calls (CSRF, login, refresh, current user) as the backend does; true when it did. */
  14 | export async function answerAuth(route: Route, pathname: string): Promise<boolean> {
  15 |   if (pathname === '/api/auth/csrf') {
  16 |     await route.fulfill({
  17 |       status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'XSRF-TOKEN=test-csrf; Path=/' },
  18 |       body: JSON.stringify({ success: true, data: 'test-csrf', message: null }),
  19 |     })
  20 |     return true
  21 |   }
  22 |   if (pathname === '/api/auth/login') {
  23 |     await route.fulfill({
  24 |       status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'flowmat_rt=test-refresh; HttpOnly; Path=/api/auth' },
  25 |       body: JSON.stringify({ success: true, data: {
  26 |         accessToken: 'eyJ.fake.access', refreshToken: null, deviceId: 'device-1', additionalInfoRequired: false,
  27 |       }, message: null }),
  28 |     })
  29 |     return true
  30 |   }
  31 |   if (pathname === '/api/auth/refresh') {
  32 |     await ok(route, { accessToken: 'eyJ.fake.access', refreshToken: null })
  33 |     return true
  34 |   }
  35 |   if (pathname === '/api/users/me') {
  36 |     await ok(route, { userId: 'demo-owner', userName: 'Demo Owner' })
  37 |     return true
  38 |   }
  39 |   if (pathname === '/api/users/me/permissions') {
  40 |     await ok(route, { canManageUsers: false })
  41 |     return true
  42 |   }
  43 |   return false
  44 | }
  45 | 
  46 | /** Logs in through the login form; the mocked API answers it. */
  47 | export async function mockedLogin(page: Page) {
  48 |   await page.goto('/')
> 49 |   await page.locator('input').nth(0).fill('demo-owner')
     |                                      ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  50 |   await page.locator('input[type="password"]').fill('demo1234')
  51 |   await page.getByRole('button', { name: 'Log in' }).click()
  52 |   await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 15_000 })
  53 | }
  54 | 
```