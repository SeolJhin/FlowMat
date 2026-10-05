import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStorageLocationMutations } from './useStorageLocations'

const mock = vi.hoisted(() => ({ client: undefined as QueryClient | undefined, put: vi.fn() }))

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQueryClient: () => mock.client,
  // No DOM is needed: run the real mutation and its success callback against a real QueryClient.
  useMutation: (options: { mutationFn: (input: unknown) => Promise<unknown>; onSuccess: () => Promise<void> }) => ({
    mutateAsync: async (input: unknown) => {
      const result = await options.mutationFn(input)
      await options.onSuccess()
      return result
    },
  }),
}))
vi.mock('../../../shared/api/httpClient', () => ({ httpClient: { put: mock.put } }))

describe('location code changes refresh the views whose stock and tasks moved', () => {
  beforeEach(() => {
    mock.client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } })
    mock.put.mockResolvedValue({ success: true, data: { locationId: 'place', locationCode: 'NEW' }, message: null })
  })
  afterEach(() => {
    mock.client?.clear()
    vi.clearAllMocks()
  })

  it('invalidates fresh stock, stock analysis and task caches while preserving other projects', async () => {
    const client = mock.client!
    const affected = [
      ['storage-locations', 'project'], ['inventories', 'project'], ['inventories', 'project', 'analysis', 30, 'OLD'],
      ['inventories', 'project', 'transfers', 30], ['warehouse-tasks', 'project', 'open'],
      ['warehouse-tasks', 'project', 'done'],
    ]
    for (const key of [...affected, ['inventories', 'other'], ['warehouse-tasks', 'other', 'open']]) {
      client.setQueryData(key, [{ location: 'OLD' }])
    }
    const mutations: ReturnType<typeof useStorageLocationMutations> = Reflect.apply(useStorageLocationMutations, undefined, ['project'])
    await mutations.update.mutateAsync({ locationId: 'place', input: { locationCode: 'NEW' } })
    for (const key of affected) expect(client.getQueryState(key)?.isInvalidated, key.join('/')).toBe(true)
    expect(client.getQueryState(['inventories', 'other'])?.isInvalidated).toBe(false)
    expect(client.getQueryState(['warehouse-tasks', 'other', 'open'])?.isInvalidated).toBe(false)
  })

  it('cancels a stock response started before the rename so it cannot restore the old place', async () => {
    const client = mock.client!
    let signal: AbortSignal | undefined
    let release!: (value: unknown[]) => void
    const pending = client.fetchQuery({ queryKey: ['inventories', 'project'], queryFn: (context) => {
      signal = context.signal
      return new Promise<unknown[]>((resolve) => { release = resolve })
    } }).catch(() => undefined)
    try {
      const mutations: ReturnType<typeof useStorageLocationMutations> = Reflect.apply(useStorageLocationMutations, undefined, ['project'])
      await mutations.update.mutateAsync({ locationId: 'place', input: { locationCode: 'NEW' } })
      expect(signal?.aborted).toBe(true)
    } finally {
      release([{ location: 'OLD' }])
      await pending
    }
  })
})
