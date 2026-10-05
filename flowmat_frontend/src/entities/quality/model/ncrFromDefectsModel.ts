import type { DefectDto } from '../../../shared/types/api'
import type { NcrDefectLinkDto, NonconformityDto } from '../api/useNonconformities'

/** The nonconformity holding each defect, by defect id. */
export function ncrByDefect(links: NcrDefectLinkDto[]): Map<string, NcrDefectLinkDto> {
  return new Map(links.map((link) => [link.defectLogId, link]))
}

/** "NCR-0003", or "NCR-0003 · closed". */
export function ncrBadge(link: NcrDefectLinkDto): string {
  return link.status === 'open' ? link.ncrNo : `${link.ncrNo} · ${link.status}`
}

/** Open defects that no nonconformity holds yet; a defect can be on one only (docs/domain/nonconformity.md N1). */
export function canGather(defect: DefectDto, links: Map<string, NcrDefectLinkDto>): boolean {
  return !defect.resolved && !links.has(defect.defectLogId)
}

/** An open NCR to add defects to, e.g. "NCR-0003 · Cracked housings" (long titles are cut). */
export function ncrOptionLabel(ncr: Pick<NonconformityDto, 'ncrNo' | 'title'>): string {
  const title = ncr.title.length > 60 ? `${ncr.title.slice(0, 59)}…` : ncr.title
  return `${ncr.ncrNo} · ${title}`
}

/** A starting title from the chosen defects, in list order: "Crack on HOUSING", "Crack and 2 more on HOUSING". */
export function ncrTitle(defects: DefectDto[]): string {
  if (defects.length === 0) return ''
  const [first] = defects
  const more = defects.length > 1 ? ` and ${defects.length - 1} more` : ''
  const item = first.itemCode ? ` on ${first.itemCode}` : ''
  return `${first.defectType}${more}${item}`.slice(0, 200)
}
