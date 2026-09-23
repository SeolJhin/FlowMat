const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  running: { fg: '#1d4ed8', bg: '#dbeafe' },
  pending: { fg: '#92400e', bg: '#fef3c7' },
  finished: { fg: '#047857', bg: '#d1fae5' },
  failed: { fg: '#b91c1c', bg: '#fee2e2' },
}

export function RunStatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status.toLowerCase()] ?? { fg: 'inherit', bg: 'var(--border)' }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color: colors.fg,
        background: colors.bg,
      }}
    >
      {status}
    </span>
  )
}

export { formatQty } from '../../../shared/lib/formatQty'

export function isRunOpen(status: string): boolean {
  const normalized = status.toLowerCase()
  return normalized === 'running' || normalized === 'pending'
}
