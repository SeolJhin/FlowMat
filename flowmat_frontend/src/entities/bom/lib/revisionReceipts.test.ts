import { describe, expect, it, vi } from 'vitest'
import { createRevisionReceipts } from './revisionReceipts'
function storage() {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
describe('pending revision receipt across page reloads', () => {
  it('recovers the same pending request in a fresh page instance and removes only a confirmed receipt', () => {
    const disk = storage(), first = createRevisionReceipts(() => disk)
    const id = first.requestId('project', 'source')
    expect(disk.values.size).toBe(1)
    const reloaded = createRevisionReceipts(() => disk)
    expect(reloaded.requestId('project', 'source')).toBe(id)
    reloaded.confirmed('project', 'source', id)
    expect(disk.values.size).toBe(0)
    expect(createRevisionReceipts(() => disk).requestId('project', 'source')).not.toBe(id)
  })
  it('does not erase a newer unconfirmed request when an older success or rejection arrives late', () => {
    const disk = storage(), receipts = createRevisionReceipts(() => disk)
    const first = receipts.requestId('project', 'source')
    receipts.confirmed('project', 'source', first)
    const second = receipts.requestId('project', 'source')
    receipts.confirmed('project', 'source', first)
    expect(createRevisionReceipts(() => disk).requestId('project', 'source')).toBe(second)
  })
  it('separates tab storage, project, source and delimiter-bearing IDs without collisions', () => {
    const disk = storage(), receipts = createRevisionReceipts(() => disk)
    const ids = [receipts.requestId('a|b', 'c'), receipts.requestId('a', 'b|c'), receipts.requestId('a', 'c')]
    expect(new Set(ids).size).toBe(3)
    expect(createRevisionReceipts(() => storage()).requestId('a|b', 'c')).not.toBe(ids[0])
    expect([...disk.values.values()]).toEqual(ids)
  })
  it('ignores malformed stored receipts instead of sending attacker-controlled text to the API', () => {
    const disk = storage(); disk.values.set('flowmat:bom-revision:v1:["project","source"]', 'not a UUID')
    expect(createRevisionReceipts(() => disk).requestId('project', 'source')).toMatch(/^[0-9a-f-]{36}$/)
  })
  it.each(['get', 'set', 'provider'] as const)('keeps same-page recovery when browser storage denies %s', (failure) => {
    const disk = storage()
    if (failure === 'get') disk.getItem = () => { throw new Error('denied') }
    if (failure === 'set') disk.setItem = () => { throw new Error('quota') }
    const provider = () => { if (failure === 'provider') throw new Error('denied'); return disk }
    const receipts = createRevisionReceipts(provider), id = receipts.requestId('project', 'source')
    expect(receipts.requestId('project', 'source')).toBe(id)
    receipts.confirmed('project', 'source', id)
    expect(receipts.requestId('project', 'source')).not.toBe(id)
  })
  it('does not reuse a confirmed ID in the page when removal fails', () => {
    const disk = storage(), receipts = createRevisionReceipts(() => disk)
    const first = receipts.requestId('project', 'source')
    disk.removeItem = vi.fn(() => { throw new Error('denied') })
    receipts.confirmed('project', 'source', first)
    const second = receipts.requestId('project', 'source')
    expect(second).not.toBe(first)
    expect(createRevisionReceipts(() => disk).requestId('project', 'source')).toBe(second)
  })
  it('uses an in-page fallback when no browser storage exists', () => {
    const receipts = createRevisionReceipts(() => null), id = receipts.requestId('project', 'source')
    expect(receipts.requestId('project', 'source')).toBe(id)
    receipts.confirmed('project', 'source', id)
    expect(receipts.requestId('project', 'source')).not.toBe(id)
  })
})
