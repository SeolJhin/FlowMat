import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEquipmentSetupPreview } from './useEquipmentSetupPreview'
const mock = vi.hoisted(() => ({ get: vi.fn(), options: undefined as { enabled: boolean; queryKey: string[]; queryFn: () => Promise<unknown> } | undefined }))
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: typeof mock.options) => { mock.options = options; return {} } }))
vi.mock('../../../shared/api/httpClient', () => ({ httpClient: { get: mock.get } }))
const result = { equipmentId: 'press', fromItemId: 'A', toItemId: 'B', minutes: 30, ruleType: 'ATTRIBUTE_RULE', changeoverId: 'rule' }
const hook = (from = 'A', to = 'B') => Reflect.apply(useEquipmentSetupPreview, undefined, ['press', from, to])
describe('saved setup preview', () => {
  beforeEach(() => vi.resetAllMocks())
  it('waits for two selected items and separates each selection in its query key', () => {
    hook('', 'B'); expect(mock.options!.enabled).toBe(false)
    hook('A', ''); expect(mock.options!.enabled).toBe(false)
    hook(); expect(mock.options!.enabled).toBe(true)
    expect(mock.options!.queryKey).toEqual(['equipment-setup-preview', 'press', 'A', 'B'])
  })
  it.each([null, { ...result, equipmentId: 'other' }, { ...result, fromItemId: 'X' }, { ...result, toItemId: 'Y' },
    { ...result, ruleType: 'unknown' }, { ...result, minutes: -1 }, { ...result, minutes: 1.5 }, { ...result, minutes: 0 },
    { ...result, minutes: 10081 }, { ...result, changeoverId: null }, { ...result, ruleType: 'NONE', minutes: 0 },
  ].map((value) => [value] as [unknown]))('rejects a foreign, stale or malformed answer %j', async (value) => {
    mock.get.mockResolvedValue({ success: true, data: value }); hook()
    await expect(mock.options!.queryFn()).rejects.toThrow(value === null ? 'Unknown error' : 'Invalid setup preview')
  })
  it('accepts no switch and known saved rules without turning a missing rule into an unknown result', async () => {
    mock.get.mockResolvedValueOnce({ success: true, data: { ...result, minutes: 0, ruleType: 'NONE', changeoverId: null } })
      .mockResolvedValue({ success: true, data: result })
    hook(); expect(await mock.options!.queryFn()).toMatchObject({ minutes: 0, ruleType: 'NONE' })
    expect(await mock.options!.queryFn()).toEqual(result)
    expect(mock.get).toHaveBeenCalledWith('/equipments/press/setup-preview?fromItemId=A&toItemId=B')
  })
})
