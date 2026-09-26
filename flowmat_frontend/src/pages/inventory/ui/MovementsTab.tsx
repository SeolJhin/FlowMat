import { useState } from 'react'
import type { ItemDto } from '../../../shared/types/api'
import { LedgerPanel } from './LedgerPanel'
import { StockSnapshotPanel } from './StockSnapshotPanel'
import { StockMovementSummaryPanel } from './StockMovementSummaryPanel'

const VIEWS = [
  { value: 'ledger', label: 'Ledger' },
  { value: 'summary', label: 'Summary by item' },
  { value: 'snapshot', label: 'Stock on a date' },
] as const

/** The stock ledger, each item's in and out over a period, and stock as it stood on a past date, all from the ledger. */
export function MovementsTab({ projectId, items }: { projectId: string; items: ItemDto[] }) {
  const [view, setView] = useState<(typeof VIEWS)[number]['value']>('ledger')
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div role="radiogroup" aria-label="Movements view" style={{ display: 'flex', gap: 6 }}>
        {VIEWS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={view === option.value}
            onClick={() => setView(option.value)}
            style={{ fontSize: 12, fontWeight: view === option.value ? 600 : 400, opacity: view === option.value ? 1 : 0.65 }}
          >
            {option.label}
          </button>
        ))}
      </div>
      {view === 'ledger' && <LedgerPanel projectId={projectId} items={items} />}
      {view === 'summary' && <StockMovementSummaryPanel projectId={projectId} />}
      {view === 'snapshot' && <StockSnapshotPanel projectId={projectId} />}
    </div>
  )
}
