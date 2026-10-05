import { QueryClient, type MutationOptions } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInventoryCountMutation, type InventoryCountInput } from './useInventoryCount'

const mock = vi.hoisted(() => ({ client: undefined as QueryClient | undefined, post: vi.fn(), states: [] as unknown[], cursor: 0 }))
vi.mock('react', () => ({
  // Preserve lazy sender state across simulated rerenders; the browser specs exercise the real React hooks.
  useState: (initialize: () => unknown) => {
    const slot = mock.cursor++
    if (!(slot in mock.states)) mock.states[slot] = initialize()
    return [mock.states[slot], vi.fn()]
  },
}))
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQueryClient: () => mock.client,
  useMutation: (options: MutationOptions<unknown, Error, unknown>) => ({
    mutateAsync: (input: unknown) => mock.client!.getMutationCache().build(mock.client!, options).execute(input),
  }),
}))
vi.mock('../../../shared/api/httpClient', () => ({ httpClient: { post: mock.post } }))

function render(projectId: string): ReturnType<typeof useInventoryCountMutation> {
  mock.cursor = 0
  return Reflect.apply(useInventoryCountMutation, undefined, [projectId])
}

describe('count acknowledgement and retry', () => {
  beforeEach(() => {
    mock.client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    mock.states = []
    mock.cursor = 0
  })
  afterEach(() => { mock.client?.clear(); vi.resetAllMocks() })

  it('recovers the original count after stock changed but its acknowledgement was lost', async () => {
    let quantity = 10
    const saved = new Map<string, object>()
    mock.post.mockImplementation(async (_path: string, body: InventoryCountInput & { projectId: string; requestId: string }) => {
      if (!saved.has(body.requestId)) {
        if (quantity !== body.lines[0].expectedQuantity) throw new Error('Stock changed')
        quantity = body.lines[0].countedQuantity
        saved.set(body.requestId, { countId: 'original', adjusted: 1, unchanged: 0, lines: [] })
      }
      if (mock.post.mock.calls.length === 1) throw new Error('Connection lost after commit')
      return { success: true, data: saved.get(body.requestId) }
    })
    const input = { lines: [{ inventoryId: 'stock', expectedQuantity: 10, countedQuantity: 8 }] }
    mock.client!.setQueryData(['inventories', 'project', 'count-history'], [])
    await expect(render('project').mutateAsync(input)).rejects.toThrow('Connection lost')
    expect(await render('project').mutateAsync(input)).toMatchObject({ countId: 'original' })
    expect(quantity).toBe(8)
    expect(mock.post.mock.calls[0][1].requestId).toBe(mock.post.mock.calls[1][1].requestId)
    expect(mock.post.mock.calls[1][0]).toBe('/inventory-counts')
    expect(mock.client!.getQueryState(['inventories', 'project', 'count-history'])?.isInvalidated).toBe(true)
  })

  it('keeps the same set of counts when a refresh reverses record order without mutating the callers array', async () => {
    mock.post.mockRejectedValue(new Error('offline'))
    const first = { inventoryId: 'first', expectedQuantity: 10, countedQuantity: 8 }
    const second = { inventoryId: 'second', expectedQuantity: 5, countedQuantity: 4 }
    const lines = [second, first]
    await expect(render('project').mutateAsync({ lines })).rejects.toThrow('offline')
    await expect(render('project').mutateAsync({ lines: [...lines].reverse() })).rejects.toThrow('offline')
    expect(lines).toEqual([second, first])
    expect(mock.post.mock.calls[0][1].requestId).toBe(mock.post.mock.calls[1][1].requestId)
  })

  it('allocates a different key for edited counts instead of recovering the earlier count', async () => {
    mock.post.mockRejectedValue(new Error('offline'))
    const line = { inventoryId: 'stock', expectedQuantity: 10, countedQuantity: 8 }
    await expect(render('project').mutateAsync({ lines: [line] })).rejects.toThrow('offline')
    await expect(render('project').mutateAsync({ lines: [{ ...line, countedQuantity: 9 }] })).rejects.toThrow('offline')
    await expect(render('project').mutateAsync({ lines: [{ ...line, expectedQuantity: 12 }] })).rejects.toThrow('offline')
    expect(new Set(mock.post.mock.calls.map((call) => call[1].requestId)).size).toBe(3)
  })
})