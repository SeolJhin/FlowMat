import { QueryClient, type MutationOptions } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEquipmentHourlyCost } from './useEquipmentHourlyCost'

const mock = vi.hoisted(() => ({ client: undefined as QueryClient | undefined, get: vi.fn(), put: vi.fn(), queryFn: undefined as (() => Promise<unknown>) | undefined }))
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQueryClient: () => mock.client,
  useQuery: (options: { queryFn: () => Promise<unknown> }) => { mock.queryFn = options.queryFn; return {} },
  useMutation: (options: MutationOptions<unknown, Error, unknown>) => ({
    mutateAsync: (input: unknown) => mock.client!.getMutationCache().build(mock.client!, options).execute(input),
  }),
}))
vi.mock('../../../shared/api/httpClient', () => ({ httpClient: { get: mock.get, put: mock.put } }))
const blank = { equipmentId: 'press', hourlyCost: null, version: 0, updatedBy: null, updatedAt: null }
const saved = { ...blank, hourlyCost: 60, version: 1, updatedBy: 'editor' }
const key = ['equipment-hourly-cost', 'press']
function render() { return Reflect.apply(useEquipmentHourlyCost, undefined, ['press', 'project']) }

describe('equipment planning rate acknowledgements', () => {
  beforeEach(() => { mock.client = new QueryClient({ defaultOptions: { mutations: { retry: 3 } } }) })
  afterEach(() => { mock.client?.clear(); vi.resetAllMocks() })
  it.each([[], 1, { ...saved, equipmentId: 'other' }, { ...saved, version: -1 }, { ...saved, version: 1.5 },
    { ...saved, hourlyCost: -1 }, { ...saved, hourlyCost: Infinity }, { ...saved, hourlyCost: '60' }])(
    'refuses a corrupt or foreign loaded rate %j', async (data) => {
      mock.get.mockResolvedValue({ success: true, data }); render()
      await expect(mock.queryFn!()).rejects.toThrow('response is invalid')
    },
  )
  it('loads unknown and known-zero rates without treating either as a failed read', async () => {
    mock.get.mockResolvedValueOnce({ success: true, data: blank }).mockResolvedValue({ success: true, data: { ...saved, hourlyCost: 0 } })
    render(); expect(await mock.queryFn!()).toEqual(blank)
    expect(await mock.queryFn!()).toMatchObject({ hourlyCost: 0 })
  })
  it('does not acknowledge a malformed saved rate or poison the loaded version', async () => {
    mock.client!.setQueryData(key, blank)
    mock.client!.setQueryData(['equipment-load', 'project'], {})
    mock.put.mockResolvedValueOnce({ success: true, data: { ...saved, version: '1' } }).mockResolvedValue({ success: true, data: saved })
    const command = { hourlyCost: 60, expectedVersion: 0 }
    await expect(render().save.mutateAsync(command)).rejects.toThrow('response is invalid')
    expect(mock.client!.getQueryData(key)).toEqual(blank)
    expect(await render().save.mutateAsync(command)).toEqual(saved)
    expect(mock.client!.getQueryData(key)).toEqual(saved)
    expect(mock.client!.getQueryState(['equipment-load', 'project'])?.isInvalidated).toBe(true)
    expect(mock.put.mock.calls[1][1]).toEqual(command)
  })
  it('cancels an older in-flight read before acknowledging a save', async () => {
    let finishRead: ((value: unknown) => void) | undefined
    mock.get.mockReturnValue(new Promise((resolve) => { finishRead = resolve }))
    mock.put.mockResolvedValue({ success: true, data: saved })
    const hook = render()
    const oldRead = mock.client!.fetchQuery({ queryKey: key, queryFn: mock.queryFn! }).catch(() => undefined)
    await hook.save.mutateAsync({ hourlyCost: 60, expectedVersion: 0 })
    finishRead!({ success: true, data: blank }); await oldRead
    expect(mock.client!.getQueryData(key)).toEqual(saved)
  })
  it('does not automatically repeat an unconfirmed PUT even when the shared client retries other mutations', async () => {
    mock.put.mockRejectedValue({ httpStatus: 503, message: 'gateway unavailable' })
    await expect(render().save.mutateAsync({ hourlyCost: 60, expectedVersion: 0 })).rejects.toMatchObject({ httpStatus: 503 })
    expect(mock.put).toHaveBeenCalledTimes(1)
  })
})
