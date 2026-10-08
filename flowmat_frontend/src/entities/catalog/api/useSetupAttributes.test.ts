import { QueryClient, type MutationOptions } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useItemSetupAttributes, useSetupChangeovers } from './useSetupAttributes'
const mock = vi.hoisted(() => ({ client: undefined as QueryClient | undefined, get: vi.fn(), put: vi.fn(), remove: vi.fn(), queryFn: undefined as (() => Promise<unknown>) | undefined }))
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQueryClient: () => mock.client,
  useQuery: (options: { queryFn: () => Promise<unknown> }) => { mock.queryFn = options.queryFn; return {} },
  useMutation: (options: MutationOptions<unknown, Error, unknown>) => ({
    mutateAsync: (input: unknown) => mock.client!.getMutationCache().build(mock.client!, options).execute(input),
  }),
}))
vi.mock('../../../shared/api/httpClient', () => ({ httpClient: { get: mock.get, put: mock.put, delete: mock.remove } }))
const item = { itemId: 'item', attributes: {}, version: 0 }
const saved = { ...item, attributes: { color: 'red', mold: 'M1' }, version: 1 }
const id = '773d548a-377b-4e53-b328-f207ca7d61f8'
const rule = { changeoverId: id, equipmentId: 'press', fromAttributes: { mold: 'M1' }, toAttributes: {}, priority: 10, minutes: 30, note: null, version: 1 }
const itemHook = () => Reflect.apply(useItemSetupAttributes, undefined, ['item', 'project'])
const rulesHook = () => Reflect.apply(useSetupChangeovers, undefined, ['press', 'project'])
describe('setup data acknowledgement', () => {
  beforeEach(() => { mock.client = new QueryClient({ defaultOptions: { mutations: { retry: 3 } } }) })
  afterEach(() => { mock.client?.clear(); vi.resetAllMocks() })
  it.each([null, [], { ...saved, itemId: 'other' }, { ...saved, version: 0.5 }, { ...saved, version: -1 },
    { ...saved, attributes: { constructor: 'bad' } }, { ...saved, attributes: { color: 1 } }, { ...saved, attributes: { color: ' red' } }, { ...saved, attributes: { color: '\ud800' } }].map((value) => [value] as [unknown]))(
    'rejects invalid or foreign attribute reads %j', async (value) => {
      mock.get.mockResolvedValue({ success: true, data: value }); itemHook()
      await expect(mock.queryFn!()).rejects.toThrow(value === null ? 'Unknown error' : 'Invalid setup attributes')
    },
  )
  it('preserves loaded attributes after a bad reply and recovers a save without retrying automatically', async () => {
    mock.client!.setQueryData(['item-setup-attributes', 'item'], item)
    for (const key of [['work-order-readiness'], ['work-order-plan'], ['equipment-load', 'project'], ['equipment-setup-preview', 'press', 'A', 'B']]) mock.client!.setQueryData(key, {})
    mock.put.mockResolvedValueOnce({ success: true, data: { ...saved, version: '1' } }).mockResolvedValue({ success: true, data: saved })
    const command = { attributes: saved.attributes, expectedVersion: 0 }
    await expect(itemHook().save.mutateAsync(command)).rejects.toThrow('Invalid setup attributes')
    expect(mock.put).toHaveBeenCalledTimes(1)
    expect(mock.client!.getQueryData(['item-setup-attributes', 'item'])).toEqual(item)
    expect(await itemHook().save.mutateAsync(command)).toEqual(saved)
    expect(mock.put.mock.calls[1][1]).toEqual(command)
    for (const key of [['work-order-readiness'], ['work-order-plan'], ['equipment-load', 'project'], ['equipment-setup-preview', 'press', 'A', 'B']])
      expect(mock.client!.getQueryState(key)?.isInvalidated).toBe(true)
  })
  it.each([null, [rule, rule], [{ ...rule, changeoverId: 'not-a-uuid' }], [{ ...rule, equipmentId: 'other' }],
    [{ ...rule, fromAttributes: {} }], [{ ...rule, priority: 0 }], [{ ...rule, minutes: 10081 }], [{ ...rule, note: 3 }], [{ ...rule, note: '\u0000' }], [{ ...rule, note: '\ud800' }]].map((value) => [value] as [unknown]))(
    'rejects malformed rule lists %j', async (value) => {
      mock.get.mockResolvedValue({ success: true, data: value }); rulesHook()
      await expect(mock.queryFn!()).rejects.toThrow(value === null ? 'Unknown error' : 'Invalid setup changeover')
    },
  )
  it('keeps the same UUID command after a foreign reply, then merges only its confirmed rule', async () => {
    const previous = { ...rule, changeoverId: 'eadbf014-3cb6-462c-bd58-e6e540941729', priority: 1 }
    mock.client!.setQueryData(['equipment-setup-changeovers', 'press'], [previous])
    mock.put.mockResolvedValueOnce({ success: true, data: previous }).mockResolvedValue({ success: true, data: rule })
    const command = { changeoverId: id, fromAttributes: rule.fromAttributes, toAttributes: {}, priority: 10, minutes: 30, note: null, expectedVersion: 0 }
    await expect(rulesHook().save.mutateAsync(command)).rejects.toThrow('identity')
    expect(mock.client!.getQueryData(['equipment-setup-changeovers', 'press'])).toEqual([previous])
    await rulesHook().save.mutateAsync(command)
    expect(mock.put.mock.calls[1]).toEqual(mock.put.mock.calls[0])
    expect(mock.client!.getQueryData(['equipment-setup-changeovers', 'press'])).toEqual([previous, rule])
  })
  it('cancels stale reads before saving and replaces the list after versioned deletion', async () => {
    let finish: ((value: unknown) => void) | undefined
    mock.get.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    mock.put.mockResolvedValue({ success: true, data: rule })
    mock.remove.mockResolvedValue({ success: true, data: [] })
    const hook = rulesHook()
    const reading = mock.client!.fetchQuery({ queryKey: ['equipment-setup-changeovers', 'press'], queryFn: mock.queryFn! }).catch(() => undefined)
    await hook.save.mutateAsync({ ...rule, expectedVersion: 0 })
    finish!({ success: true, data: [] }); await reading
    expect(mock.client!.getQueryData(['equipment-setup-changeovers', 'press'])).toEqual([rule])
    await hook.remove.mutateAsync(rule)
    expect(mock.remove).toHaveBeenCalledWith(`/equipments/press/setup-changeovers/${id}?expectedVersion=1`)
    expect(mock.client!.getQueryData(['equipment-setup-changeovers', 'press'])).toEqual([])
  })
})
