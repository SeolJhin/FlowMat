import { describe, expect, it, vi } from 'vitest'
import { createStockCommand } from './stockCommand'

const input = { inventoryId: 'stock', quantity: 4, transactionType: 'receipt', note: 'delivery' }

describe('stock command acknowledgement and retry', () => {
  it('keeps the key when stock was changed but its response was lost', async () => {
    const saved = new Map<string, number>()
    let stock = 10
    const send = vi.fn(async (body: typeof input & { requestId: string }) => {
      if (!saved.has(body.requestId)) saved.set(body.requestId, stock += body.quantity)
      if (send.mock.calls.length === 1) throw new Error('Connection lost after commit')
      return saved.get(body.requestId)
    })
    const command = createStockCommand(send)
    await expect(command(input)).rejects.toThrow('Connection lost')
    expect(await command(input)).toBe(14)
    expect(stock).toBe(14)
    expect(send.mock.calls[0][0].requestId).toBe(send.mock.calls[1][0].requestId)
  })

  it('allocates a new key for a deliberate identical command after acknowledgement', async () => {
    const send = vi.fn(async (body: typeof input & { requestId: string }) => body.requestId)
    const command = createStockCommand(send)
    expect(await command(input)).not.toBe(await command(input))
  })

  it('does not reuse an unresolved key when the command contents change', async () => {
    const send = vi.fn(async (_body: typeof input & { requestId: string }) => { throw new Error('offline') })
    const command = createStockCommand(send)
    await expect(command(input)).rejects.toThrow('offline')
    await expect(command({ ...input, quantity: 5 })).rejects.toThrow('offline')
    expect(send.mock.calls[0][0].requestId).not.toBe(send.mock.calls[1][0].requestId)
  })

  it('retains each unresolved command when switching away and back', async () => {
    const send = vi.fn(async (_body: typeof input & { requestId: string }) => { throw new Error('offline') })
    const command = createStockCommand(send)
    for (const body of [input, { ...input, inventoryId: 'other' }, input]) {
      await expect(command(body)).rejects.toThrow('offline')
    }
    expect(send.mock.calls[2][0].requestId).toBe(send.mock.calls[0][0].requestId)
    expect(send.mock.calls[1][0].requestId).not.toBe(send.mock.calls[0][0].requestId)
  })

  it('treats field order and omitted optional values as the same wire payload', async () => {
    type Input = { quantity: number; inventoryId: string; note?: string }
    const send = vi.fn(async (_body: Input & { requestId: string }) => { throw new Error('offline') })
    const command = createStockCommand<Input, never>(send)
    await expect(command({ inventoryId: 'stock', quantity: 4 })).rejects.toThrow('offline')
    await expect(command({ quantity: 4, inventoryId: 'stock', note: undefined })).rejects.toThrow('offline')
    expect(send.mock.calls[0][0].requestId).toBe(send.mock.calls[1][0].requestId)
  })

  it('gives concurrent identical submissions the same key', async () => {
    let release!: () => void
    const wait = new Promise<void>((resolve) => { release = resolve })
    const send = vi.fn(async (body: typeof input & { requestId: string }) => { await wait; return body.requestId })
    const command = createStockCommand(send)
    const first = command(input)
    const second = command(input)
    release()
    expect(await first).toBe(await second)
    expect(await command(input)).not.toBe(await first)
  })

  it('does not reuse a count key when a nested counted or expected quantity changes', async () => {
    type Input = { projectId: string; lines: { inventoryId: string; countedQuantity: number; expectedQuantity: number }[] }
    const send = vi.fn(async (_body: Input & { requestId: string }) => { throw new Error('offline') })
    const command = createStockCommand<Input, never>(send)
    for (const line of [
      { inventoryId: 'stock', countedQuantity: 8, expectedQuantity: 10 },
      { inventoryId: 'stock', countedQuantity: 9, expectedQuantity: 10 },
      { inventoryId: 'stock', countedQuantity: 8, expectedQuantity: 12 },
    ]) await expect(command({ projectId: 'project', lines: [line] })).rejects.toThrow('offline')
    expect(new Set(send.mock.calls.map(([body]) => body.requestId)).size).toBe(3)
  })

  it('matches nested wire contents regardless of object field order', async () => {
    type Input = { lines: { inventoryId: string; quantity: number; note?: string | null }[] }
    const send = vi.fn(async (_body: Input & { requestId: string }) => { throw new Error('offline') })
    const command = createStockCommand<Input, never>(send)
    await expect(command({ lines: [{ inventoryId: 'stock', quantity: 4, note: null }] })).rejects.toThrow('offline')
    await expect(command({ lines: [{ note: null, quantity: 4, inventoryId: 'stock' }] })).rejects.toThrow('offline')
    expect(send.mock.calls[0][0].requestId).toBe(send.mock.calls[1][0].requestId)
  })

  it('preserves the order of array contents when identifying a command', async () => {
    type Input = { lines: { inventoryId: string; quantity: number }[] }
    const send = vi.fn(async (_body: Input & { requestId: string }) => { throw new Error('offline') })
    const command = createStockCommand<Input, never>(send)
    const lines = [{ inventoryId: 'first', quantity: 4 }, { inventoryId: 'second', quantity: 5 }]
    await expect(command({ lines })).rejects.toThrow('offline')
    await expect(command({ lines: [...lines].reverse() })).rejects.toThrow('offline')
    expect(send.mock.calls[0][0].requestId).not.toBe(send.mock.calls[1][0].requestId)
  })
})