import { QueryClient, type MutationOptions } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEquipmentChangeoverMutations } from './useEquipmentChangeovers'
const mock = vi.hoisted(() => ({ client: undefined as QueryClient | undefined, post: vi.fn(), put: vi.fn(), remove: vi.fn() }))
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQueryClient: () => mock.client,
  useMutation: (options: MutationOptions<unknown, Error, unknown>) => ({
    mutateAsync: (input: unknown) => mock.client!.getMutationCache().build(mock.client!, options).execute(input),
  }),
}))
vi.mock('../../../shared/api/httpClient', () => ({ httpClient: { post: mock.post, put: mock.put, delete: mock.remove } }))
const rule = { changeoverId: 'rule', equipmentId: 'press', fromItemId: 'A', toItemId: 'B', minutes: 30, note: null }
const key = ['equipment-changeovers', 'press']
const readiness = ['work-order-readiness', 'order']
const plan = ['work-order-plan', 'order', '2030-01-01']
const load = ['equipment-load', 'project', '2030-01-01', '2030-01-08']
const preview = ['equipment-setup-preview', 'press', 'A', 'B']
const hook = () => Reflect.apply(useEquipmentChangeoverMutations, undefined, ['press'])
describe('item-pair changeover refreshes every affected planning view', () => {
  beforeEach(() => {
    mock.client = new QueryClient()
    for (const queryKey of [readiness, plan, load, preview]) mock.client.setQueryData(queryKey, { changeoverMinutes: 0 })
    mock.client.setQueryData(key, [])
  })
  afterEach(() => { mock.client?.clear(); vi.resetAllMocks() })
  it.each(['add', 'update', 'remove'] as const)('refreshes plans and load estimates after %s', async (action) => {
    const commands = hook()
    mock.post.mockResolvedValue({ success: true, data: [rule] })
    mock.put.mockResolvedValue({ success: true, data: [rule] })
    mock.remove.mockResolvedValue({ success: true, data: [] })
    if (action === 'add') await commands.add.mutateAsync({ fromItemId: 'A', toItemId: 'B', minutes: 30, note: null })
    else if (action === 'update') await commands.update.mutateAsync({ changeoverId: 'rule', minutes: 30, note: null })
    else await commands.remove.mutateAsync('rule')
    expect(mock.client!.getQueryData(key)).toEqual(action === 'remove' ? [] : [rule])
    for (const queryKey of [readiness, plan, load, preview]) expect(mock.client!.getQueryState(queryKey)?.isInvalidated).toBe(true)
  })
  it('does not advertise a changed plan when the command was rejected', async () => {
    mock.put.mockRejectedValue({ httpStatus: 409, message: 'rule changed' })
    await expect(hook().update.mutateAsync({ changeoverId: 'rule', minutes: 30, note: null })).rejects.toMatchObject({ httpStatus: 409 })
    for (const queryKey of [readiness, plan, load, preview]) expect(mock.client!.getQueryState(queryKey)?.isInvalidated).toBe(false)
  })
})
