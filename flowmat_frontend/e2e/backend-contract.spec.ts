import { test, expect } from '@playwright/test'

test('backend contract is reachable through the frontend proxy', async ({ request }) => {
  let healthPayload: { status?: string } = {}
  await expect.poll(
    async () => {
      const health = await request.get('/api/actuator/health/readiness')
      healthPayload = (await health.json()) as { status?: string }
      return health.ok() && healthPayload.status === 'UP'
    },
    { timeout: 30_000, intervals: [500, 1_000, 2_000] },
  ).toBe(true)

  const csrf = await request.get('/api/auth/csrf')
  expect(csrf.ok()).toBeTruthy()
  const csrfEnvelope = await csrf.json()
  expect(csrfEnvelope.success).toBe(true)
  expect(csrfEnvelope.data).toEqual(expect.any(String))

  const login = await request.post('/api/auth/login', {
    headers: { 'X-XSRF-TOKEN': csrfEnvelope.data },
    data: { userIdOrEmail: 'demo-owner', password: 'demo1234' },
  })
  expect(login.ok()).toBeTruthy()
  const loginEnvelope = await login.json()
  expect(loginEnvelope.success).toBe(true)
  expect(loginEnvelope.data.accessToken).toEqual(expect.any(String))

  const openApi = await request.get('/api/v3/api-docs', {
    headers: { Authorization: `Bearer ${loginEnvelope.data.accessToken}` },
  })
  expect(openApi.ok()).toBeTruthy()
  const openApiDocument = await openApi.json()
  expect(openApiDocument.openapi).toEqual(expect.any(String))
  expect(openApiDocument.paths).toEqual(expect.any(Object))

  const currentUser = await request.get('/api/users/me', {
    headers: { Authorization: `Bearer ${loginEnvelope.data.accessToken}` },
  })
  expect(currentUser.ok()).toBeTruthy()
  const currentUserEnvelope = await currentUser.json()
  expect(currentUserEnvelope.success).toBe(true)
  expect(currentUserEnvelope.data.userId).toBe('demo-owner')
})
