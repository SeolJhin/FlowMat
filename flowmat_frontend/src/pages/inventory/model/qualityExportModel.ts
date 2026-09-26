import type { DefectDto, QualityInspectionDto } from '../../../shared/types/api'
import { csvCell } from './ledgerModel'

function csv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return '\ufeff' + [header.join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\r\n') + '\r\n'
}

/**
 * Records made at or after {@code from}, or all of them without a start. Compared as instants, since the server's
 * times carry their own offset.
 */
function since<T>(records: T[], at: (record: T) => string, from: string | null): T[] {
  if (!from) return records
  const start = new Date(from).getTime()
  return records.filter((record) => new Date(at(record)).getTime() >= start)
}

/** Inspections in the period as CSV, newest first as listed. Times are the server's ISO-8601. */
export function inspectionsCsv(inspections: QualityInspectionDto[], from: string | null): string {
  return csv(
    ['inspected_at', 'inspection_type', 'result', 'measured', 'min', 'max', 'unit', 'item_code', 'lot', 'run', 'inspected_by', 'note'],
    since(inspections, (inspection) => inspection.inspectedAt, from).map((inspection) => [
      inspection.inspectedAt,
      inspection.inspectionType,
      inspection.resultStatus,
      inspection.measuredValue,
      inspection.standardMin,
      inspection.standardMax,
      inspection.unit,
      inspection.itemCode,
      inspection.lotNo,
      inspection.runNumber,
      inspection.inspectedBy,
      inspection.note,
    ]),
  )
}

/** Defects logged in the period as CSV, open or resolved. */
export function defectsCsv(defects: DefectDto[], from: string | null): string {
  return csv(
    ['logged_at', 'defect_type', 'severity', 'quantity', 'unit', 'item_code', 'lot', 'run', 'status', 'action_taken', 'logged_by', 'resolved_by',
      'resolved_at'],
    since(defects, (defect) => defect.loggedAt, from).map((defect) => [
      defect.loggedAt,
      defect.defectType,
      defect.severity,
      defect.quantity,
      defect.unit,
      defect.itemCode,
      defect.lotNo,
      defect.runNumber,
      defect.resolved ? 'resolved' : 'open',
      defect.actionTaken,
      defect.loggedBy,
      defect.resolvedBy,
      defect.resolvedAt,
    ]),
  )
}
