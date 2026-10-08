type ReceiptStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const PREFIX = 'flowmat:bom-revision:v1:'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Only pending opaque request IDs are stored. No tokens, notes, BOM contents or automatic commands. */
export function createRevisionReceipts(storage: () => ReceiptStorage | null) {
  const pending = new Map<string, string | null>()
  const key = (projectId: string, bomId: string) => PREFIX + JSON.stringify([projectId, bomId])
  function remembered(key: string): string | undefined {
    if (pending.has(key)) return pending.get(key) ?? undefined
    try {
      const stored = storage()?.getItem(key)
      if (stored && uuid.test(stored)) { pending.set(key, stored); return stored }
    } catch { /* Storage can be denied. Preserve retries in the current page. */ }
    return undefined
  }
  return {
    requestId(projectId: string, bomId: string): string {
      const name = key(projectId, bomId)
      const existing = remembered(name)
      if (existing) return existing
      const id = crypto.randomUUID()
      pending.set(name, id)
      try { storage()?.setItem(name, id) } catch { /* In-page fallback if storage is unavailable. */ }
      return id
    },
    confirmed(projectId: string, bomId: string, requestId: string) {
      const name = key(projectId, bomId)
      // A late reply to an older request cannot erase a newer in-flight command's receipt.
      if (remembered(name) !== requestId) return
      pending.set(name, null)
      try {
        const available = storage()
        if (available) { available.removeItem(name); pending.delete(name) }
      } catch { /* The tombstone prevents a failed removal resurrecting a confirmed ID in this page. */ }
    },
  }
}
