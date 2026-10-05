import { QueryClient, type MutationOptions } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useExpiredWriteOffMutation, type ExpiredWriteOffInput } from './useExpiredWriteOffMutation'

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

function render(projectId: string): ReturnType<typeof useExpiredWriteOffMutation> {
  mock.cursor = 0
  return Reflect.apply(useExpiredWriteOffMutation, undefined, [projectId])
}

describe('expired write-off command acknowledgement', () => {
  beforeEach(() => {
    mock.client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    mock.states = []
    mock.cursor = 0
  })
  afterEach(() => { mock.client?.clear(); vi.resetAllMocks() })

  it('replays the first write-off when the stock and LOT closure were saved before a connection failure', async () => {
    let stock = 5
    const saved = new Map<string, object>()
    mock.post.mockImplementation(async (_path: string, body: ExpiredWriteOffInput & { projectId: string; requestId: string }) => {
      if (!saved.has(body.requestId)) {
        saved.set(body.requestId, { lots: 1, value: stock * 2, valueComplete: true,
          lines: [{ lotId: 'lot', lotNo: 'EXPIRED', writtenOff: stock, closed: body.closeLots }] })
        stock = 0
      }
      if (mock.post.mock.calls.length === 1) throw new Error('Connection lost after commit')
      return { success: true, data: saved.get(body.requestId) }
    })
    const input = { lotIds: ['lot'], closeLots: true }
    mock.client!.setQueryData(['lots', 'project'], [])
    await expect(render('project').mutateAsync(input)).rejects.toThrow('Connection lost')
    expect(await render('project').mutateAsync(input)).toMatchObject({ value: 10, lines: [{ writtenOff: 5, closed: true }] })
    expect(stock).toBe(0)
    expect(mock.post.mock.calls[0][1].requestId).toBe(mock.post.mock.calls[1][1].requestId)
    expect(mock.post.mock.calls[1][0]).toBe('/lots/expired/write-off')
    expect(mock.client!.getQueryState(['lots', 'project'])?.isInvalidated).toBe(true)
  })

  it('does not turn a changed LOT set or closure flag into a replay of another operation', async () => {
    mock.post.mockRejectedValue(new Error('offline'))
    for (const input of [
      { lotIds: ['original'], closeLots: false },
      { lotIds: ['new'], closeLots: false },
      { lotIds: ['original'], closeLots: true },
    ]) await expect(render('project').mutateAsync(input)).rejects.toThrow('offline')
    expect(new Set(mock.post.mock.calls.map((call) => call[1].requestId)).size).toBe(3)
  })

  it('keeps a LOT set identical when its order changes without sorting the callers array', async () => {
    mock.post.mockRejectedValue(new Error('offline'))
    const lotIds = ['second', 'first']
    await expect(render('project').mutateAsync({ lotIds, closeLots: false })).rejects.toThrow('offline')
    await expect(render('project').mutateAsync({ lotIds: [...lotIds].reverse(), closeLots: false })).rejects.toThrow('offline')
    expect(lotIds).toEqual(['second', 'first'])
    expect(mock.post.mock.calls[0][1].requestId).toBe(mock.post.mock.calls[1][1].requestId)
  })
})