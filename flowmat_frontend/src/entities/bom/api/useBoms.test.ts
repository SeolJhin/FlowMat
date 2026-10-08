import { QueryClient, type MutationOptions } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBomActionMutation } from './useBoms'

const mock = vi.hoisted(() => ({ client: undefined as QueryClient | undefined, post: vi.fn() }))
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQueryClient: () => mock.client,
  useMutation: (options: MutationOptions<unknown, Error, unknown>) => ({
    mutateAsync: (input: unknown) => mock.client!.getMutationCache().build(mock.client!, options).execute(input),
  }),
}))
vi.mock('../../../shared/api/httpClient', () => ({ httpClient: { post: mock.post } }))

function render(projectId: string): ReturnType<typeof useBomActionMutation> {
  return Reflect.apply(useBomActionMutation, undefined, [projectId])
}
const revision = { bomId: 'created-revision', bomVersion: 2 }
const command = (bomId: string) => ({ bomId, action: 'revisions' as const })

describe('revision acknowledgement', () => {
  beforeEach(() => { mock.client = new QueryClient({ defaultOptions: { mutations: { retry: false } } }) })
  afterEach(() => { mock.client?.clear(); vi.resetAllMocks() })

  it.each([new Error('connection lost after commit'), { httpStatus: 503, message: 'gateway unavailable' }])(
    'recovers the original draft after an unconfirmed response across detail remounts: %s', async (failure) => {
      const projectId = crypto.randomUUID()
      const reply = { ...revision, projectId }
      const saved = new Map<string, typeof reply>()
      mock.post.mockImplementation(async (_path: string, body: { requestId: string }) => {
        saved.set(body.requestId, reply)
        if (mock.post.mock.calls.length === 1) throw failure
        return { success: true, data: saved.get(body.requestId) }
      })
      mock.client!.setQueryData(['boms', projectId], [])
      await expect(render(projectId).mutateAsync(command('source'))).rejects.toEqual(failure)
      expect(await render(projectId).mutateAsync(command('source'))).toEqual(reply)
      expect(saved.size).toBe(1)
      expect(mock.post.mock.calls[0][1].requestId).toBe(mock.post.mock.calls[1][1].requestId)
      expect(mock.client!.getQueryState(['boms', projectId])?.isInvalidated).toBe(true)
    },
  )

  it('uses a new command after a confirmed rejection and after a confirmed success', async () => {
    const projectId = crypto.randomUUID()
    mock.post.mockRejectedValueOnce({ httpStatus: 409, message: 'source retired' })
      .mockResolvedValue({ success: true, data: { ...revision, projectId } })
    await expect(render(projectId).mutateAsync(command('source'))).rejects.toMatchObject({ httpStatus: 409 })
    await render(projectId).mutateAsync(command('source'))
    await render(projectId).mutateAsync(command('source'))
    expect(new Set(mock.post.mock.calls.map((call) => call[1].requestId)).size).toBe(3)
  })

  it('separates unconfirmed revisions by source and project', async () => {
    const projectId = crypto.randomUUID()
    mock.post.mockRejectedValue(new Error('offline'))
    for (const [project, source] of [[projectId, 'source'], [projectId, 'other/source'], [`${projectId}-other`, 'source'], [projectId, 'source']])
      await expect(render(project).mutateAsync(command(source))).rejects.toThrow('offline')
    expect(new Set(mock.post.mock.calls.map((call) => call[1].requestId)).size).toBe(3)
    expect(mock.post.mock.calls[0][1].requestId).toBe(mock.post.mock.calls[3][1].requestId)
    expect(mock.post.mock.calls[1][0]).toBe('/boms/other%2Fsource/revisions')
  })

  it('keeps its receipt after a malformed success instead of confirming a nonexistent revision', async () => {
    const projectId = crypto.randomUUID()
    mock.post.mockResolvedValueOnce({ success: true, data: { ...revision, projectId: 'foreign' } })
      .mockResolvedValue({ success: true, data: { ...revision, projectId } })
    await expect(render(projectId).mutateAsync(command('source'))).rejects.toThrow('response is invalid')
    await render(projectId).mutateAsync(command('source'))
    expect(mock.post.mock.calls[0][1].requestId).toBe(mock.post.mock.calls[1][1].requestId)
  })

  it('keeps approval notes and actions out of the revision receipt', async () => {
    mock.post.mockResolvedValue({ success: true, data: revision })
    await render(crypto.randomUUID()).mutateAsync({ bomId: 'source', action: 'reject', note: 'Change material' })
    expect(mock.post).toHaveBeenCalledWith('/boms/source/reject', { note: 'Change material' })
  })
})
