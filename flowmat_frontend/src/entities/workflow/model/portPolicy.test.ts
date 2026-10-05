import { describe, expect, it } from 'vitest'
import { createDefaultPortFormState, hasValidPortSelection, toCreateProcessIoInput, toPortFormState, toUpdateProcessIoInput } from './portPolicy'
import { toPortViewModel } from './toWorkflowCanvasViewModel'
import type { ProcessIoDto } from '../../../shared/types/api'

describe('port contract form', () => {
  it('can edit a stored port with nullable display fields', () => {
    const port: ProcessIoDto = {
      processIoId: 'port-1', processId: 'process-1', itemId: 'item-1',
      ioName: null, direction: 'input', ioType: null, role: null, resourceType: 'material',
      schemaJson: null, validationRule: null, quantity: 1, unit: 'kg', formula: null,
      colorScheme: null, requiredYn: 'Y', allowShortageYn: 'N',
    }

    const view = toPortViewModel(port)
    expect(view).toMatchObject({ name: '', ioType: 'material', colorScheme: 'sky' })
    const state = toPortFormState(view)
    expect(state).toMatchObject({ ioName: '', ioType: 'material', colorScheme: 'sky' })
    expect(hasValidPortSelection(state)).toBe(true)
    expect(toUpdateProcessIoInput(state)).toMatchObject({
      processIoId: 'port-1', ioName: '', ioType: 'material', colorScheme: 'sky',
    })
  })

  it('lets a port have no item: create leaves itemId out and update clears the binding', () => {
    const state = { ...createDefaultPortFormState('output'), ioName: 'Parsed rows', resourceType: 'data', unit: 'ea' }
    expect(hasValidPortSelection(state)).toBe(true)
    expect(toCreateProcessIoInput('process-1', state).itemId).toBeUndefined()
    const update = toUpdateProcessIoInput({ ...state, processIoId: 'port-1' })
    expect(update).toMatchObject({ processIoId: 'port-1', clearItem: true })
    expect(update).not.toHaveProperty('itemId')
    const bound = toUpdateProcessIoInput({ ...state, processIoId: 'port-1', itemId: 'item-1' })
    expect(bound).toMatchObject({ itemId: 'item-1' })
    expect(bound).not.toHaveProperty('clearItem')
  })

  it('sends a structured schema and resource metadata', () => {
    const state = {
      ...createDefaultPortFormState(),
      itemId: 'item-1',
      unit: 'kg',
      role: 'feed',
      resourceType: 'material',
      schemaJson: '{"type":"object","properties":{"lot":{"type":"string"}},"required":["lot"]}',
      validationRule: 'quantity > 0',
    }

    expect(hasValidPortSelection(state)).toBe(true)
    expect(toCreateProcessIoInput('process-1', state)).toMatchObject({
      role: 'feed',
      resourceType: 'material',
      schemaJson: { type: 'object', properties: { lot: { type: 'string' } }, required: ['lot'] },
      validationRule: 'quantity > 0',
    })
  })

  it('refuses malformed or non-object schemas before submit', () => {
    const base = { ...createDefaultPortFormState(), itemId: 'item-1', unit: 'kg' }
    expect(hasValidPortSelection({ ...base, schemaJson: '{invalid' })).toBe(false)
    expect(hasValidPortSelection({ ...base, schemaJson: '[1,2]' })).toBe(false)
    expect(hasValidPortSelection({ ...base, schemaJson: '{"type":"string"}' })).toBe(false)
    expect(hasValidPortSelection({ ...base, schemaJson: '{"type":"object","required":["lot"]}' })).toBe(false)
    expect(hasValidPortSelection({ ...base, schemaJson: '{"type":"object","properties":{"lot":{"type":"array"}}}' })).toBe(false)
    expect(hasValidPortSelection({ ...base, schemaJson: JSON.stringify({ type: 'object', note: 'x'.repeat(65536) }) })).toBe(false)
    expect(hasValidPortSelection({ ...base, schemaJson: '{"type":"object","custom":true}' })).toBe(true)
  })

  it('refuses negative and non-finite quantities', () => {
    const base = { ...createDefaultPortFormState(), itemId: 'item-1', unit: 'kg' }
    expect(hasValidPortSelection({ ...base, quantity: '-1' })).toBe(false)
    expect(hasValidPortSelection({ ...base, quantity: 'Infinity' })).toBe(false)
    expect(hasValidPortSelection({ ...base, quantity: '0.00001' })).toBe(false)
    expect(hasValidPortSelection({ ...base, quantity: '10000000000' })).toBe(false)
    expect(hasValidPortSelection({ ...base, quantity: '9999999999.9999' })).toBe(true)
    expect(hasValidPortSelection({ ...base, quantity: '1.5' })).toBe(true)
  })

  it('refuses port text that exceeds database field limits', () => {
    const base = { ...createDefaultPortFormState(), itemId: 'item-1', unit: 'kg' }
    expect(hasValidPortSelection({ ...base, ioName: 'x'.repeat(101) })).toBe(false)
    expect(hasValidPortSelection({ ...base, role: 'x'.repeat(51) })).toBe(false)
    expect(hasValidPortSelection({ ...base, resourceType: 'x'.repeat(51) })).toBe(false)
    expect(hasValidPortSelection({ ...base, unit: 'x'.repeat(21) })).toBe(false)
    expect(hasValidPortSelection({ ...base, validationRule: 'x'.repeat(2001) })).toBe(false)
  })

  it('explicitly clears a removed schema on update', () => {
    const state = { ...createDefaultPortFormState(), processIoId: 'port-1', itemId: 'item-1', unit: 'kg' }
    expect(toUpdateProcessIoInput(state)).toMatchObject({
      clearSchema: true,
      role: '',
      formula: '',
      validationRule: '',
    })
    expect(toUpdateProcessIoInput({ ...state, schemaJson: '{"type":"object"}' }))
      .toMatchObject({ clearSchema: false, schemaJson: { type: 'object' } })
  })
})
