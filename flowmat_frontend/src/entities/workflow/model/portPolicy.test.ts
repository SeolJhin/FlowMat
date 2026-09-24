import { describe, expect, it } from 'vitest'
import { createDefaultPortFormState, hasValidPortSelection, toCreateProcessIoInput } from './portPolicy'

describe('port contract form', () => {
  it('sends a structured schema and resource metadata', () => {
    const state = {
      ...createDefaultPortFormState(),
      itemId: 'item-1',
      unit: 'kg',
      role: 'feed',
      resourceType: 'material',
      schemaJson: '{"type":"object","required":["lot"]}',
      validationRule: 'quantity > 0',
    }

    expect(hasValidPortSelection(state)).toBe(true)
    expect(toCreateProcessIoInput('process-1', state)).toMatchObject({
      role: 'feed',
      resourceType: 'material',
      schemaJson: { type: 'object', required: ['lot'] },
      validationRule: 'quantity > 0',
    })
  })

  it('refuses malformed or non-object schemas before submit', () => {
    const base = { ...createDefaultPortFormState(), itemId: 'item-1', unit: 'kg' }
    expect(hasValidPortSelection({ ...base, schemaJson: '{invalid' })).toBe(false)
    expect(hasValidPortSelection({ ...base, schemaJson: '[1,2]' })).toBe(false)
  })
})
