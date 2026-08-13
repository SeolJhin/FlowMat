import { describe, expect, it } from 'vitest'
import { filterStable } from './WorkspaceEditorLayer'

describe('filterStable', () => {
  it('returns the same array reference when nothing is filtered out', () => {
    const list = ['a', 'b', 'c']
    const result = filterStable(list, () => true)

    expect(result).toBe(list)
  })

  it('returns the same reference for a valid selection cleanup (all ids still exist)', () => {
    const selectedIds = ['el-1', 'el-2']
    const editableIds = new Set(['el-1', 'el-2', 'el-3'])

    const result = filterStable(selectedIds, (id) => editableIds.has(id))

    expect(result).toBe(selectedIds)
  })

  it('returns a new array only when an item is actually removed', () => {
    const list = ['a', 'b', 'c']
    const result = filterStable(list, (item) => item !== 'b')

    expect(result).not.toBe(list)
    expect(result).toEqual(['a', 'c'])
  })

  it('repeated calls against an unchanged predicate settle on the same reference (no update loop)', () => {
    // Simulates the WorkspaceEditorLayer bug: `editableIds` used to get a new Set
    // identity every render while the editor-document query was pending, but the
    // selection itself never actually changed. filterStable must converge to a
    // stable reference so the driving useEffect stops re-firing.
    const selectedIds: readonly string[] = []
    const first = filterStable(selectedIds, () => true)
    const second = filterStable(first, () => true)

    expect(first).toBe(selectedIds)
    expect(second).toBe(selectedIds)
  })
})
