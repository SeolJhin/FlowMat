import { describe, expect, it } from 'vitest'
import type { InventoryDto, LotDto } from '../../../shared/types/api'
import { earlierToIssue, fefoRecords } from './fefoModel'

const today = new Date(2026, 8, 26)
const lot = (lotNo: string, expiryDate: string | null, fields: Partial<LotDto> = {}) =>
  ({ lotId: lotNo, itemId: 'flour', lotNo, lotStatus: 'available', expiryDate, receivedAt: null, quantityOnHand: 5, quantityReserved: 0, ...fields }) as LotDto
const record = (id: string, lotId: string | null, fields: Partial<InventoryDto> = {}) =>
  ({ inventoryId: id, itemId: 'flour', lotId, lotNo: lotId, availableQuantity: 5, inventoryStatus: 'available', location: 'WH', ...fields }) as InventoryDto

const lots = [
  lot('LATE', '2026-12-01'),
  lot('SOON', '2026-10-01'),
  lot('UNDATED', null),
  lot('GONE', '2026-09-20'),
  lot('HELD', '2026-09-28', { lotStatus: 'quarantined' }),
  lot('SOON-B', '2026-10-01', { receivedAt: '2026-09-01T00:00:00Z' }),
]
const records = [
  record('r-late', 'LATE'),
  record('r-soon', 'SOON'),
  record('r-undated', 'UNDATED'),
  record('r-gone', 'GONE'),
  record('r-held', 'HELD'),
  record('r-soon-b', 'SOON-B'),
  record('r-empty', 'SOON', { availableQuantity: 0 }),
  record('r-other', 'SOON', { itemId: 'salt' }),
  record('r-none', null),
]

describe('fefoRecords', () => {
  it('orders usable LOT stock by expiry, then receipt, then LOT, undated last', () => {
    expect(fefoRecords(records, lots, 'flour', today).map((r) => r.inventory.inventoryId)).toEqual(['r-soon-b', 'r-soon', 'r-late', 'r-undated'])
  })
})

describe('earlierToIssue', () => {
  it('names a record whose LOT expires earlier', () => {
    expect(earlierToIssue(records[0], records, lots, today)?.inventory.inventoryId).toBe('r-soon-b')
    expect(earlierToIssue(records[2], records, lots, today)?.lot.lotNo).toBe('SOON-B')
  })

  it('stays quiet for the first to expire, the same date, an expired LOT or no LOT', () => {
    expect(earlierToIssue(records[5], records, lots, today)).toBeNull()
    // SOON expires the same day as SOON-B: not earlier.
    expect(earlierToIssue(records[1], records, lots, today)).toBeNull()
    expect(earlierToIssue(records[3], records, lots, today)).toBeNull()
    expect(earlierToIssue(records[8], records, lots, today)).toBeNull()
  })
})
