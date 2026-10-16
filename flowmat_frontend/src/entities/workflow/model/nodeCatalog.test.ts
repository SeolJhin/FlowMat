import { describe, expect, it } from 'vitest'
import { getDefaultConnectionType, getWorkflowNodeDefinition, getWorkflowPaletteDefinitions } from './nodeCatalog'

describe('node catalog', () => {
  it('offers the Exclusive gateway (ADR-006)', () => {
    expect(getWorkflowPaletteDefinitions().map((definition) => definition.tool)).toContain('exclusive')
    const gateway = getWorkflowNodeDefinition('exclusive')
    expect(gateway.label).toBe('Exclusive')
    expect(gateway.isTerminal).toBe(false)
    expect(getDefaultConnectionType('exclusive')).toBe('control_flow')
  })
})
