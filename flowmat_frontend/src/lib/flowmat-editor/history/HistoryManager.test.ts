import { describe, expect, it } from 'vitest'
import { createHistoryState, pushHistory, redoHistory, undoHistory } from './HistoryManager'

describe('HistoryManager', () => {
  it('pushes present states and clears redo states', () => {
    const initial = createHistoryState('a')
    const next = pushHistory(initial, 'b')

    expect(next).toEqual({ past: ['a'], present: 'b', future: [] })
  })

  it('undoes and redoes document states', () => {
    const state = pushHistory(pushHistory(createHistoryState('a'), 'b'), 'c')
    const undone = undoHistory(state)
    const redone = redoHistory(undone)

    expect(undone).toEqual({ past: ['a'], present: 'b', future: ['c'] })
    expect(redone).toEqual({ past: ['a', 'b'], present: 'c', future: [] })
  })

  it('keeps the existing state when undo or redo is unavailable', () => {
    const state = createHistoryState('a')

    expect(undoHistory(state)).toBe(state)
    expect(redoHistory(state)).toBe(state)
  })
})
