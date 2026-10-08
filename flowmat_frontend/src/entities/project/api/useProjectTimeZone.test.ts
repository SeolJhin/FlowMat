import { QueryClient, type MutationOptions } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { useProjectTimeZone } from './useProjectTimeZone'
const mock = vi.hoisted(() => ({ client: undefined as QueryClient | undefined, get: vi.fn(), put: vi.fn(), queryFn: undefined as (() => Promise<unknown>) | undefined }))
vi.mock('@tanstack/react-query', async (original) => ({
  ...await original<typeof import('@tanstack/react-query')>(),
  useQueryClient: () => mock.client,
  useQuery: (options: { queryFn: () => Promise<unknown> }) => { mock.queryFn = options.queryFn; return {} },
  useMutation: (options: MutationOptions<unknown, Error, unknown>) => ({ mutateAsync: (input: unknown) => mock.client!.getMutationCache().build(mock.client!, options).execute(input) }),
}))
vi.mock('../../../shared/api/httpClient', () => ({ httpClient: { get: mock.get, put: mock.put } }))
const old = { projectId: 'project', timeZone: 'Asia/Seoul', version: 0 }
const saved = { ...old, timeZone: 'UTC', version: 1 }
const key = ['project-time-zone', 'project']
const render = () => Reflect.apply(useProjectTimeZone, undefined, ['project'])
beforeEach(() => { mock.client = new QueryClient({ defaultOptions: { mutations: { retry: 3 } } }) })
afterEach(() => { mock.client?.clear(); vi.resetAllMocks() })
it.each([null, { ...old, projectId: 'foreign' }, { ...old, version: -1 }, { ...old, timeZone: '' }])('rejects malformed read %j', async (data) => {
  mock.get.mockResolvedValue({ success: true, data }); render()
  await expect(mock.queryFn!()).rejects.toThrow('response is invalid')
})
it('preserves version and does not automatically repeat an unconfirmed write', async () => {
  mock.put.mockRejectedValue(new Error('connection lost'))
  await expect(render().save.mutateAsync({ timeZone: 'UTC', expectedVersion: 0 })).rejects.toThrow('connection lost')
  expect(mock.put).toHaveBeenCalledTimes(1)
})
it('rejects wrong acknowledgements and retains the previous cache', async () => {
  mock.client!.setQueryData(key, old)
  mock.put.mockResolvedValue({ success: true, data: { ...saved, timeZone: 'Europe/Paris' } })
  await expect(render().save.mutateAsync({ timeZone: 'UTC', expectedVersion: 0 })).rejects.toThrow('response is invalid')
  expect(mock.client!.getQueryData(key)).toEqual(old)
})
it('refreshes project business-date queries after a confirmed save', async () => {
  mock.client!.setQueryData(['inventories', 'project'], [])
  mock.client!.setQueryData(['equipment-schedule', 'press'], {})
  mock.put.mockResolvedValue({ success: true, data: saved })
  expect(await render().save.mutateAsync({ timeZone: 'UTC', expectedVersion: 0 })).toEqual(saved)
  expect(mock.client!.getQueryData(key)).toEqual(saved)
  expect(mock.client!.getQueryState(['inventories', 'project'])?.isInvalidated).toBe(true)
  expect(mock.client!.getQueryState(['equipment-schedule', 'press'])?.isInvalidated).toBe(true)
})
it('cancels an older read before writing the confirmed version', async () => {
  let reply: ((value: unknown) => void) | undefined
  mock.get.mockReturnValue(new Promise((resolve) => { reply = resolve }))
  mock.put.mockResolvedValue({ success: true, data: saved })
  const hook = render()
  const oldRead = mock.client!.fetchQuery({ queryKey: key, queryFn: mock.queryFn! }).catch(() => undefined)
  await hook.save.mutateAsync({ timeZone: 'UTC', expectedVersion: 0 })
  reply!({ success: true, data: old }); await oldRead
  expect(mock.client!.getQueryData(key)).toEqual(saved)
})
