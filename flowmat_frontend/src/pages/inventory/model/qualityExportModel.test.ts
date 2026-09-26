import { describe, expect, it } from 'vitest'
import type { DefectDto, QualityInspectionDto } from '../../../shared/types/api'
import { defectsCsv, inspectionsCsv } from './qualityExportModel'

const inspection = (inspectedAt: string, fields: Partial<QualityInspectionDto> = {}) =>
  ({
    inspectionId: inspectedAt, projectId: 'p', productionRunId: null, runNumber: 'R-1', itemId: 'f', itemCode: 'FLR', itemName: 'Flour',
    lotId: null, lotNo: 'L1', lotStatus: null, inspectionType: 'Moisture', resultStatus: 'fail', measuredValue: 14.2, standardMin: 10,
    standardMax: 12, unit: '%', note: 'too wet, re-dry', inspectedBy: 'qa', inspectedAt, ...fields,
  }) as QualityInspectionDto

describe('inspectionsCsv', () => {
  it('keeps the period and quotes cells that need it', () => {
    const csv = inspectionsCsv([inspection('2026-09-25T10:00:00Z'), inspection('2026-08-01T10:00:00Z')], '2026-09-01T00:00:00Z')
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('\ufeffinspected_at,inspection_type,result,measured,min,max,unit,item_code,lot,run,inspected_by,note')
    expect(lines[1]).toBe('2026-09-25T10:00:00Z,Moisture,fail,14.2,10,12,%,FLR,L1,R-1,qa,"too wet, re-dry"')
    expect(lines).toHaveLength(3)
  })

  it('compares times as instants whatever their offset, and takes everything without a start', () => {
    // 08:30 in Seoul on the 1st is 23:30 UTC on 31 August, before a start of midnight UTC on the 1st.
    expect(inspectionsCsv([inspection('2026-09-01T08:30:00+09:00')], '2026-09-01T00:00:00Z').split('\r\n')).toHaveLength(2)
    expect(inspectionsCsv([inspection('2026-09-01T09:30:00+09:00')], '2026-09-01T00:00:00Z').split('\r\n')).toHaveLength(3)
    expect(inspectionsCsv([inspection('2020-01-01T00:00:00Z')], null).split('\r\n')).toHaveLength(3)
  })
})

describe('defectsCsv', () => {
  it('says whether each defect is open or resolved', () => {
    const defect = {
      defectLogId: 'd', projectId: 'p', inspectionId: null, productionRunId: null, runNumber: null, itemId: 'f', itemCode: 'FLR',
      itemName: 'Flour', lotId: null, lotNo: null, defectType: 'Crack', quantity: 2, unit: 'kg', severity: 'major', reason: null,
      resolved: true, actionTaken: 'Scrapped', loggedBy: 'qa', loggedAt: '2026-09-25T10:00:00Z', resolvedBy: 'lead',
      resolvedAt: '2026-09-25T11:00:00Z',
    } as DefectDto
    expect(defectsCsv([defect], null).split('\r\n')[1]).toBe(
      '2026-09-25T10:00:00Z,Crack,major,2,kg,FLR,,,resolved,Scrapped,qa,lead,2026-09-25T11:00:00Z',
    )
  })
})
