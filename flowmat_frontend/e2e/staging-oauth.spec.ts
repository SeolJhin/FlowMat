import { test, expect } from '@playwright/test'

test('staging OAuth provider smoke callback completes authentication', async ({ page }) => {
  const callbackUrl = process.env.STAGING_OAUTH_CALLBACK_URL
  if (!callbackUrl) {
    throw new Error('STAGING_OAUTH_CALLBACK_URL must contain a real provider callback URL for staging smoke.')
  }

  await page.goto(callbackUrl)
  await expect(page).toHaveURL(/\/($|\?)/, { timeout: 30_000 })
  await expect(page.getByText(/안녕하세요|Hello|FlowMat/).first()).toBeVisible({ timeout: 30_000 })
})
