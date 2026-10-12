import { useLotReleaseHistoryQuery, type LotReleaseHistoryDto } from '../../../entities/inventory/api/useLots'

type LotEvent = LotReleaseHistoryDto['events'][number]

function describe(event: LotEvent): string {
  if (event.action === 'released') return 'Released after its receipt checks'
  if (event.action === 'held') return 'Held for its receipt checks on reopening'
  if (event.action === 'closed') return 'Closed'
  return event.status ? `Reopened as ${event.status.replace('_', ' ')}` : 'Reopened'
}

/**
 * When the LOT was released after its receipt checks and held again on reopening (docs/domain/lot-release.md R8), and
 * when it was closed and reopened (R9).
 */
export function LotReleaseHistory({ lotId }: { lotId: string }) {
  const query = useLotReleaseHistoryQuery(lotId)
  const events = Array.isArray(query.data?.events) ? query.data.events : []
  if (events.length === 0) return null
  return <section aria-label="Release history" style={{ fontSize: 12, margin: '0 0 12px' }}>
    <strong>Release history</strong>
    <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
      {events.map((event, index) => <li key={`${event.at}-${index}`}>
        {describe(event)}{' · '}{event.by} · {new Date(event.at).toLocaleString()}
        {(event.action === 'released' || event.action === 'held')
          && ` · ${event.stockRows} stock record${event.stockRows === 1 ? '' : 's'}`}
      </li>)}
    </ul>
  </section>
}
