import { describe, expect, it } from 'vitest'
import type { EquipmentDetailsDto, EquipmentDto } from '../../../shared/types/api'
import { EMPTY_DETAILS_FORM, detailsForm, detailsPayload, equipmentCsv, filterEquipment, makerModel, perHour } from './equipmentModel'

const details: EquipmentDetailsDto = {
  manufacturer: 'Acme', modelName: 'M-200', serialNo: null, capacityPerHour: 120.5, powerKwh: 0, waterLiter: null, location: 'Line 1',
}

describe('detailsForm', () => {
  it('shows recorded details as text and missing ones as empty', () => {
    expect(detailsForm(details)).toEqual({
      manufacturer: 'Acme', modelName: 'M-200', serialNo: '', capacityPerHour: '120.5', powerKwh: '0', waterLiter: '', location: 'Line 1',
    })
    expect(detailsForm(undefined)).toEqual(EMPTY_DETAILS_FORM)
  })
})

describe('detailsPayload', () => {
  it('trims text, reads numbers and clears empty fields', () => {
    expect(detailsPayload({ ...detailsForm(details), manufacturer: '  ', location: ' Line 2 ', waterLiter: ' 3 ' })).toEqual({
      details: { ...details, manufacturer: null, location: 'Line 2', waterLiter: 3 },
      error: null,
    })
  })

  it('names the first number field that is not a number of 0 or more', () => {
    expect(detailsPayload({ ...EMPTY_DETAILS_FORM, powerKwh: '-1' }).error).toBe('Power kWh must be a number of 0 or more.')
    expect(detailsPayload({ ...EMPTY_DETAILS_FORM, capacityPerHour: 'fast' }).error).toBe('Capacity / hour must be a number of 0 or more.')
  })
})

describe('perHour', () => {
  it('lists what is recorded, including zero', () => {
    expect(perHour(details)).toBe('120.5 out · 0 kWh')
    expect(perHour({ ...details, capacityPerHour: null, powerKwh: null, waterLiter: 30 })).toBe('30 L')
    expect(perHour({ ...details, capacityPerHour: null, powerKwh: null })).toBe('')
  })
})

describe('makerModel', () => {
  it('joins what is recorded', () => {
    expect(makerModel(details)).toBe('Acme M-200')
    expect(makerModel({ ...details, manufacturer: null })).toBe('M-200')
    expect(makerModel(undefined)).toBe('')
  })
})

const unit = (code: string, fields: Partial<EquipmentDto> = {}) =>
  ({ equipmentId: code, projectId: 'p', equipmentCode: code, equipmentName: `${code} name`, equipmentType: 'machine', equipmentStatus: 'active', details, ...fields }) as EquipmentDto

describe('filterEquipment', () => {
  const list = [unit('MX-1'), unit('OV-1', { equipmentStatus: 'maintenance', details: { ...details, location: 'Line 2', manufacturer: 'Bake Co' } })]

  it('matches code, name, type, maker, model, serial and location, and the status', () => {
    expect(filterEquipment(list, 'line 2', '').map((one) => one.equipmentCode)).toEqual(['OV-1'])
    expect(filterEquipment(list, 'm-200', '').map((one) => one.equipmentCode)).toEqual(['MX-1', 'OV-1'])
    expect(filterEquipment(list, '', 'maintenance').map((one) => one.equipmentCode)).toEqual(['OV-1'])
    expect(filterEquipment(list, 'acme', 'maintenance')).toEqual([])
  })
})

describe('equipmentCsv', () => {
  it('writes one line per unit with its details', () => {
    expect(equipmentCsv([unit('MX-1', { equipmentName: 'Mixer, big' })])).toBe(
      '\ufeffcode,name,type,status,manufacturer,model,serial_no,location,capacity_per_hour,power_kwh,water_liter\r\n'
        + 'MX-1,"Mixer, big",machine,active,Acme,M-200,,Line 1,120.5,0,\r\n',
    )
  })
})
