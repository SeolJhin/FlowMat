import type { WorkflowRevisionDto } from '../../../shared/types/api'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** "2026-10-03 07:05", local time. */
function stamp(iso: string): string {
  const time = new Date(iso)
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}`
}

/** e.g. "published by demo-owner 2026-10-03 07:05", and for a retired one also "· retired by kim 2026-10-04 09:00". */
export function revisionLine(revision: WorkflowRevisionDto): string {
  const published = `published by ${revision.publishedBy} ${stamp(revision.publishedAt)}`
  if (revision.status !== 'retired') return published
  const by = revision.retiredBy ? ` by ${revision.retiredBy}` : ''
  return `${published} · retired${by}${revision.retiredAt ? ` ${stamp(revision.retiredAt)}` : ''}`
}

/** "2 published, 1 retired". */
export function revisionCounts(revisions: WorkflowRevisionDto[]): string {
  const published = revisions.filter((revision) => revision.status === 'published').length
  return `${published} published, ${revisions.length - published} retired`
}
