import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testIgnore: [
    ...(process.env.STAGING_OAUTH_CALLBACK_URL ? [] : ['**/staging-oauth.spec.ts']),
    ...(process.env.REAL_API_E2E ? [] : ['**/backend-contract.spec.ts', '**/bom-lot-flow.spec.ts', '**/lot-genealogy.spec.ts', '**/inventory-reports.spec.ts']),
  ],
  fullyParallel: true,
  // Real-API specs all log in as demo-owner against one backend; concurrent logins of the same user currently knock
  // each other out (401), so run them one at a time.
  ...(process.env.REAL_API_E2E ? { workers: 1 } : {}),
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run dev -- --host 127.0.0.1 --port 4173',
          url: 'http://127.0.0.1:4173',
          reuseExistingServer: !process.env.CI,
        },
      }),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
