import { QueryClient, type MutationOptions } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFefoIssueMutation, type FefoIssueInput } from './useFefoIssueMutation'

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

function render(projectId: string): ReturnType<typeof useFefoIssueMutation> {
  mock.cursor = 0
  return Reflect.apply(useFefoIssueMutation, undefined, [projectId])
}

describe('FEFO command retries through the mutation and API envelope', () => {
  beforeEach(() => {
    mock.client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    mock.states = []
    mock.cursor = 0
  })
  afterEach(() => { mock.client?.clear(); vi.resetAllMocks() })

  for (const action of ['issue', 'reserve'] as const) {
    it(`${action} retains its key through a lost acknowledgement and rerender`, async () => {
      let available = 20
      const saved = new Map<string, object>()
      mock.post.mockImplementation(async (_path: string, body: FefoIssueInput & { projectId: string; requestId: string }) => {
        if (!saved.has(body.requestId)) {
          available -= body.quantity
          saved.set(body.requestId, { itemId: body.itemId, action, quantity: body.quantity, unit: 'kg', lines: [] })
        }
        if (mock.post.mock.calls.length === 1) throw new Error('Connection lost after commit')
        return { success: true, data: saved.get(body.requestId), message: null }
      })
      const input = { itemId: 'item', quantity: 4, action }
      mock.client!.setQueryData(['inventories', 'project'], [])
      await expect(render('project').mutateAsync(input)).rejects.toThrow('Connection lost')
      expect(await render('project').mutateAsync(input)).toMatchObject({ quantity: 4, action })
      expect(mock.post.mock.calls[0][1].requestId).toBe(mock.post.mock.calls[1][1].requestId)
      expect(mock.post.mock.calls[1]).toEqual(['/inventories/issue-fefo', expect.objectContaining({ projectId: 'project', ...input })])
      expect(available).toBe(16)
      expect(mock.client!.getQueryState(['inventories', 'project'])?.isInvalidated).toBe(true)
    })
  }

  it('keeps projects separate when the same mounted hook receives a different project', async () => {
    mock.post.mockRejectedValue(new Error('offline'))
    const input = { itemId: 'item', quantity: 4, action: 'issue' as const }
    for (const project of ['first', 'second', 'first']) {
      await expect(render(project).mutateAsync(input)).rejects.toThrow('offline')
    }
    const bodies = mock.post.mock.calls.map((call) => call[1])
    expect(bodies.map((body) => body.projectId)).toEqual(['first', 'second', 'first'])
    expect(bodies[0].requestId).not.toBe(bodies[1].requestId)
    expect(bodies[2].requestId).toBe(bodies[0].requestId)
  })

  it('does not acknowledge an HTTP 200 envelope that rejected the command', async () => {
    mock.post.mockResolvedValueOnce({ success: false, data: null, message: 'Stock is not available' })
      .mockResolvedValueOnce({ success: true, data: { itemId: 'item', action: 'issue', quantity: 4, unit: 'kg', lines: [] } })
    const input = { itemId: 'item', quantity: 4, action: 'issue' as const }
    await expect(render('project').mutateAsync(input)).rejects.toMatchObject({ message: 'Stock is not available' })
    await render('project').mutateAsync(input)
    expect(mock.post.mock.calls[0][1].requestId).toBe(mock.post.mock.calls[1][1].requestId)
  })
})